import { assembleDocument } from "@/lib/render/assemble";
import { resolveThemeId, themeById } from "@/lib/branding/themes";
import { nextReadableId, newId, nowIso } from "@/lib/ids";
import { writeAudit } from "@/lib/services/audit-service";
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

  const assembled = assembleDocument({
    template: ctx.template,
    templateVersion: ctx.templateVersion,
    clauses: ctx.clauses,
    clauseVersions: ctx.clauseVersions,
    theme,
    company: ctx.company,
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

  return store.transact(async (tx) => {
    const preview = await previewFromInput(tx, parsed);
    const person = parsed.personId ? await tx.getDoc<Person>("people", parsed.personId) : null;
    const client = parsed.companyId
      ? await tx.getDoc<CompanyRecord>("companies", parsed.companyId)
      : null;
    const company = await tx.getSettings<CompanySettings>("company");
    const year = new Date().getFullYear();
    const prefix = preview.template.documentType;
    const sequences = await tx.getSettings<Record<string, number>>("sequences");
    const seqKey = `${year}-${prefix}`;
    const next = (sequences[seqKey] ?? 0) + 1;
    sequences[seqKey] = next;
    await tx.setSettings("sequences", sequences);

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
    const assembled = assembleDocument({
      template: preview.template,
      templateVersion: preview.templateVersion,
      clauses: await tx.listDocs<Clause>("clauses"),
      clauseVersions: await tx.listDocs<ClauseVersion>("clauseVersions"),
      theme:
        themeList.find((item) => item.id === generatedThemeId) ??
        themeById(generatedThemeId) ??
        themeList[0],
      company,
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
  if (document.status === "FINALIZED" || document.status === "VOIDED") {
    throw new Error("Finalized or voided documents cannot be approved again");
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
  const now = nowIso();
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
  const person =
    (version.snapshot.personSnapshot as Person | undefined) ??
    (document.personId ? await store.getDoc<Person>("people", document.personId) : null);
  const client =
    (version.snapshot.clientSnapshot as CompanyRecord | undefined) ??
    (document.companyId ? await store.getDoc<CompanyRecord>("companies", document.companyId) : null);
  const signatures = await store.queryDocs<StoredSignature>(
    "storedSignatures",
    (item) => item.documentId === documentId,
  );
  const recipient = signatures.find((item) => item.signerRole === "recipient");
  const companySig = signatures.find((item) => item.signerRole === "company");
  const recipientImage = recipient ? await store.getFile(recipient.imagePath) : null;
  const companyImage = companySig ? await store.getFile(companySig.imagePath) : null;
  const finalizedAt = options?.finalizedAt ?? document.finalizedAt;

  return assembleDocument({
    template,
    templateVersion,
    clauses: await store.listDocs<Clause>("clauses"),
    clauseVersions: await store.listDocs<ClauseVersion>("clauseVersions"),
    theme,
    company,
    person,
    client,
    variables: version.snapshot.resolvedVariables,
    enabledOptionalClauseIds: version.snapshot.includedClauseIds,
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
                  name: company.authorizedSignatory,
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
