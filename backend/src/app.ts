import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { corsOrigins, resolveAppUrl, geminiEnabled, assertProductionConfig, passwordLoginEnabled } from "@/lib/config";
import {
  SESSION_COOKIE,
  createSessionToken,
  loginWithFirebaseIdToken,
  loginWithPassword,
  hydrateSession,
  readSessionToken,
  requirePermissionFromToken,
  sessionFromAuthHeader,
  type SessionUser,
} from "@/lib/auth/session";
import { AuthzError } from "@/lib/auth/permissions";
import { getStore } from "@/lib/data/store";
import { loadSecuritySettings, securityStatus, assertPasswordPolicy } from "@/lib/auth/security-settings";
import { hashPassword } from "@/lib/auth/password";
import { clientIp, publicErrorMessage, rateLimit } from "@/lib/security/guards";
import { firebaseAdminStatus } from "@/lib/firebase/admin";
import { newId, nowIso } from "@/lib/ids";
import { writeAudit } from "@/lib/services/audit-service";
import {
  approveDocument,
  assembleCurrentHtml,
  generateDocument,
  previewFromInput,
  voidDocument,
} from "@/lib/services/document-service";
import {
  applyCompanySignature,
  getActiveSigningLink,
  getSigningByToken,
  markOpened,
  acceptConsent,
  applyRecipientSignature,
  sendForSignature,
  sendSigningOtp,
  verifySigningOtp,
} from "@/lib/services/signing-service";
import { renderPdf } from "@/lib/services/pdf-service";
import {
  emailTransportStatus,
  loadEmailSettings,
  sendTemplatedEmail,
} from "@/lib/services/email-service";
import { recommendDocumentType } from "@/lib/rules/engine";
import { recommendFromClientHistory, recommendFromPersonHistory } from "@/lib/knowledge/library";
import { BRANDING_TYPE_META, resolveThemeId } from "@/lib/branding/themes";
import { AMPLIFY_DOCUMENT_THEMES } from "@/lib/branding/themes";
import { ruleDashboardInsights, type DashboardInsightSnapshot } from "@/lib/dashboard/insights";
import { toPublicUser } from "@/lib/users-public";
import {
  aiSettingsSchema,
  companyRecordSchema,
  createCompanySchema,
  createPersonSchema,
  emailSettingsSchema,
  generateDocumentInputSchema,
  personSchema,
  securitySettingsSchema,
  signingSettingsSchema,
} from "@/lib/validation/schemas";
import { EMPLOYMENT_STATUSES, PERSON_TYPES, THEME_IDS, USER_ROLES } from "@/lib/types/enums";
import type {
  AiSettings,
  AiUsage,
  AuditEvent,
  CompanyRecord,
  CompanySettings,
  ContractDocument,
  DocumentPack,
  DocumentRelationship,
  DocumentTheme,
  DocumentVersion,
  KnowledgeFinding,
  OrgUser,
  Person,
  SigningRequest,
  SourceDocument,
  Template,
  TemplateVersion,
  Clause,
  ClauseVersion,
} from "@/lib/types";
import { z } from "zod";

type Env = {
  Variables: {
    token: string | null;
    session: SessionUser | null;
  };
};

function tokenFromRequest(c: { req: { header: (name: string) => string | undefined }; }): string | null {
  return (
    sessionFromAuthHeader(c.req.header("authorization")) ??
    getCookie(c as never, SESSION_COOKIE) ??
    null
  );
}

function publicSigningRequest(request: SigningRequest) {
  const { token: _t, otpHash: _o, ...safe } = request as SigningRequest & { token?: string };
  return safe;
}

async function authed(c: { get: (k: "token") => string | null }, permission: Parameters<typeof requirePermissionFromToken>[1]) {
  return requirePermissionFromToken(c.get("token"), permission);
}

export function createApp() {
  const app = new Hono<Env>();

  app.use("*", cors({
    origin: corsOrigins(),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Disposition"],
  }));

  app.use("*", async (c, next) => {
    const token = tokenFromRequest(c);
    c.set("token", token);
    const raw = token ? await readSessionToken(token) : null;
    c.set("session", raw ? await hydrateSession(raw) : null);
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof AuthzError) {
      const status = err.message.startsWith("Missing permission") ? 403 : 401;
      return c.json({ error: err.message }, status);
    }
    const message = publicErrorMessage(err);
    const status = message.toLowerCase().includes("not found")
      ? 404
      : message.includes("Too many")
        ? 429
        : 400;
    return c.json({ error: message }, status);
  });

  app.get("/health", (c) => {
    try {
      assertProductionConfig();
    } catch (err) {
      return c.json(
        { ok: false, service: "amplify-contractos-api", error: err instanceof Error ? err.message : "misconfigured" },
        503,
      );
    }
    const firebase = firebaseAdminStatus();
    return c.json({
      ok: true,
      service: "amplify-contractos-api",
      firebaseAdmin: firebase.configured,
      firebaseProjectId: firebase.projectId,
    });
  });

  // ── Auth ──────────────────────────────────────────────────────────
  app.post("/auth/login", async (c) => {
    const ip = clientIp(c.req.header("x-forwarded-for"));
    const limited = rateLimit({ key: `login:${ip}`, limit: 20, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    if (!passwordLoginEnabled()) throw new Error("Password login is disabled");
    const body = await c.req.json<{ email?: string; password?: string }>();
    const session = await loginWithPassword(String(body.email ?? ""), String(body.password ?? ""));
    const security = await loadSecuritySettings();
    const token = await createSessionToken(session, { sessionDays: security.sessionDays });
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: security.sessionDays * 24 * 60 * 60,
    });
    return c.json({ token, user: session });
  });

  app.post("/auth/firebase", async (c) => {
    const ip = clientIp(c.req.header("x-forwarded-for"));
    const limited = rateLimit({ key: `firebase:${ip}`, limit: 40, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    const body = await c.req.json<{ idToken?: string }>();
    const session = await loginWithFirebaseIdToken(String(body.idToken ?? ""));
    const security = await loadSecuritySettings();
    const token = await createSessionToken(session, { sessionDays: security.sessionDays });
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: security.sessionDays * 24 * 60 * 60,
    });
    return c.json({ token, user: session });
  });

  app.post("/auth/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/auth/me", async (c) => {
    const session = c.get("session");
    if (!session) return c.json({ error: "Authentication required" }, 401);
    return c.json({ user: session });
  });

  // ── Collections ───────────────────────────────────────────────────
  app.get("/people", async (c) => {
    const actor = await authed(c, "people.read");
    const store = await getStore(actor.orgId);
    const people = await store.listDocs<Person>("people");
    return c.json({ people });
  });

  app.get("/people/:id", async (c) => {
    const actor = await authed(c, "people.read");
    const store = await getStore(actor.orgId);
    const person = await store.getDoc<Person>("people", c.req.param("id"));
    if (!person) return c.json({ error: "Not found" }, 404);
    const documents = await store.queryDocs<ContractDocument>("documents", (item) => item.personId === person.id);
    const sources = await store.queryDocs<SourceDocument>(
      "sourceDocuments",
      (item) =>
        item.personId === person.id ||
        String((item.analysisJson as { personId?: string } | undefined)?.personId ?? "") === person.id,
    );
    return c.json({ person, documents, sources });
  });

  app.post("/people", async (c) => {
    const actor = await authed(c, "people.write");
    const store = await getStore(actor.orgId);
    const parsed = createPersonSchema.parse(await c.req.json());
    const now = nowIso();
    const person: Person = {
      ...parsed,
      id: newId("person"),
      fullLegalName: parsed.fullLegalName || `${parsed.firstName} ${parsed.lastName}`.trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.userId,
    };
    await store.setDoc("people", person);
    await writeAudit(store, {
      type: "PERSON_CREATED",
      actor,
      entityType: "person",
      entityId: person.id,
      summary: `Created person ${person.fullLegalName}.`,
    });
    return c.json({ person });
  });

  app.patch("/people/:id", async (c) => {
    const actor = await authed(c, "people.write");
    const store = await getStore(actor.orgId);
    const existing = await store.getDoc<Person>("people", c.req.param("id"));
    if (!existing) return c.json({ error: "Not found" }, 404);
    const patch = z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        type: z.enum(PERSON_TYPES).optional(),
        currentJobTitle: z.string().optional(),
        department: z.string().optional(),
        reportingManager: z.string().optional(),
        employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
        employmentStartDate: z.string().optional(),
        currentSalary: z.number().optional(),
        salaryCurrency: z.string().optional(),
        employeeId: z.string().optional(),
        city: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(await c.req.json());
    const person: Person = {
      ...existing,
      ...patch,
      fullLegalName: `${patch.firstName ?? existing.firstName} ${patch.lastName ?? existing.lastName}`.trim(),
      updatedAt: nowIso(),
    };
    await store.setDoc("people", person);
    await writeAudit(store, {
      type: "PERSON_UPDATED",
      actor,
      entityType: "person",
      entityId: person.id,
      summary: `Updated ${person.fullLegalName}.${
        patch.employmentStatus && patch.employmentStatus !== existing.employmentStatus
          ? ` Status ${existing.employmentStatus} → ${patch.employmentStatus}.`
          : ""
      }`,
    });
    return c.json({ person });
  });

  app.get("/companies", async (c) => {
    const actor = await authed(c, "companies.read");
    const store = await getStore(actor.orgId);
    return c.json({ companies: await store.listDocs<CompanyRecord>("companies") });
  });

  app.get("/companies/:id", async (c) => {
    const actor = await authed(c, "companies.read");
    const store = await getStore(actor.orgId);
    const company = await store.getDoc<CompanyRecord>("companies", c.req.param("id"));
    if (!company) return c.json({ error: "Not found" }, 404);
    const documents = await store.queryDocs<ContractDocument>("documents", (item) => item.companyId === company.id);
    const sources = await store.queryDocs<SourceDocument>(
      "sourceDocuments",
      (item) =>
        item.companyId === company.id ||
        String((item.analysisJson as { companyId?: string } | undefined)?.companyId ?? "") === company.id,
    );
    return c.json({ company, documents, sources });
  });

  app.post("/companies", async (c) => {
    const actor = await authed(c, "companies.write");
    const store = await getStore(actor.orgId);
    const parsed = createCompanySchema.parse(await c.req.json());
    const now = nowIso();
    const company: CompanyRecord = {
      ...parsed,
      id: newId("company"),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.userId,
    };
    await store.setDoc("companies", company);
    await writeAudit(store, {
      type: "COMPANY_CREATED",
      actor,
      entityType: "company",
      entityId: company.id,
      summary: `Created company ${company.displayName}.`,
    });
    return c.json({ company });
  });

  app.get("/documents", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    return c.json({ documents: await store.listDocs<ContractDocument>("documents") });
  });

  app.get("/documents/:id", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    const id = c.req.param("id");
    const document = await store.getDoc<ContractDocument>("documents", id);
    if (!document) return c.json({ error: "Not found" }, 404);
    const [version, relationships, audits, signing, ai, html] = await Promise.all([
      store.getDoc<DocumentVersion>("documentVersions", document.currentVersionId),
      store.queryDocs<DocumentRelationship>(
        "documentRelationships",
        (item) => item.fromDocumentId === id || item.toDocumentId === id,
      ),
      store.queryDocs<AuditEvent>("auditEvents", (item) => item.entityId === id),
      store.queryDocs<SigningRequest>("signingRequests", (item) => item.documentId === id),
      store.getSettings<AiSettings>("ai"),
      assembleCurrentHtml(store, id),
    ]);
    const relatedIds = relationships.flatMap((item) => [item.fromDocumentId, item.toDocumentId]);
    const relatedDocs = await store.queryDocs<ContractDocument>("documents", (item) => relatedIds.includes(item.id));
    return c.json({
      document,
      version,
      relationships,
      audits,
      signing: signing.map(publicSigningRequest),
      relatedDocs,
      html,
      ai,
      aiThemeEnabled: Boolean(geminiEnabled() && ai?.enabled && (ai.recommendThemes ?? true)),
      canEditTheme: true,
    });
  });

  app.get("/documents/:id/pdf", async (c) => {
    const actor = await authed(c, "documents.pdf");
    const store = await getStore(actor.orgId);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const html = await assembleCurrentHtml(store, document.id);
    const pdf = await renderPdf(html);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${document.readableId}.pdf"`,
      },
    });
  });

  app.get("/documents/:id/sync", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const signing = await store.queryDocs<SigningRequest>("signingRequests", (item) => item.documentId === document.id);
    const active = signing
      .filter((item) => item.status !== "revoked")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return c.json({
      status: document.status,
      signingStatus: active?.status ?? null,
      recipientSignedAt: active?.recipientSignedAt ?? null,
      lastActivityAt: document.lastActivityAt ?? document.updatedAt,
    });
  });

  app.patch("/documents/:id/theme", async (c) => {
    const actor = await authed(c, "documents.edit");
    const store = await getStore(actor.orgId);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    if (document.status === "VOIDED") throw new Error("Voided documents cannot change design");
    const { themeId } = z.object({ themeId: z.enum(THEME_IDS) }).parse(await c.req.json());
    const themes = await store.listDocs<DocumentTheme>("themes");
    if (!themes.some((theme) => theme.id === themeId)) throw new Error("Unknown document design");
    const now = nowIso();
    const next = { ...document, themeId, updatedAt: now, lastActivityAt: now };
    await store.setDoc("documents", next);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor,
      entityType: "document",
      entityId: document.id,
      summary: `${document.readableId} PDF design set to ${themeId.replaceAll("_", " ")}.`,
      metadata: { themeId },
    });
    return c.json({ document: next });
  });

  app.post("/documents/:id/theme/recommend", async (c) => {
    const actor = await authed(c, "documents.edit");
    const store = await getStore(actor.orgId);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const fallback = () => {
      let themeId = "amplify_modern_dark" as (typeof THEME_IDS)[number];
      let reason = "Signal Dark fits most digital Amplify sends.";
      if (document.family === "EMPLOYMENT") {
        themeId = "amplify_classic_white";
        reason = "Employment packets fit the single Paper White letterhead.";
      } else if (document.documentType.includes("lead") || document.documentType.includes("service")) {
        themeId = "amplify_harbor_night";
        reason = "Client service packs fit Harbor Night.";
      } else if (document.action === "amend_agreement" || document.action === "promote") {
        themeId = "amplify_ember_brief";
        reason = "Short amendments fit Ember Brief on Letter.";
      }
      return { themeId, reason, source: "rules" as const };
    };
    try {
      const { requireAiCapability } = await import("@/lib/services/ai-service");
      const ai = await requireAiCapability(store, "recommendThemes");
      const catalog = BRANDING_TYPE_META.map((meta) => {
        const theme = AMPLIFY_DOCUMENT_THEMES.find((item) => item.id === meta.id)!;
        return {
          id: meta.id,
          name: theme.name,
          background: theme.background,
          pageSize: theme.pageSize,
          useFor: meta.useFor,
        };
      });
      const rec = await ai.recommendTheme({
        family: document.family,
        documentType: document.documentType,
        partyType: document.partyType,
        partyName: document.partyName,
        action: document.action,
        currentThemeId: document.themeId,
        themes: catalog,
      });
      const themeId = (THEME_IDS as readonly string[]).includes(rec.themeId)
        ? (rec.themeId as (typeof THEME_IDS)[number])
        : fallback().themeId;
      return c.json({
        themeId,
        reason: rec.reason,
        source: "ai" as const,
        label: BRANDING_TYPE_META.find((item) => item.id === themeId)?.label ?? themeId,
      });
    } catch {
      const rules = fallback();
      return c.json({
        ...rules,
        label: BRANDING_TYPE_META.find((item) => item.id === rules.themeId)?.label ?? rules.themeId,
      });
    }
  });

  app.post("/documents/:id/approve", async (c) => {
    const actor = await authed(c, "documents.approve");
    const store = await getStore(actor.orgId);
    await approveDocument(store, actor, c.req.param("id"));
    return c.json({ ok: true });
  });

  app.post("/documents/:id/void", async (c) => {
    const actor = await authed(c, "documents.void");
    const store = await getStore(actor.orgId);
    const { reason } = z.object({ reason: z.string().min(1) }).parse(await c.req.json());
    await voidDocument(store, actor, c.req.param("id"), reason);
    return c.json({ ok: true });
  });

  app.post("/documents/:id/send", async (c) => {
    const actor = await authed(c, "documents.send");
    const store = await getStore(actor.orgId);
    const raw = await c.req.json().catch(() => ({}));
    const body = z
      .object({ name: z.string().min(1).optional(), email: z.string().email().optional() })
      .parse(raw);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    let name = body.name;
    let email = body.email;
    if (!name || !email) {
      if (document.personId) {
        const person = await store.getDoc<Person>("people", document.personId);
        name = name || person?.fullLegalName || document.partyName;
        email = email || person?.email;
      } else if (document.companyId) {
        const company = await store.getDoc<CompanyRecord>("companies", document.companyId);
        name = name || company?.legalName || document.partyName;
        email = email || company?.email;
      } else {
        name = name || document.partyName;
      }
    }
    if (!name || !email) throw new Error("Recipient name and email are required");
    const host = c.req.header("x-frontend-host") ?? c.req.header("x-forwarded-host") ?? c.req.header("host");
    const proto = c.req.header("x-forwarded-proto");
    const result = await sendForSignature(store, actor, c.req.param("id"), { name, email }, {
      appUrl: resolveAppUrl(host, proto),
    });
    return c.json(result);
  });

  app.get("/documents/:id/signing-link", async (c) => {
    const actor = await authed(c, "documents.send");
    const store = await getStore(actor.orgId);
    const host = c.req.header("x-frontend-host") ?? c.req.header("x-forwarded-host") ?? c.req.header("host");
    const proto = c.req.header("x-forwarded-proto");
    const link = await getActiveSigningLink(store, c.req.param("id"), {
      appUrl: resolveAppUrl(host, proto),
    });
    return c.json({ link });
  });

  app.post("/documents/:id/countersign", async (c) => {
    const actor = await authed(c, "documents.countersign");
    const store = await getStore(actor.orgId);
    const body = z
      .object({ imageDataUrl: z.string().min(1), method: z.enum(["draw", "type"]) })
      .parse(await c.req.json());
    await applyCompanySignature(store, actor, c.req.param("id"), body);
    return c.json({ ok: true });
  });

  // ── Generate ──────────────────────────────────────────────────────
  app.get("/generate/catalog", async (c) => {
    const actor = await authed(c, "documents.create");
    const store = await getStore(actor.orgId);
    const [
      templates,
      templateVersions,
      clauses,
      clauseVersions,
      people,
      companies,
      themes,
      roleProfiles,
      company,
      sources,
      documents,
    ] = await Promise.all([
      store.listDocs<Template>("templates"),
      store.listDocs<TemplateVersion>("templateVersions"),
      store.listDocs<Clause>("clauses"),
      store.listDocs<ClauseVersion>("clauseVersions"),
      store.listDocs<Person>("people"),
      store.listDocs<CompanyRecord>("companies"),
      store.listDocs<DocumentTheme>("themes"),
      store.listDocs("roleProfiles"),
      store.getSettings<CompanySettings>("company"),
      store.listDocs<SourceDocument>("sourceDocuments"),
      store.listDocs<ContractDocument>("documents"),
    ]);
    return c.json({
      templates,
      templateVersions,
      clauses,
      clauseVersions,
      people,
      companies,
      themes,
      roleProfiles,
      company,
      sources,
      documents,
    });
  });

  app.post("/generate/preview", async (c) => {
    const actor = await authed(c, "documents.create");
    const store = await getStore(actor.orgId);
    const input = generateDocumentInputSchema.parse(await c.req.json());
    const preview = await previewFromInput(store, input);
    return c.json(preview);
  });

  app.post("/generate", async (c) => {
    const actor = await authed(c, "documents.create");
    const store = await getStore(actor.orgId);
    const input = generateDocumentInputSchema.parse(await c.req.json());
    const document = await generateDocument(store, actor, input);
    return c.json({ document });
  });

  app.post("/generate/recommend", async (c) => {
    const actor = await authed(c, "documents.create");
    const store = await getStore(actor.orgId);
    const input = await c.req.json<{
      partyType: "employee" | "client";
      action: string;
      personId?: string;
      companyId?: string;
      jobTitle?: string;
    }>();
    const sources = await store.listDocs<SourceDocument>("sourceDocuments");
    const history =
      input.partyType === "client" && input.companyId
        ? recommendFromClientHistory(sources, input.companyId)
        : input.personId
          ? recommendFromPersonHistory(sources, input.personId)
          : null;
    const docs = await store.listDocs<ContractDocument>("documents");
    const hasExisting = Boolean(
      input.personId && docs.some((d) => d.personId === input.personId && d.family === "EMPLOYMENT"),
    );
    const deterministic = recommendDocumentType({
      partyType: input.partyType,
      action: input.action as never,
      hasExistingEmploymentAgreement: hasExisting,
      jobTitle: input.jobTitle,
      preferredTemplateId: history?.templateId,
    });
    const aiSettings = await store.getSettings<AiSettings>("ai");
    if (aiSettings.enabled && aiSettings.recommendTemplates) {
      try {
        const { requireAiCapability } = await import("@/lib/services/ai-service");
        const ai = await requireAiCapability(store, "recommendTemplates");
        const rec = await ai.recommendTemplate({
          partyType: input.partyType,
          action: input.action,
          hasExistingEmploymentAgreement: hasExisting,
          jobTitle: input.jobTitle,
        });
        return c.json({ ...deterministic, ai: rec, history });
      } catch {
        /* fall through */
      }
    }
    return c.json({ ...deterministic, history });
  });

  // ── Public signing ────────────────────────────────────────────────
  app.get("/sign/:token", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) return c.json(null);
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    const ua = c.req.header("user-agent") ?? undefined;
    await markOpened(store, found.request, ip, ua);
    const signing = await store.getSettings<{ allowDraftDownload?: boolean }>("signing");
    const canViewBody = !found.request.requireOtp || Boolean(found.request.otpVerifiedAt);
    return c.json({
      documentName: found.document.name,
      readableId: found.document.readableId,
      recipientName: found.request.recipientName,
      html: canViewBody ? found.version.snapshot.renderedHtml : "",
      allowDraftDownload: (signing.allowDraftDownload ?? false) && canViewBody,
      status: found.document.status,
      requireOtp: found.request.requireOtp,
      otpVerified: Boolean(found.request.otpVerifiedAt),
      consentAcceptedAt: found.request.consentAcceptedAt,
      recipientSignedAt: found.request.recipientSignedAt,
      finalized: found.document.status === "FINALIZED",
      sha256: found.document.sha256,
      signedAt: found.document.signedAt,
      partyName: found.document.partyName,
    });
  });

  app.post("/sign/:token/consent", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) throw new Error("Invalid or expired signing link");
    if (found.request.requireOtp && !found.request.otpVerifiedAt) {
      throw new Error("Email verification code is required before signing");
    }
    await acceptConsent(
      store,
      found.request,
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
      c.req.header("user-agent") ?? undefined,
    );
    return c.json({ ok: true });
  });

  app.post("/sign/:token/otp/send", async (c) => {
    const ip = clientIp(c.req.header("x-forwarded-for"));
    const limited = rateLimit({ key: `otp-send:${ip}`, limit: 10, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    await sendSigningOtp(await getStore(), c.req.param("token"));
    return c.json({ ok: true });
  });

  app.post("/sign/:token/otp/verify", async (c) => {
    const ip = clientIp(c.req.header("x-forwarded-for"));
    const limited = rateLimit({ key: `otp-verify:${ip}`, limit: 30, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    const body = z.object({ code: z.string().min(4).max(12) }).parse(await c.req.json());
    await verifySigningOtp(await getStore(), c.req.param("token"), body.code);
    return c.json({ ok: true });
  });

  app.post("/sign/:token/sign", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) throw new Error("Invalid or expired signing link");
    if (!found.request.consentAcceptedAt) throw new Error("Consent is required before signing");
    if (found.request.requireOtp && !found.request.otpVerifiedAt) {
      throw new Error("Email verification code is required before signing");
    }
    const body = z
      .object({ imageDataUrl: z.string().min(1), method: z.enum(["draw", "type"]) })
      .parse(await c.req.json());
    await applyRecipientSignature(store, found.request, {
      method: body.method,
      imageDataUrl: body.imageDataUrl,
      ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
      ua: c.req.header("user-agent") ?? undefined,
    });
    return c.json({ ok: true as const, documentId: found.document.id });
  });

  // ── Library / misc lists ──────────────────────────────────────────
  app.get("/templates", async (c) => {
    const actor = await authed(c, "templates.read");
    const store = await getStore(actor.orgId);
    return c.json({ templates: await store.listDocs<Template>("templates") });
  });
  app.get("/templates/:id", async (c) => {
    const actor = await authed(c, "templates.read");
    const store = await getStore(actor.orgId);
    const template = await store.getDoc<Template>("templates", c.req.param("id"));
    if (!template) return c.json({ error: "Not found" }, 404);
    const versions = await store.queryDocs<TemplateVersion>("templateVersions", (item) => item.templateId === template.id);
    return c.json({ template, versions });
  });
  app.get("/clauses", async (c) => {
    const actor = await authed(c, "clauses.read");
    const store = await getStore(actor.orgId);
    const [clauses, templates, templateVersions] = await Promise.all([
      store.listDocs<Clause>("clauses"),
      store.listDocs<Template>("templates"),
      store.listDocs<TemplateVersion>("templateVersions"),
    ]);
    return c.json({ clauses, templates, templateVersions });
  });
  app.get("/clauses/:id", async (c) => {
    const actor = await authed(c, "clauses.read");
    const store = await getStore(actor.orgId);
    const clause = await store.getDoc<Clause>("clauses", c.req.param("id"));
    if (!clause) return c.json({ error: "Not found" }, 404);
    const versions = await store.queryDocs<ClauseVersion>("clauseVersions", (item) => item.clauseId === clause.id);
    const templates = await store.listDocs<Template>("templates");
    const templateVersions = await store.listDocs<TemplateVersion>("templateVersions");
    return c.json({ clause, versions, templates, templateVersions });
  });
  app.get("/packs", async (c) => {
    const actor = await authed(c, "packs.read");
    const store = await getStore(actor.orgId);
    return c.json({
      packs: await store.listDocs<DocumentPack>("documentPacks"),
      templates: await store.listDocs<Template>("templates"),
    });
  });
  app.get("/knowledge", async (c) => {
    const actor = await authed(c, "knowledge.read");
    const store = await getStore(actor.orgId);
    return c.json({
      sources: await store.listDocs<SourceDocument>("sourceDocuments"),
      findings: await store.listDocs<KnowledgeFinding>("knowledgeFindings"),
      people: await store.listDocs<Person>("people"),
      companies: await store.listDocs<CompanyRecord>("companies"),
    });
  });
  app.get("/knowledge/:id/pdf", async (c) => {
    const actor = await authed(c, "knowledge.read");
    const store = await getStore(actor.orgId);
    const source = await store.getDoc<SourceDocument>("sourceDocuments", c.req.param("id"));
    if (!source) return c.json({ error: "Not found" }, 404);
    const file = await store.getFile(source.storagePath);
    if (!file) return c.json({ error: "File missing" }, 404);
    return new Response(Buffer.from(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${source.fileName}"`,
      },
    });
  });
  app.get("/signatures", async (c) => {
    const actor = await authed(c, "signing.manage");
    const store = await getStore(actor.orgId);
    return c.json({
      requests: (await store.listDocs<SigningRequest>("signingRequests")).map(publicSigningRequest),
      documents: await store.listDocs<ContractDocument>("documents"),
    });
  });
  app.get("/approvals", async (c) => {
    const actor = await authed(c, "documents.approve");
    const store = await getStore(actor.orgId);
    const documents = await store.queryDocs<ContractDocument>(
      "documents",
      (item) => item.status === "REVIEW_REQUIRED",
    );
    return c.json({ documents });
  });
  app.get("/audit", async (c) => {
    const actor = await authed(c, "audit.read");
    const store = await getStore(actor.orgId);
    return c.json({ events: await store.listDocs<AuditEvent>("auditEvents") });
  });

  app.get("/dashboard", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    const [documents, requests, people, companies, sources, findings, ai] = await Promise.all([
      store.listDocs<ContractDocument>("documents"),
      store.listDocs<SigningRequest>("signingRequests"),
      store.listDocs<Person>("people"),
      store.listDocs<CompanyRecord>("companies"),
      store.listDocs<SourceDocument>("sourceDocuments"),
      store.listDocs<KnowledgeFinding>("knowledgeFindings"),
      store.getSettings<AiSettings>("ai"),
    ]);
    return c.json({
      documents,
      requests: requests.map(publicSigningRequest),
      people,
      companies,
      sources,
      findings,
      ai,
      aiInsightsEnabled: Boolean(geminiEnabled() && ai?.enabled && (ai.dashboardInsights ?? true)),
    });
  });

  app.post("/dashboard/insights", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    const snapshot = (await c.req.json()) as DashboardInsightSnapshot;
    const rules = ruleDashboardInsights(snapshot);
    try {
      const { requireAiCapability } = await import("@/lib/services/ai-service");
      const ai = await requireAiCapability(store, "dashboardInsights");
      const rec = await ai.dashboardInsights({ snapshot });
      if (!rec.insights.length) return c.json(rules);
      return c.json({
        source: "ai" as const,
        headline: rec.headline,
        insights: rec.insights.map((item, index) => ({
          id: `ai-${index}`,
          title: item.title,
          detail: item.detail,
          tone: item.tone,
          href: item.href,
        })),
      });
    } catch {
      return c.json(rules);
    }
  });

  app.get("/compare", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    return c.json({ documents: await store.listDocs<ContractDocument>("documents") });
  });

  app.get("/compare/versions", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    const leftId = c.req.query("left");
    const rightId = c.req.query("right");
    if (!leftId || !rightId) return c.json({ error: "left and right required" }, 400);
    const [leftDoc, rightDoc] = await Promise.all([
      store.getDoc<ContractDocument>("documents", leftId),
      store.getDoc<ContractDocument>("documents", rightId),
    ]);
    if (!leftDoc || !rightDoc) return c.json({ error: "Document not found" }, 404);
    const [leftVersion, rightVersion] = await Promise.all([
      store.getDoc<DocumentVersion>("documentVersions", leftDoc.currentVersionId),
      store.getDoc<DocumentVersion>("documentVersions", rightDoc.currentVersionId),
    ]);
    return c.json({ leftDoc, rightDoc, leftVersion, rightVersion });
  });

  // ── Settings / users ──────────────────────────────────────────────
  app.get("/settings", async (c) => {
    const actor = await authed(c, "settings.read");
    const store = await getStore(actor.orgId);
    const [company, ai, aiUsage, signing, themes, users] = await Promise.all([
      store.getSettings<CompanySettings>("company"),
      store.getSettings<AiSettings>("ai"),
      store.getSettings<AiUsage>("aiUsage"),
      store.getSettings("signing"),
      store.listDocs<DocumentTheme>("themes"),
      store.listDocs<OrgUser>("users"),
    ]);
    const email = await loadEmailSettings(store);
    const security = await loadSecuritySettings(store);
    return c.json({
      company,
      ai,
      aiUsage,
      signing,
      themes,
      email,
      security,
      emailTransport: emailTransportStatus(),
      securityStatus: securityStatus(),
      aiConfigured: geminiEnabled(),
      users: users.map(toPublicUser),
      canManageUsers: true,
      actor,
    });
  });

  app.put("/settings/company", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const parsed = await c.req.json();
    await store.setSettings("company", parsed);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor,
      entityType: "settings",
      entityId: "company",
      summary: "Company settings updated.",
    });
    return c.json({ ok: true });
  });
  app.put("/settings/ai", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const parsed = aiSettingsSchema.parse({ ...(await c.req.json()), draftNewClauses: false });
    await store.setSettings("ai", parsed);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor,
      entityType: "settings",
      entityId: "ai",
      summary: "AI settings updated.",
    });
    return c.json(parsed);
  });
  app.put("/settings/signing", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const parsed = signingSettingsSchema.parse(await c.req.json());
    await store.setSettings("signing", parsed);
    return c.json(parsed);
  });
  app.put("/settings/email", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const parsed = emailSettingsSchema.parse(await c.req.json());
    await store.setSettings("email", parsed);
    return c.json(parsed);
  });
  app.put("/settings/security", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const parsed = securitySettingsSchema.parse(await c.req.json());
    await store.setSettings("security", parsed);
    return c.json(parsed);
  });
  app.post("/settings/email/test", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const { to } = z.object({ to: z.string().email() }).parse(await c.req.json());
    await sendTemplatedEmail({
      to,
      template: "test_message",
      data: { actor: actor.displayName },
      store,
    });
    const transport = emailTransportStatus();
    return c.json({ ok: true, delivered: transport.configured, provider: transport.provider });
  });

  app.get("/users", async (c) => {
    const actor = await authed(c, "users.manage");
    const store = await getStore(actor.orgId);
    const users = await store.listDocs<OrgUser>("users");
    return c.json({ users: users.map(toPublicUser) });
  });

  app.post("/users", async (c) => {
    const actor = await authed(c, "users.manage");
    const store = await getStore(actor.orgId);
    const body = z
      .object({
        email: z.string().email(),
        displayName: z.string().min(1),
        role: z.enum(USER_ROLES),
        password: z.string().min(8),
        active: z.boolean().optional(),
      })
      .parse(await c.req.json());
    if (body.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new Error("Only a SUPER_ADMIN can grant SUPER_ADMIN");
    }
    const security = await loadSecuritySettings(store);
    assertPasswordPolicy(body.password, security);
    const users = await store.listDocs<OrgUser>("users");
    if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      throw new Error("A user with that email already exists");
    }
    const user: OrgUser = {
      id: newId("user"),
      email: body.email.toLowerCase(),
      displayName: body.displayName,
      role: body.role,
      active: body.active ?? true,
      passwordHash: hashPassword(body.password),
      createdAt: nowIso(),
    };
    await store.setDoc("users", user);
    return c.json({ user: toPublicUser(user) });
  });

  app.patch("/users/:id", async (c) => {
    const actor = await authed(c, "users.manage");
    const store = await getStore(actor.orgId);
    const existing = await store.getDoc<OrgUser>("users", c.req.param("id"));
    if (!existing) return c.json({ error: "Not found" }, 404);
    const body = z
      .object({
        email: z.string().email().optional(),
        displayName: z.string().min(1).optional(),
        role: z.enum(USER_ROLES).optional(),
        password: z.string().min(8).optional(),
        active: z.boolean().optional(),
      })
      .parse(await c.req.json());
    if (body.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new Error("Only a SUPER_ADMIN can grant SUPER_ADMIN");
    }
    const users = await store.listDocs<OrgUser>("users");
    const superAdmins = users.filter((u) => u.role === "SUPER_ADMIN" && u.active);
    const demotingSelf =
      existing.role === "SUPER_ADMIN" &&
      existing.active &&
      ((body.role && body.role !== "SUPER_ADMIN") || body.active === false);
    if (demotingSelf && superAdmins.length <= 1) {
      throw new Error("Cannot remove or demote the last SUPER_ADMIN");
    }
    if (body.password) {
      assertPasswordPolicy(body.password, await loadSecuritySettings(store));
    }
    const next: OrgUser = {
      ...existing,
      email: body.email?.toLowerCase() ?? existing.email,
      displayName: body.displayName ?? existing.displayName,
      role: body.role ?? existing.role,
      active: body.active ?? existing.active,
      passwordHash: body.password ? hashPassword(body.password) : existing.passwordHash,
    };
    await store.setDoc("users", next);
    return c.json({ user: toPublicUser(next) });
  });

  // silence unused resolve import
  void resolveThemeId;

  return app;
}
