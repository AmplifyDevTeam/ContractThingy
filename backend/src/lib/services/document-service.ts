import { assembleDocument } from "@/lib/render/assemble";
import { resolveThemeId, themeById } from "@/lib/branding/themes";
import { nextReadableId, newId, nowIso } from "@/lib/ids";
import { writeAudit } from "@/lib/services/audit-service";
import { resolveCompanyAssetsForPdf } from "@/lib/services/branding-service";
import type { DataStore } from "@/lib/data/store";
import type { SessionUser } from "@/lib/auth/session";
import type {
  Clause,
  ClauseVersion,
  CompanyRecord,
  CompanySettings,
  ContractDocument,
  DocumentTheme,
  DocumentVersion,
  GenerateDocumentInput,
  Person,
  SignatureEvent,
  SigningRequest,
  StoredSignature,
  Template,
  TemplateVersion,
} from "@/lib/types";
import { generateDocumentInputSchema } from "@/lib/validation/schemas";

export type PreviewResult = {
  html: string;
  includedSectionIds: string[];
  includedClauseIds: string[];
  clauseVersionIds: string[];
  template: Template;
  templateVersion: TemplateVersion;
};

async function companyWithEmbeddedAssets(
  store: DataStore,
  company: CompanySettings,
  isDark: boolean,
): Promise<CompanySettings> {
  const assets = await resolveCompanyAssetsForPdf(store, company, isDark);
  return {
    ...company,
    logoPath: assets.logo,
    logoDarkPath: assets.logo,
    logoLightPath: assets.logo,
    signaturePath: assets.signature,
    sealPath: assets.seal,
  };
}

async function loadGenerationContext(store: DataStore, templateId: string) {
  const template = await store.getDoc<Template>("templates", templateId);
  if (!template) throw new Error("Template not found");
  const templateVersion = await store.getDoc<TemplateVersion>(
    "templateVersions",
    template.currentVersionId,
  );
  if (!templateVersion) throw new Error("Template version not found");
  const clauses = await store.listDocs<Clause>("clauses");
  const clauseVersions = await store.listDocs<ClauseVersion>("clauseVersions");
  const themes = await store.listDocs<DocumentTheme>("themes");
  const company = await store.getSettings<CompanySettings>("company");
  return { template, templateVersion, clauses, clauseVersions, themes, company };
}

export async function previewFromInput(
  store: DataStore,
  input: GenerateDocumentInput,
): Promise<PreviewResult> {
  const parsed = generateDocumentInputSchema.parse(input);
  const ctx = await loadGenerationContext(store, parsed.templateId);
  const person = parsed.personId ? await store.getDoc<Person>("people", parsed.personId) : null;
  const client = parsed.companyId
    ? await store.getDoc<CompanyRecord>("companies", parsed.companyId)
    : null;
  const themeLookupId = resolveThemeId(
    parsed.themeId ?? ctx.company.defaultThemeId ?? ctx.template.themeId,
  );
  const theme =
    ctx.themes.find((item) => item.id === themeLookupId) ??
    themeById(themeLookupId) ??
    ctx.themes[0];

  const company = await companyWithEmbeddedAssets(store, ctx.company, theme.background === "dark");
  const assembled = assembleDocument({
    template: ctx.template,
    templateVersion: ctx.templateVersion,
    clauses: ctx.clauses,
    clauseVersions: ctx.clauseVersions,
    theme,
    company,
    person,
    client,
    variables: parsed.variables,
    enabledOptionalClauseIds: parsed.enabledOptionalClauseIds,
    disabledClauseIds: parsed.disabledClauseIds,
  });

  return {
    html: assembled.html,
    includedSectionIds: assembled.includedSectionIds,
    includedClauseIds: assembled.includedClauseIds,
    clauseVersionIds: assembled.clauseVersionIds,
    template: ctx.template,
    templateVersion: ctx.templateVersion,
  };
}

export async function generateDocument(
  store: DataStore,
  actor: SessionUser,
  input: GenerateDocumentInput,
): Promise<ContractDocument> {
  const parsed = generateDocumentInputSchema.parse(input);

  // Idempotency: a retried request (e.g. after a client timeout) returns the same document.
  if (parsed.requestId) {
    const existing = await store.whereEquals<ContractDocument>("documents", "requestId", parsed.requestId);
    const mine = existing.find((item) => item.ownerId === actor.userId);
    if (mine) return mine;
  }

  return store.transact(async (tx) => {
    const preview = await previewFromInput(tx, parsed);
    const person = parsed.personId ? await tx.getDoc<Person>("people", parsed.personId) : null;
    const client = parsed.companyId
      ? await tx.getDoc<CompanyRecord>("companies", parsed.companyId)
      : null;
    const company = await tx.getSettings<CompanySettings>("company");
    const year = new Date().getFullYear();
    const prefix = preview.template.documentType;
    // Atomic counter: concurrent generations can't receive the same readable ID.
    const next = await tx.nextSequence(`${year}-${prefix}`);

    const readableId = nextReadableId({
      documentType: preview.template.documentType,
      year,
      sequence: next,
    });
    const documentId = newId("doc");
    const versionId = newId("dv");
    const now = nowIso();
    const partyName = person?.fullLegalName ?? client?.legalName ?? "Party";
    const family = preview.template.category;
    const needsReview = preview.templateVersion.signatureConfig.requireManagerApproval;

    const generatedThemeId = resolveThemeId(
      parsed.themeId ?? company.defaultThemeId ?? preview.template.themeId,
    );
    const themeList = await tx.listDocs<DocumentTheme>("themes");
    const theme =
      themeList.find((item) => item.id === generatedThemeId) ??
      themeById(generatedThemeId) ??
      themeList[0];
    const companyForPdf = await companyWithEmbeddedAssets(tx, company, theme.background === "dark");
    const assembled = assembleDocument({
      template: preview.template,
      templateVersion: preview.templateVersion,
      clauses: await tx.listDocs<Clause>("clauses"),
      clauseVersions: await tx.listDocs<ClauseVersion>("clauseVersions"),
      theme,
      company: companyForPdf,
      person,
      client,
      variables: parsed.variables,
      enabledOptionalClauseIds: parsed.enabledOptionalClauseIds,
      disabledClauseIds: parsed.disabledClauseIds,
      documentId,
      readableId,
    });

    const document: ContractDocument = {
      id: documentId,
      readableId,
      name: `${preview.template.name} — ${partyName}`,
      documentType: preview.template.documentType,
      family,
      status: needsReview ? "REVIEW_REQUIRED" : "APPROVED",
      partyType: parsed.partyType,
      personId: parsed.personId,
      companyId: parsed.companyId,
      partyName,
      templateId: preview.template.id,
      templateVersionId: preview.templateVersion.id,
      currentVersionId: versionId,
      themeId: generatedThemeId,
      action: parsed.action,
      relatedDocumentId: parsed.relatedDocumentId,
      ownerId: actor.userId,
      ownerName: actor.displayName,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      generationLock: `${documentId}:${now}`,
      requestId: parsed.requestId,
      approvedAt: needsReview ? undefined : now,
      approvedBy: needsReview ? undefined : actor.userId,
    };

    const version: DocumentVersion = {
      id: versionId,
      documentId,
      version: 1,
      status: document.status,
      createdAt: now,
      createdBy: actor.userId,
      snapshot: {
        resolvedVariables: parsed.variables,
        personSnapshot: person
          ? {
              id: person.id,
              firstName: person.firstName,
              middleName: person.middleName,
              lastName: person.lastName,
              fullLegalName: person.fullLegalName,
              email: person.email,
              phone: person.phone,
              identityNumber: person.identityNumber,
              fatherName: person.fatherName,
              residentialAddress: person.residentialAddress,
              city: person.city,
              province: person.province,
              country: person.country,
              employeeId: person.employeeId,
              type: person.type,
              currentJobTitle: person.currentJobTitle,
            }
          : undefined,
        clientSnapshot: client ?? undefined,
        companySnapshot: {
          legalName: company.legalName,
          displayName: company.displayName,
          address: company.primaryAddress,
          phone: company.phone,
          email: company.email,
          website: company.website,
          authorizedSignatory: company.authorizedSignatory,
          authorizedSignatoryTitle: company.authorizedSignatoryTitle,
          ntn: company.ntn,
          jurisdiction: company.defaultJurisdiction,
        },
        templateId: preview.template.id,
        templateVersionId: preview.templateVersion.id,
        templateVersion: preview.templateVersion.version,
        clauseVersionIds: assembled.clauseVersionIds,
        includedSectionIds: assembled.includedSectionIds,
        includedClauseIds: assembled.includedClauseIds,
        renderedHtml: assembled.html,
        jurisdiction: String(parsed.variables.jurisdiction ?? company.defaultJurisdiction),
        generatedAt: now,
        generatedBy: actor.userId,
      },
    };

    await tx.setDoc("documents", document);
    await tx.setDoc("documentVersions", version);

    if (parsed.relatedDocumentId) {
      await tx.setDoc("documentRelationships", {
        id: newId("rel"),
        fromDocumentId: documentId,
        toDocumentId: parsed.relatedDocumentId,
        type: parsed.action === "renew" ? "renews" : parsed.action === "terminate" ? "terminates" : "amends",
        createdAt: now,
        createdBy: actor.userId,
      });
    }

    await writeAudit(tx, {
      type: "DOCUMENT_GENERATED",
      actor,
      entityType: "document",
      entityId: documentId,
      summary: `Generated ${readableId} from template ${preview.template.name} v${preview.templateVersion.version}.`,
      metadata: {
        templateVersionId: preview.templateVersion.id,
        clauseVersionIds: assembled.clauseVersionIds,
      },
    });

    return document;
  });
}

export async function approveDocument(
  store: DataStore,
  actor: SessionUser,
  documentId: string,
): Promise<ContractDocument> {
  const document = await store.getDoc<ContractDocument>("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (!["DRAFT", "CONFIGURING", "REVIEW_REQUIRED"].includes(document.status)) {
    throw new Error("Only documents awaiting review can be approved");
  }
  const now = nowIso();
  const next: ContractDocument = {
    ...document,
    status: "APPROVED",
    approvedAt: now,
    approvedBy: actor.userId,
    updatedAt: now,
    lastActivityAt: now,
  };
  await store.setDoc("documents", next);
  await writeAudit(store, {
    type: "DOCUMENT_APPROVED",
    actor,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} approved.`,
  });
  return next;
}

export async function voidDocument(
  store: DataStore,
  actor: SessionUser,
  documentId: string,
  reason: string,
): Promise<ContractDocument> {
  const document = await store.getDoc<ContractDocument>("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "FINALIZED") throw new Error("Finalized documents cannot be voided");
  if (document.status === "VOIDED") return document;
  const now = nowIso();
  // A voided agreement must not stay signable.
  const requests = await store.whereEquals<SigningRequest>("signingRequests", "documentId", documentId);
  for (const request of requests) {
    if (request.status === "revoked" || request.status === "completed") continue;
    const { tokenEnc: _enc, ...rest } = request;
    await store.setDoc("signingRequests", { ...rest, status: "revoked" });
  }
  const next: ContractDocument = {
    ...document,
    status: "VOIDED",
    voidedAt: now,
    voidReason: reason,
    updatedAt: now,
    lastActivityAt: now,
  };
  await store.setDoc("documents", next);
  await writeAudit(store, {
    type: "DOCUMENT_VOIDED",
    actor,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} voided. Reason: ${reason}`,
    metadata: { reason },
  });
  return next;
}

export async function getDocumentHtml(store: DataStore, documentId: string): Promise<string> {
  return assembleCurrentHtml(store, documentId);
}

function bytesToDataUrl(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function assembleCurrentHtml(
  store: DataStore,
  documentId: string,
  options?: { finalizedAt?: string },
): Promise<string> {
  const document = await store.getDoc<ContractDocument>("documents", documentId);
  if (!document) throw new Error("Document not found");
  const version = await store.getDoc<DocumentVersion>("documentVersions", document.currentVersionId);
  if (!version) throw new Error("Document version not found");
  const company = await store.getSettings<CompanySettings>("company");
  const template = await store.getDoc<Template>("templates", document.templateId);
  const templateVersion = await store.getDoc<TemplateVersion>(
    "templateVersions",
    document.templateVersionId,
  );
  if (!template || !templateVersion) throw new Error("Template not found");
  const themeId = resolveThemeId(document.themeId);
  const theme =
    (await store.listDocs<DocumentTheme>("themes")).find((item) => item.id === themeId) ??
    themeById(themeId) ??
    (await store.listDocs<DocumentTheme>("themes"))[0];
  // Company identity as it was when the document was generated (address, signatory, NTN…).
  const snap = version.snapshot.companySnapshot;
  const companyAtGeneration: CompanySettings = snap
    ? {
        ...company,
        legalName: snap.legalName || company.legalName,
        displayName: snap.displayName || company.displayName,
        primaryAddress: (snap.address as CompanySettings["primaryAddress"]) ?? company.primaryAddress,
        phone: snap.phone ?? company.phone,
        email: snap.email ?? company.email,
        website: snap.website ?? company.website,
        authorizedSignatory: snap.authorizedSignatory || company.authorizedSignatory,
        authorizedSignatoryTitle: snap.authorizedSignatoryTitle || company.authorizedSignatoryTitle,
        ntn: snap.ntn ?? company.ntn,
      }
    : company;
  const companyForPdf = await companyWithEmbeddedAssets(store, companyAtGeneration, theme.background === "dark");
  const person =
    (version.snapshot.personSnapshot as Person | undefined) ??
    (document.personId ? await store.getDoc<Person>("people", document.personId) : null);
  const client =
    (version.snapshot.clientSnapshot as CompanyRecord | undefined) ??
    (document.companyId ? await store.getDoc<CompanyRecord>("companies", document.companyId) : null);
  const signatures = await store.whereEquals<StoredSignature>("storedSignatures", "documentId", documentId);
  const recipient = signatures.find((item) => item.signerRole === "recipient");
  const companySig = signatures.find((item) => item.signerRole === "company");
  const recipientImage = recipient ? await store.getFile(recipient.imagePath) : null;
  const companyImage = companySig ? await store.getFile(companySig.imagePath) : null;
  const finalizedAt = options?.finalizedAt ?? document.finalizedAt;
  let viewedAt: string | undefined;
  let consentAt: string | undefined;
  let signerIp: string | undefined;
  if (finalizedAt) {
    const requestId = recipient?.signingRequestId;
    const [request, events] = await Promise.all([
      requestId ? store.getDoc<SigningRequest>("signingRequests", requestId) : Promise.resolve(null),
      store.whereEquals<SignatureEvent>("signatureEvents", "documentId", documentId),
    ]);
    const forRequest = events
      .filter((event) => !requestId || event.signingRequestId === requestId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    viewedAt = forRequest.find((event) => event.type === "document_opened")?.timestamp;
    consentAt = request?.consentAcceptedAt;
    signerIp = forRequest.find((event) => event.type === "signature_completed")?.ipAddress;
  }

  return assembleDocument({
    template,
    templateVersion,
    clauses: await store.listDocs<Clause>("clauses"),
    clauseVersions: await store.listDocs<ClauseVersion>("clauseVersions"),
    theme,
    company: companyForPdf,
    person,
    client,
    variables: version.snapshot.resolvedVariables,
    // Render exactly what was generated: pinned clause versions and sections.
    pinnedClauseVersionIds: version.snapshot.clauseVersionIds,
    pinnedSectionIds: version.snapshot.includedSectionIds,
    documentId: document.id,
    readableId: document.readableId,
    signatures:
      recipient || companySig
        ? {
            recipient: recipient
              ? {
                  name: recipient.signerName,
                  imageDataUrl: recipientImage
                    ? bytesToDataUrl(recipientImage.bytes, recipientImage.contentType)
                    : undefined,
                  signedAt: recipient.signedAt.slice(0, 10),
                }
              : undefined,
            company: companySig
              ? {
                  name: companyAtGeneration.authorizedSignatory,
                  imageDataUrl: companyImage
                    ? bytesToDataUrl(companyImage.bytes, companyImage.contentType)
                    : undefined,
                  signedAt: companySig.signedAt.slice(0, 10),
                }
              : undefined,
          }
        : undefined,
    auditCertificate: finalizedAt
      ? {
          createdAt: document.createdAt,
          sentAt: document.sentAt,
          viewedAt,
          consentAt,
          signerIp,
          recipientSignedAt: recipient?.signedAt,
          companySignedAt: companySig?.signedAt,
          finalizedAt,
          sha256: document.sha256,
          recipientName: recipient?.signerName,
          recipientEmail: recipient?.signerEmail,
        }
      : undefined,
  }).html;
}
