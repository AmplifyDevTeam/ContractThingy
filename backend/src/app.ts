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
  sessionFromAuthHeader,
  type SessionUser,
} from "@/lib/auth/session";
import { AuthzError, assertPermission, redactPerson, redactSource, type Permission } from "@/lib/auth/permissions";
import { getStore } from "@/lib/data/store";
import { loadSecuritySettings, securityStatus, assertPasswordPolicy } from "@/lib/auth/security-settings";
import { hashPassword } from "@/lib/auth/password";
import { publicErrorMessage, rateLimit, requestClient } from "@/lib/security/guards";
import { firebaseAdminStatus } from "@/lib/firebase/admin";
import { newId, nowIso } from "@/lib/ids";
import { writeAudit } from "@/lib/services/audit-service";
import {
  approveDocument,
  assembleCurrentHtml,
  generateDocument,
  previewFromInput,
  updateDocumentContent,
  voidDocument,
} from "@/lib/services/document-service";
import {
  createClause,
  createKnowledgeFinding,
  createPack,
  createTemplate,
  updateClause,
  updateKnowledgeFinding,
  updatePack,
  updateTemplate,
} from "@/lib/services/library-service";
import {
  applyCompanySignature,
  getActiveSigningLink,
  getSigningByToken,
  markOpened,
  acceptConsent,
  applyRecipientSignature,
  expireStaleRequests,
  extendSigningLink,
  revokeSigningLink,
  sendForSignature,
  sendSigningOtp,
  verifySigningOtp,
} from "@/lib/services/signing-service";
import { PdfUnavailableError, printableHtml, renderPdf } from "@/lib/services/pdf-service";
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
  companySettingsSchema,
  createCompanySchema,
  createPersonSchema,
  emailSettingsSchema,
  generateDocumentInputSchema,
  personSchema,
  securitySettingsSchema,
  signingSettingsSchema,
  workspaceSettingsSchema,
} from "@/lib/validation/schemas";
import {
  loadWorkspaceSettings,
  resolveOrgIdFromHost,
  uploadBrandingAsset,
  type BrandingUploadKind,
} from "@/lib/services/branding-service";
import { isStoredBrandingPath, resolveBrandingAssets } from "@/lib/branding/identity";
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
    hydratedSession: SessionUser | null;
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
  const { token: _t, otpHash: _o, tokenEnc: _e, ...safe } = request as SigningRequest & { token?: string };
  return safe;
}

function slimDocument(doc: ContractDocument) {
  return {
    id: doc.id,
    name: doc.name,
    readableId: doc.readableId,
    partyName: doc.partyName,
    status: doc.status,
    family: doc.family,
    createdAt: doc.createdAt,
    lastActivityAt: doc.lastActivityAt,
    personId: doc.personId,
    companyId: doc.companyId,
    templateId: doc.templateId,
    currentVersionId: doc.currentVersionId,
    documentType: doc.documentType,
    themeId: doc.themeId,
  };
}

const EDITABLE_DESIGN_STATUSES = ["DRAFT", "CONFIGURING", "REVIEW_REQUIRED", "APPROVED", "READY_TO_SEND"];

function frontendOrigin(c: { req: { header: (name: string) => string | undefined } }) {
  const host = c.req.header("x-frontend-host") ?? c.req.header("x-forwarded-host") ?? c.req.header("host");
  const proto = c.req.header("x-forwarded-proto");
  return resolveAppUrl(host, proto);
}

function setSessionCookie(c: Parameters<typeof setCookie>[0], token: string, days: number) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

async function authed(
  c: {
    get: (k: "token" | "session" | "hydratedSession") => string | null | SessionUser | null;
    set: (k: "hydratedSession", v: SessionUser | null) => void;
  },
  permission: Permission,
) {
  let hydrated = c.get("hydratedSession") as SessionUser | null;
  if (!hydrated) {
    const token = c.get("token") as string | null;
    if (!token) throw new AuthzError("Authentication required");
    const raw = (c.get("session") as SessionUser | null) ?? (await readSessionToken(token));
    if (!raw) throw new AuthzError("Authentication required");
    hydrated = await hydrateSession(raw);
    if (!hydrated) throw new AuthzError("Authentication required");
    c.set("hydratedSession", hydrated);
  }
  assertPermission(hydrated.role, permission);
  return hydrated;
}

async function serveBrandingPath(
  _c: unknown,
  store: Awaited<ReturnType<typeof getStore>>,
  path: string,
) {
  if (isStoredBrandingPath(path)) {
    const file = await store.getFile(path);
    if (!file) return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404 });
    return new Response(Buffer.from(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const rel = path.replace(/^\//, "");
  const { existsSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const candidates = [
    join(process.cwd(), "public", rel),
    join(process.cwd(), "../frontend/public", rel),
    join(process.cwd(), "../../frontend/public", rel),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const bytes = readFileSync(filePath);
    const mime = filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") ? "image/jpeg" : "image/png";
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
  return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404 });
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
    // Decode JWT only — hydrate once inside authed()/auth routes when needed.
    c.set("session", token ? await readSessionToken(token) : null);
    c.set("hydratedSession", null);
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
    const { ip } = requestClient((name) => c.req.header(name));
    const limited = rateLimit({ key: `login:${ip}`, limit: 20, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    if (!passwordLoginEnabled()) throw new Error("Password login is disabled");
    const body = await c.req.json<{ email?: string; password?: string }>();
    const session = await loginWithPassword(String(body.email ?? ""), String(body.password ?? ""));
    const security = await loadSecuritySettings();
    const token = await createSessionToken(session, { sessionDays: security.sessionDays });
    setSessionCookie(c, token, security.sessionDays);
    return c.json({ token, user: session, maxAge: security.sessionDays * 24 * 60 * 60 });
  });

  app.post("/auth/firebase", async (c) => {
    const { ip } = requestClient((name) => c.req.header(name));
    const limited = rateLimit({ key: `firebase:${ip}`, limit: 40, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    const body = await c.req.json<{ idToken?: string }>();
    const session = await loginWithFirebaseIdToken(String(body.idToken ?? ""));
    const security = await loadSecuritySettings();
    const token = await createSessionToken(session, { sessionDays: security.sessionDays });
    setSessionCookie(c, token, security.sessionDays);
    return c.json({ token, user: session, maxAge: security.sessionDays * 24 * 60 * 60 });
  });

  app.post("/auth/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/auth/me", async (c) => {
    const raw = c.get("session");
    if (!raw) return c.json({ error: "Authentication required" }, 401);
    const session = await hydrateSession(raw);
    if (!session) return c.json({ error: "Authentication required" }, 401);
    c.set("hydratedSession", session);
    // Remint when role/name drifted from the JWT (e.g. promotion) or when explicitly asked.
    const drifted = session.role !== raw.role || session.displayName !== raw.displayName || session.email !== raw.email;
    if (drifted || c.req.query("remint")) {
      const security = await loadSecuritySettings();
      const token = await createSessionToken(session, { sessionDays: security.sessionDays });
      setSessionCookie(c, token, security.sessionDays);
      return c.json({ user: session, token, maxAge: security.sessionDays * 24 * 60 * 60 });
    }
    return c.json({ user: session });
  });

  // ── Collections ───────────────────────────────────────────────────
  app.get("/people", async (c) => {
    const actor = await authed(c, "people.read");
    const store = await getStore(actor.orgId);
    const people = await store.listDocs<Person>("people");
    return c.json({ people: people.map((person) => redactPerson(person, actor.role)) });
  });

  app.get("/people/:id", async (c) => {
    const actor = await authed(c, "people.read");
    const store = await getStore(actor.orgId);
    const person = await store.getDoc<Person>("people", c.req.param("id"));
    if (!person) return c.json({ error: "Not found" }, 404);
    const [documents, sources] = await Promise.all([
      store.whereEquals<ContractDocument>("documents", "personId", person.id),
      store.queryDocs<SourceDocument>(
        "sourceDocuments",
        (item) =>
          item.personId === person.id ||
          String((item.analysisJson as { personId?: string } | undefined)?.personId ?? "") === person.id,
      ),
    ]);
    return c.json({
      person: redactPerson(person, actor.role),
      documents: documents.map(slimDocument),
      sources: sources.map((source) => redactSource(source, actor.role)),
    });
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
        middleName: z.string().optional(),
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
      fullLegalName: [
        patch.firstName ?? existing.firstName,
        patch.middleName ?? existing.middleName,
        patch.lastName ?? existing.lastName,
      ]
        .map((part) => (part ?? "").trim())
        .filter(Boolean)
        .join(" "),
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
    const documents = (await store.whereEquals<ContractDocument>("documents", "companyId", company.id)).map(slimDocument);
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
    const documents = await store.listDocs<ContractDocument>("documents");
    return c.json({ documents: documents.map(slimDocument) });
  });

  app.get("/documents/:id", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    const id = c.req.param("id");
    const document = await store.getDoc<ContractDocument>("documents", id);
    if (!document) return c.json({ error: "Not found" }, 404);
    const [version, relFrom, relTo, audits, rawSigning, ai, html] = await Promise.all([
      store.getDoc<DocumentVersion>("documentVersions", document.currentVersionId),
      store.whereEquals<DocumentRelationship>("documentRelationships", "fromDocumentId", id),
      store.whereEquals<DocumentRelationship>("documentRelationships", "toDocumentId", id),
      store.whereEquals<AuditEvent>("auditEvents", "entityId", id),
      store.whereEquals<SigningRequest>("signingRequests", "documentId", id),
      store.getSettings<AiSettings>("ai"),
      assembleCurrentHtml(store, id),
    ]);
    const signing = await expireStaleRequests(store, rawSigning);
    const relationships = [...relFrom, ...relTo];
    const relatedIds = [...new Set(relationships.flatMap((item) => [item.fromDocumentId, item.toDocumentId]))].filter(
      (other) => other !== id,
    );
    const relatedDocs = (
      await Promise.all(relatedIds.map((other) => store.getDoc<ContractDocument>("documents", other)))
    ).filter((item): item is ContractDocument => Boolean(item));
    const current = (await store.getDoc<ContractDocument>("documents", id)) ?? document;
    const [template, templateVersion, clauses, clauseVersions] = await Promise.all([
      store.getDoc<Template>("templates", current.templateId),
      store.getDoc<TemplateVersion>("templateVersions", current.templateVersionId),
      store.listDocs<Clause>("clauses"),
      store.listDocs<ClauseVersion>("clauseVersions"),
    ]);
    const included = new Set(version?.snapshot.includedClauseIds ?? []);
    return c.json({
      document: current,
      version,
      relationships,
      audits,
      signing: signing.map(publicSigningRequest),
      relatedDocs,
      html,
      ai,
      aiThemeEnabled: Boolean(geminiEnabled() && ai?.enabled && (ai.recommendThemes ?? true)),
      canEditTheme: EDITABLE_DESIGN_STATUSES.includes(current.status),
      canEditContent: EDITABLE_DESIGN_STATUSES.includes(current.status),
      template,
      templateVersion,
      clauses: clauses.filter((item) => included.has(item.id) || (templateVersion?.sections.some((section) => section.clauseIds.includes(item.id)) ?? false)),
      clauseVersions: clauseVersions.filter((item) => included.has(item.clauseId) || version?.snapshot.clauseVersionIds.includes(item.id)),
    });
  });

  app.get("/documents/:id/pdf", async (c) => {
    const actor = await authed(c, "documents.pdf");
    const store = await getStore(actor.orgId);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const pdfHeaders = (filename: string, sha256?: string) => ({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...(sha256 ? { "X-Content-SHA256": sha256 } : {}),
    });
    // A finalized agreement is served byte-for-byte when the stored file is a real PDF.
    // Older finalizations may have stored HTML (PDF engine missing) — re-render on download.
    if (document.status === "FINALIZED" && document.finalPdfPath) {
      const file = await store.getFile(document.finalPdfPath);
      if (file) {
        const head = new TextDecoder().decode(file.bytes.slice(0, 16)).trimStart();
        const isPdf = file.contentType === "application/pdf" && head.startsWith("%PDF");
        const isHtml =
          file.contentType.startsWith("text/html") ||
          head.startsWith("<!") ||
          head.toLowerCase().startsWith("<html");
        if (isPdf) {
          return new Response(Buffer.from(file.bytes), {
            headers: pdfHeaders(`${document.readableId}-signed.pdf`, document.sha256),
          });
        }
        if (isHtml) {
          try {
            const pdf = await renderPdf(new TextDecoder().decode(file.bytes));
            return new Response(Buffer.from(pdf), {
              headers: pdfHeaders(`${document.readableId}-signed.pdf`),
            });
          } catch (error) {
            if (error instanceof PdfUnavailableError) {
              return c.json({ error: error.message }, 503);
            }
            throw error;
          }
        }
        return c.json({ error: "PDF rendering is unavailable on this deployment" }, 503);
      }
    }
    const html = await assembleCurrentHtml(store, document.id);
    try {
      const pdf = await renderPdf(html);
      return new Response(Buffer.from(pdf), {
        headers: pdfHeaders(`${document.readableId}.pdf`),
      });
    } catch (error) {
      if (error instanceof PdfUnavailableError) {
        return c.json({ error: error.message }, 503);
      }
      throw error;
    }
  });

  /** Print-ready HTML of the stored agreement (browser "Save as PDF" fallback). */
  app.get("/documents/:id/print", async (c) => {
    const actor = await authed(c, "documents.pdf");
    const store = await getStore(actor.orgId);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    let html: string | null = null;
    if (document.status === "FINALIZED" && document.finalPdfPath) {
      const file = await store.getFile(document.finalPdfPath);
      if (file && file.contentType.startsWith("text/html")) html = new TextDecoder().decode(file.bytes);
    }
    html ??= await assembleCurrentHtml(store, document.id);
    return c.html(printableHtml(html));
  });

  app.get("/documents/:id/sync", async (c) => {
    const actor = await authed(c, "documents.read");
    const store = await getStore(actor.orgId);
    const document = await store.getDoc<ContractDocument>("documents", c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    const signing = await store.whereEquals<SigningRequest>("signingRequests", "documentId", document.id);
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
    if (!EDITABLE_DESIGN_STATUSES.includes(document.status)) {
      throw new Error("Design is locked once a document has been sent");
    }
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

  app.patch("/documents/:id/content", async (c) => {
    const actor = await authed(c, "documents.edit");
    const store = await getStore(actor.orgId);
    const result = await updateDocumentContent(store, actor, c.req.param("id"), await c.req.json());
    return c.json(result);
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
    const result = await sendForSignature(store, actor, c.req.param("id"), { name, email }, {
      appUrl: frontendOrigin(c),
    });
    return c.json(result);
  });

  app.get("/documents/:id/signing-link", async (c) => {
    const actor = await authed(c, "documents.send");
    const store = await getStore(actor.orgId);
    const link = await getActiveSigningLink(store, c.req.param("id"), { appUrl: frontendOrigin(c) });
    return c.json({ link });
  });

  app.post("/signing/:requestId/revoke", async (c) => {
    const actor = await authed(c, "documents.send");
    const store = await getStore(actor.orgId);
    await revokeSigningLink(store, actor, c.req.param("requestId"));
    return c.json({ ok: true });
  });

  app.post("/signing/:requestId/extend", async (c) => {
    const actor = await authed(c, "documents.send");
    const store = await getStore(actor.orgId);
    const { days } = z.object({ days: z.number().int().min(1).max(60) }).parse(await c.req.json());
    await extendSigningLink(store, actor, c.req.param("requestId"), days);
    return c.json({ ok: true });
  });

  app.post("/documents/:id/countersign", async (c) => {
    const actor = await authed(c, "documents.countersign");
    const store = await getStore(actor.orgId);
    const body = z
      .object({ imageDataUrl: z.string().min(1), method: z.enum(["draw", "type"]) })
      .parse(await c.req.json());
    await applyCompanySignature(store, actor, c.req.param("id"), { ...body, appUrl: frontendOrigin(c) });
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
    const ai = await store.getSettings<AiSettings>("ai");
    return c.json({
      templates: templates.filter((item) => item.status !== "archived"),
      templateVersions,
      clauses,
      clauseVersions,
      people: people.map((person) => redactPerson(person, actor.role)),
      companies,
      themes,
      roleProfiles,
      company,
      sources: sources.map((source) => redactSource(source, actor.role)),
      documents: documents.map(slimDocument),
      aiEnabled: Boolean(geminiEnabled() && ai?.enabled && ai.recommendTemplates),
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
    const docs = input.personId
      ? await store.whereEquals<ContractDocument>("documents", "personId", input.personId)
      : [];
    const hasExisting =
      docs.some((d) => d.family === "EMPLOYMENT" && d.status === "FINALIZED") ||
      Boolean(input.personId && history);
    const deterministic = recommendDocumentType({
      partyType: input.partyType,
      action: input.action,
      hasExistingEmploymentAgreement: hasExisting,
      historicalTemplateId: history?.templateId,
      historicalReason: history?.reason,
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
        return c.json({ ...deterministic, ai: rec, history: history ? { templateId: history.templateId, reason: history.reason } : null });
      } catch {
        /* fall through */
      }
    }
    return c.json({ ...deterministic, history: history ? { templateId: history.templateId, reason: history.reason } : null });
  });

  // ── Public signing ────────────────────────────────────────────────
  app.get("/sign/:token", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) return c.json(null);
    const client = requestClient((name) => c.req.header(name));
    // A signed-in staff member previewing the link must not count as the recipient opening it.
    const viewer = c.get("session") as SessionUser | null;
    const preview = Boolean(viewer && viewer.email.toLowerCase() !== found.request.recipientEmail.toLowerCase());
    if (!preview && found.request.status !== "completed") {
      await markOpened(store, found.request, client.ip, client.ua);
    }
    const [signing, company] = await Promise.all([
      store.getSettings<{ allowDraftDownload?: boolean }>("signing"),
      store.getSettings<CompanySettings>("company"),
    ]);
    const canViewBody = !found.request.requireOtp || Boolean(found.request.otpVerifiedAt);
    const finalized = found.document.status === "FINALIZED";
    return c.json({
      documentId: found.document.id,
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
      finalized,
      sha256: found.document.sha256,
      signedAt: found.document.signedAt,
      partyName: found.document.partyName,
      companyName: company.legalName,
      preview,
      signedCopyAvailable: finalized && Boolean(found.document.finalPdfPath),
    });
  });

  /** Recipient's copy of the finalized agreement (PDF preferred; print HTML only if PDF engine unavailable). */
  app.get("/sign/:token/pdf", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) throw new Error("Invalid or expired signing link");
    const document = found.document;
    if (document.status !== "FINALIZED" || !document.finalPdfPath) throw new Error("Signed copy is not available yet");
    const file = await store.getFile(document.finalPdfPath);
    if (!file) throw new Error("Signed copy is not available yet");
    const head = new TextDecoder().decode(file.bytes.slice(0, 16)).trimStart();
    const isPdf = file.contentType === "application/pdf" && head.startsWith("%PDF");
    const isHtml =
      file.contentType.startsWith("text/html") ||
      head.startsWith("<!") ||
      head.toLowerCase().startsWith("<html");
    if (isPdf) {
      return new Response(Buffer.from(file.bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${document.readableId}-signed.pdf"`,
        },
      });
    }
    if (isHtml) {
      const html = new TextDecoder().decode(file.bytes);
      try {
        const pdf = await renderPdf(html);
        return new Response(Buffer.from(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${document.readableId}-signed.pdf"`,
          },
        });
      } catch (error) {
        if (error instanceof PdfUnavailableError) {
          return c.html(printableHtml(html));
        }
        throw error;
      }
    }
    throw new Error("Signed copy is not available yet");
  });

  app.post("/sign/:token/consent", async (c) => {
    const store = await getStore();
    const found = await getSigningByToken(store, c.req.param("token"));
    if (!found) throw new Error("Invalid or expired signing link");
    if (found.request.requireOtp && !found.request.otpVerifiedAt) {
      throw new Error("Email verification code is required before signing");
    }
    const client = requestClient((name) => c.req.header(name));
    await acceptConsent(store, found.request, client.ip, client.ua);
    return c.json({ ok: true });
  });

  app.post("/sign/:token/otp/send", async (c) => {
    const client = requestClient((name) => c.req.header(name));
    const token = c.req.param("token");
    for (const key of [`otp-send:${client.ip}`, `otp-send-token:${token.slice(0, 16)}`]) {
      const limited = rateLimit({ key, limit: 10, windowMs: 15 * 60 * 1000 });
      if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    }
    const body = (await c.req.json().catch(() => ({}))) as { force?: boolean };
    const result = await sendSigningOtp(await getStore(), token, { force: Boolean(body.force) });
    return c.json(result);
  });

  app.post("/sign/:token/otp/verify", async (c) => {
    const client = requestClient((name) => c.req.header(name));
    const limited = rateLimit({ key: `otp-verify:${client.ip}`, limit: 30, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) throw new Error("Too many attempts. Try again later.");
    const body = z.object({ code: z.string().min(4).max(12) }).parse(await c.req.json());
    await verifySigningOtp(await getStore(), c.req.param("token"), body.code, client);
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
      .object({ imageDataUrl: z.string().min(1).max(2_200_000), method: z.enum(["draw", "type"]) })
      .parse(await c.req.json());
    const client = requestClient((name) => c.req.header(name));
    await applyRecipientSignature(store, found.request, {
      method: body.method,
      imageDataUrl: body.imageDataUrl,
      ip: client.ip,
      ua: client.ua,
      appUrl: frontendOrigin(c),
    });
    return c.json({ ok: true as const, documentId: found.document.id });
  });

  // ── Library / misc lists ──────────────────────────────────────────
  app.get("/templates", async (c) => {
    const actor = await authed(c, "templates.read");
    const store = await getStore(actor.orgId);
    return c.json({ templates: await store.listDocs<Template>("templates") });
  });
  app.post("/templates", async (c) => {
    const actor = await authed(c, "templates.write");
    const store = await getStore(actor.orgId);
    try {
      const result = await createTemplate(store, actor, await c.req.json());
      return c.json(result, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      if (message.startsWith("Unknown")) return c.json({ error: message }, 404);
      return c.json({ error: message }, 400);
    }
  });
  app.get("/templates/:id", async (c) => {
    const actor = await authed(c, "templates.read");
    const store = await getStore(actor.orgId);
    const template = await store.getDoc<Template>("templates", c.req.param("id"));
    if (!template) return c.json({ error: "Not found" }, 404);
    const versions = await store.queryDocs<TemplateVersion>("templateVersions", (item) => item.templateId === template.id);
    return c.json({ template, versions });
  });
  app.patch("/templates/:id", async (c) => {
    const actor = await authed(c, "templates.write");
    const store = await getStore(actor.orgId);
    try {
      const result = await updateTemplate(store, actor, c.req.param("id"), await c.req.json());
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      if (message.includes("not found") || message.includes("Not found") || message.startsWith("Unknown")) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
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
  app.post("/clauses", async (c) => {
    const actor = await authed(c, "clauses.write");
    const store = await getStore(actor.orgId);
    try {
      const result = await createClause(store, actor, await c.req.json());
      return c.json(result, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      return c.json({ error: message }, 400);
    }
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
  app.patch("/clauses/:id", async (c) => {
    const actor = await authed(c, "clauses.write");
    const store = await getStore(actor.orgId);
    try {
      const result = await updateClause(store, actor, c.req.param("id"), await c.req.json());
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      if (message.includes("not found") || message.includes("Not found")) return c.json({ error: message }, 404);
      return c.json({ error: message }, 400);
    }
  });
  app.get("/packs", async (c) => {
    const actor = await authed(c, "packs.read");
    const store = await getStore(actor.orgId);
    return c.json({
      packs: await store.listDocs<DocumentPack>("documentPacks"),
      templates: await store.listDocs<Template>("templates"),
    });
  });
  app.post("/packs", async (c) => {
    const actor = await authed(c, "packs.write");
    const store = await getStore(actor.orgId);
    try {
      const pack = await createPack(store, actor, await c.req.json());
      return c.json({ pack }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      if (message.startsWith("Unknown")) return c.json({ error: message }, 404);
      return c.json({ error: message }, 400);
    }
  });
  app.patch("/packs/:id", async (c) => {
    const actor = await authed(c, "packs.write");
    const store = await getStore(actor.orgId);
    try {
      const pack = await updatePack(store, actor, c.req.param("id"), await c.req.json());
      return c.json({ pack });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      if (message.includes("not found") || message.includes("Not found") || message.startsWith("Unknown")) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });
  app.get("/knowledge", async (c) => {
    const actor = await authed(c, "knowledge.read");
    const store = await getStore(actor.orgId);
    const [sources, findings, people, companies] = await Promise.all([
      store.listDocs<SourceDocument>("sourceDocuments"),
      store.listDocs<KnowledgeFinding>("knowledgeFindings"),
      store.listDocs<Person>("people"),
      store.listDocs<CompanyRecord>("companies"),
    ]);
    return c.json({
      sources: sources.map((source) => redactSource(source, actor.role)),
      findings,
      people: people.map((person) => redactPerson(person, actor.role)),
      companies,
    });
  });
  app.post("/knowledge/findings", async (c) => {
    const actor = await authed(c, "knowledge.write");
    const store = await getStore(actor.orgId);
    try {
      const finding = await createKnowledgeFinding(store, actor, await c.req.json());
      return c.json({ finding }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create failed";
      return c.json({ error: message }, 400);
    }
  });
  app.patch("/knowledge/findings/:id", async (c) => {
    const actor = await authed(c, "knowledge.write");
    const store = await getStore(actor.orgId);
    try {
      const finding = await updateKnowledgeFinding(store, actor, c.req.param("id"), await c.req.json());
      return c.json({ finding });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      if (message.includes("not found") || message.includes("Not found")) return c.json({ error: message }, 404);
      return c.json({ error: message }, 400);
    }
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
    const [rawRequests, documents] = await Promise.all([
      store.listDocs<SigningRequest>("signingRequests"),
      store.listDocs<ContractDocument>("documents"),
    ]);
    const requests = await expireStaleRequests(store, rawRequests);
    return c.json({
      requests: requests.map(publicSigningRequest),
      documents: documents.map(slimDocument),
    });
  });
  app.get("/approvals", async (c) => {
    const actor = await authed(c, "documents.approve");
    const store = await getStore(actor.orgId);
    const documents = await store.listDocs<ContractDocument>("documents");
    const waiting = documents.filter((item) => item.status === "REVIEW_REQUIRED").map(slimDocument);
    const cleared = documents.filter(
      (item) => item.status === "APPROVED" || item.status === "FINALIZED",
    ).length;
    return c.json({ documents: waiting, cleared });
  });
  app.get("/audit", async (c) => {
    const actor = await authed(c, "audit.read");
    const store = await getStore(actor.orgId);
    const events = await store.listDocs<AuditEvent>("auditEvents");
    // Newest first, cap payload for the index page.
    const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 200);
    return c.json({ events: sorted });
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
      documents: documents.map(slimDocument),
      requests: requests.map((item) => ({
        id: item.id,
        documentId: item.documentId,
        status: item.status,
        expiresAt: item.expiresAt,
      })),
      people: people.map((item) => ({
        id: item.id,
        type: item.type,
        employmentStatus: item.employmentStatus,
      })),
      companies: companies.map((item) => ({
        id: item.id,
        relationshipStatus: item.relationshipStatus,
      })),
      sources: sources.map((item) => ({ id: item.id })),
      findings: findings.map((item) => ({ id: item.id, status: item.status })),
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
    const [company, workspace, ai, aiUsage, signing, themes, users] = await Promise.all([
      store.getSettings<CompanySettings>("company"),
      loadWorkspaceSettings(store),
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
      workspace,
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
      seatsUsed: users.filter((u) => u.active).length,
      actor,
    });
  });

  app.put("/settings/company", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const current = await store.getSettings<CompanySettings>("company");
    const parsed = companySettingsSchema.parse({ ...current, ...(await c.req.json()) });
    await store.setSettings("company", parsed);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor,
      entityType: "settings",
      entityId: "company",
      summary: "Company settings updated.",
    });
    return c.json(parsed);
  });

  app.put("/settings/workspace", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const current = await loadWorkspaceSettings(store);
    const parsed = workspaceSettingsSchema.parse({ ...current, ...(await c.req.json()) });
    await store.setSettings("workspace", parsed);
    // Keep company product subtitle in sync for shell + PDFs.
    const company = await store.getSettings<CompanySettings>("company");
    if (company.productName !== parsed.productName || company.displayName !== parsed.name) {
      await store.setSettings("company", {
        ...company,
        productName: parsed.productName,
      });
    }
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor,
      entityType: "settings",
      entityId: "workspace",
      summary: `Workspace updated (${parsed.slug} · ${parsed.plan}).`,
    });
    return c.json(parsed);
  });

  app.post("/settings/branding/upload", async (c) => {
    const actor = await authed(c, "settings.write");
    const store = await getStore(actor.orgId);
    const body = z
      .object({
        kind: z.enum(["logoDark", "logoLight", "seal", "signature"]),
        dataUrl: z.string().min(32),
      })
      .parse(await c.req.json());
    const company = await uploadBrandingAsset(store, body.kind as BrandingUploadKind, body.dataUrl);
    await writeAudit(store, {
      type: "SETTINGS_UPDATED",
      actor,
      entityType: "settings",
      entityId: "branding",
      summary: `Branding asset uploaded (${body.kind}).`,
    });
    return c.json({ company });
  });

  /** Public tenant branding for shell / login (SaaS-ready host resolution). */
  app.get("/workspace/branding", async (c) => {
    const orgId = resolveOrgIdFromHost(c.req.header("x-frontend-host") || c.req.header("host"));
    const store = await getStore(orgId);
    const company = await store.getSettings<CompanySettings>("company");
    const workspace = await loadWorkspaceSettings(store);
    const dark = resolveBrandingAssets(company, true);
    const light = resolveBrandingAssets(company, false);
    c.header("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    return c.json({
      orgId,
      displayName: company.displayName,
      legalName: company.legalName,
      productName: workspace.productName || company.productName || "ContractOS",
      workspaceName: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      status: workspace.status,
      seatLimit: workspace.seatLimit,
      logoDark: dark.logo,
      logoLight: light.logo,
      usesCustomLogo: isStoredBrandingPath(dark.logo) || isStoredBrandingPath(light.logo),
      shellLogoScale: workspace.shellLogoScale ?? 4,
      brandingRevision: company.brandingRevision ?? 0,
    });
  });

  app.get("/workspace/branding/logo", async (c) => {
    const orgId = resolveOrgIdFromHost(c.req.header("x-frontend-host") || c.req.header("host"));
    const store = await getStore(orgId);
    const company = await store.getSettings<CompanySettings>("company");
    const variant = c.req.query("variant") === "light" ? "light" : "dark";
    const assets = resolveBrandingAssets(company, variant === "dark");
    return serveBrandingPath(c, store, assets.logo);
  });

  app.get("/workspace/branding/asset", async (c) => {
    const orgId = resolveOrgIdFromHost(c.req.header("x-frontend-host") || c.req.header("host"));
    const store = await getStore(orgId);
    const company = await store.getSettings<CompanySettings>("company");
    const kind = c.req.query("kind") || "logoDark";
    const dark = resolveBrandingAssets(company, true);
    const light = resolveBrandingAssets(company, false);
    const path =
      kind === "logoLight"
        ? light.logo
        : kind === "seal"
          ? dark.seal
          : kind === "signature"
            ? dark.signature
            : dark.logo;
    return serveBrandingPath(c, store, path);
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
        // Optional: invited users normally sign in with Google/Firebase using this email.
        password: z.string().min(8).optional(),
        active: z.boolean().optional(),
      })
      .parse(await c.req.json());
    if (body.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new Error("Only a SUPER_ADMIN can grant SUPER_ADMIN");
    }
    const security = await loadSecuritySettings(store);
    if (body.password) assertPasswordPolicy(body.password, security);
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
      passwordHash: body.password ? hashPassword(body.password) : undefined,
      createdAt: nowIso(),
    };
    await store.setDoc("users", user);
    await writeAudit(store, {
      type: "USER_INVITED",
      actor,
      entityType: "user",
      entityId: user.id,
      summary: `Invited ${user.email} as ${user.role}.`,
    });
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
    if (next.role !== existing.role || next.active !== existing.active) {
      await writeAudit(store, {
        type: "USER_ROLE_CHANGED",
        actor,
        entityType: "user",
        entityId: next.id,
        summary: `${next.email}: ${existing.role}${existing.active ? "" : " (inactive)"} → ${next.role}${next.active ? "" : " (inactive)"}.`,
      });
    }
    return c.json({ user: toPublicUser(next) });
  });

  // silence unused resolve import
  void resolveThemeId;

  return app;
}
