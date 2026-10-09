import type { DataStore } from "@/lib/data/store";
import type { SessionUser } from "@/lib/auth/session";
import { newId, nowIso } from "@/lib/ids";
import { writeAudit } from "@/lib/services/audit-service";
import type {
  Clause,
  ClauseVersion,
  DocumentPack,
  FieldDefinition,
  KnowledgeFinding,
  Template,
  TemplateSection,
  TemplateVersion,
} from "@/lib/types";
import {
  createClauseInputSchema,
  createKnowledgeFindingInputSchema,
  createPackInputSchema,
  createTemplateInputSchema,
  updateClauseInputSchema,
  updateKnowledgeFindingInputSchema,
  updatePackInputSchema,
  updateTemplateInputSchema,
} from "@/lib/validation/schemas";
import type { z } from "zod";

export type UpdateClauseInput = z.infer<typeof updateClauseInputSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;
export type UpdatePackInput = z.infer<typeof updatePackInputSchema>;
export type UpdateKnowledgeFindingInput = z.infer<typeof updateKnowledgeFindingInputSchema>;

function normalizeLegalHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

function defaultFields(category: Template["category"]): {
  requiredFields: FieldDefinition[];
  optionalFields: FieldDefinition[];
} {
  if (category === "CLIENT") {
    return {
      requiredFields: [
        { key: "startDate", label: "Start date", type: "date", required: true },
        { key: "serviceFee", label: "Service fee", type: "currency", required: true },
        { key: "feeCurrency", label: "Currency", type: "string", required: true },
        { key: "termMonths", label: "Term (months)", type: "number", required: true },
      ],
      optionalFields: [
        { key: "adSpendPaidSeparately", label: "Ad spend paid separately", type: "boolean", required: false },
        { key: "noSalesGuarantee", label: "No sales guarantee", type: "boolean", required: false },
        { key: "clientOwnsLeads", label: "Client owns leads", type: "boolean", required: false },
      ],
    };
  }
  return {
    requiredFields: [
      { key: "jobTitle", label: "Role / job title", type: "string", required: true },
      { key: "department", label: "Department", type: "string", required: true },
      { key: "reportingManager", label: "Reporting manager", type: "string", required: true },
      { key: "startDate", label: "Start date", type: "date", required: true },
      { key: "compensation.salary.amount", label: "Salary amount", type: "currency", required: true },
      { key: "compensation.salary.currency", label: "Currency", type: "string", required: true },
      { key: "compensation.salary.frequency", label: "Salary frequency", type: "select", required: true },
      { key: "noticePeriodDays", label: "Notice period (days)", type: "number", required: true },
    ],
    optionalFields: [
      { key: "compensation.bonus.enabled", label: "Bonus enabled", type: "boolean", required: false },
      { key: "probation.enabled", label: "Probation enabled", type: "boolean", required: false },
      { key: "remoteWork", label: "Remote work", type: "boolean", required: false },
    ],
  };
}

async function assertClauseIds(store: DataStore, clauseIds: string[]) {
  for (const clauseId of clauseIds) {
    const clause = await store.getDoc<Clause>("clauses", clauseId);
    if (!clause) throw new Error(`Unknown clause: ${clauseId}`);
  }
}

function buildSections(
  inputs: Array<{
    id?: string;
    title: string;
    clauseIds: string[];
    order?: number;
    required?: boolean;
    optional?: boolean;
  }>,
): TemplateSection[] {
  return inputs.map((section, index) => ({
    id: section.id?.trim() || newId("sec"),
    order: section.order ?? index + 1,
    title: section.title.trim(),
    required: section.required ?? true,
    optional: section.optional ?? false,
    clauseIds: section.clauseIds,
  }));
}

function sectionsChanged(current: TemplateSection[], next: TemplateSection[]): boolean {
  if (current.length !== next.length) return true;
  return next.some((section, index) => {
    const previous = current[index];
    if (!previous) return true;
    return (
      previous.id !== section.id ||
      previous.title !== section.title ||
      previous.order !== section.order ||
      previous.required !== section.required ||
      previous.optional !== section.optional ||
      previous.clauseIds.join(",") !== section.clauseIds.join(",")
    );
  });
}

export async function createClause(
  store: DataStore,
  actor: SessionUser,
  raw: unknown,
): Promise<{ clause: Clause; version: ClauseVersion }> {
  const input = createClauseInputSchema.parse(raw);
  const now = nowIso();
  const clauseId = newId("cl");
  const versionId = newId("cv");
  const legalText = normalizeLegalHtml(input.legalText);

  const version: ClauseVersion = {
    id: versionId,
    clauseId,
    version: 1,
    status: "approved",
    legalText,
    createdBy: actor.userId,
    approvedBy: actor.userId,
    createdAt: now,
    effectiveDate: now.slice(0, 10),
    changeNotes: input.changeNotes.trim() || "Initial approved wording.",
  };

  const clause: Clause = {
    id: clauseId,
    title: input.title.trim(),
    category: input.category.trim(),
    description: input.description.trim() || input.title.trim(),
    currentVersionId: versionId,
    currentVersion: 1,
    status: input.status,
    tags: input.tags,
    applicableDocumentTypes: [],
    applicableRoles: [],
    applicableJurisdictions: [],
    createdBy: actor.userId,
    approvedBy: actor.userId,
    createdAt: now,
    updatedAt: now,
    effectiveDate: version.effectiveDate,
  };

  await store.setDoc("clauseVersions", version);
  await store.setDoc("clauses", clause);
  await writeAudit(store, {
    type: "CLAUSE_CREATED",
    actor,
    entityType: "clause",
    entityId: clause.id,
    summary: `Created clause ${clause.title}.`,
  });
  return { clause, version };
}

export async function updateClause(
  store: DataStore,
  actor: SessionUser,
  clauseId: string,
  raw: unknown,
): Promise<{ clause: Clause; version: ClauseVersion }> {
  const input = updateClauseInputSchema.parse(raw);
  const existing = await store.getDoc<Clause>("clauses", clauseId);
  if (!existing) throw new Error("Clause not found");

  const currentVersion = await store.getDoc<ClauseVersion>("clauseVersions", existing.currentVersionId);
  if (!currentVersion) throw new Error("Clause version not found");

  const now = nowIso();
  let version = currentVersion;
  let clause: Clause = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    category: input.category ?? existing.category,
    status: input.status ?? existing.status,
    tags: input.tags ?? existing.tags,
    updatedAt: now,
  };

  const nextLegal = input.legalText !== undefined ? normalizeLegalHtml(input.legalText) : undefined;
  if (nextLegal !== undefined && nextLegal !== currentVersion.legalText) {
    await store.setDoc("clauseVersions", { ...currentVersion, status: "archived" });
    version = {
      id: newId("cv"),
      clauseId: existing.id,
      version: existing.currentVersion + 1,
      status: "approved",
      legalText: nextLegal,
      conditions: currentVersion.conditions,
      createdBy: actor.userId,
      approvedBy: actor.userId,
      createdAt: now,
      effectiveDate: now.slice(0, 10),
      changeNotes: input.changeNotes?.trim() || "Updated library wording.",
    };
    await store.setDoc("clauseVersions", version);
    clause = {
      ...clause,
      currentVersionId: version.id,
      currentVersion: version.version,
      approvedBy: actor.userId,
      effectiveDate: version.effectiveDate,
    };
    await writeAudit(store, {
      type: "CLAUSE_VERSIONED",
      actor,
      entityType: "clause",
      entityId: clause.id,
      summary: `Versioned ${clause.title} to v${version.version}.`,
    });
  } else {
    await writeAudit(store, {
      type: "CLAUSE_APPROVED",
      actor,
      entityType: "clause",
      entityId: clause.id,
      summary: `Updated metadata for ${clause.title}.`,
    });
  }

  await store.setDoc("clauses", clause);
  return { clause, version };
}

export async function createTemplate(
  store: DataStore,
  actor: SessionUser,
  raw: unknown,
): Promise<{ template: Template; version: TemplateVersion }> {
  const input = createTemplateInputSchema.parse(raw);
  const allClauseIds = [...new Set(input.sections.flatMap((section) => section.clauseIds))];
  await assertClauseIds(store, allClauseIds);

  const now = nowIso();
  const templateId = newId("tpl");
  const versionId = newId("tv");
  const sections = buildSections(input.sections);
  const fields = defaultFields(input.category);

  const version: TemplateVersion = {
    id: versionId,
    templateId,
    version: 1,
    name: `${input.name.trim()} v1`,
    status: "approved",
    themeId: input.themeId,
    requiredFields: fields.requiredFields,
    optionalFields: fields.optionalFields,
    sections,
    rules: [],
    signatureConfig: {
      order: "recipient_first",
      requireOtp: input.category === "CLIENT",
      requireManagerApproval: false,
      allowDraftDownload: false,
      expiryDays: 7,
      reminderSchedule: ["24h", "3d"],
    },
    jurisdiction: input.category === "CLIENT" ? "United States" : "Pakistan",
    createdBy: actor.userId,
    approvedBy: actor.userId,
    createdAt: now,
    effectiveDate: now.slice(0, 10),
  };

  const template: Template = {
    id: templateId,
    name: input.name.trim(),
    category: input.category,
    documentType: input.documentType,
    description: input.description.trim(),
    currentVersionId: versionId,
    currentVersion: 1,
    status: input.status,
    themeId: input.themeId,
    createdBy: actor.userId,
    approvedBy: actor.userId,
    createdAt: now,
    updatedAt: now,
    effectiveDate: version.effectiveDate,
  };

  await store.setDoc("templateVersions", version);
  await store.setDoc("templates", template);
  await writeAudit(store, {
    type: "TEMPLATE_CREATED",
    actor,
    entityType: "template",
    entityId: template.id,
    summary: `Created template ${template.name}.`,
  });
  return { template, version };
}

export async function updateTemplate(
  store: DataStore,
  actor: SessionUser,
  templateId: string,
  raw: unknown,
): Promise<{ template: Template; version: TemplateVersion }> {
  const input = updateTemplateInputSchema.parse(raw);
  const existing = await store.getDoc<Template>("templates", templateId);
  if (!existing) throw new Error("Template not found");

  const currentVersion = await store.getDoc<TemplateVersion>("templateVersions", existing.currentVersionId);
  if (!currentVersion) throw new Error("Template version not found");

  const now = nowIso();
  let version = currentVersion;
  let template: Template = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    status: input.status ?? existing.status,
    updatedAt: now,
  };

  let nextSections: TemplateSection[] | null = null;
  if (input.sections) {
    const allClauseIds = [...new Set(input.sections.flatMap((section) => section.clauseIds))];
    await assertClauseIds(store, allClauseIds);
    nextSections = buildSections(input.sections);
  }

  const needsVersion = nextSections !== null && sectionsChanged(currentVersion.sections, nextSections);

  if (needsVersion && nextSections) {
    version = {
      ...currentVersion,
      id: newId("tv"),
      version: existing.currentVersion + 1,
      status: "approved",
      name: `${template.name} v${existing.currentVersion + 1}`,
      sections: nextSections,
      createdBy: actor.userId,
      approvedBy: actor.userId,
      createdAt: now,
      effectiveDate: now.slice(0, 10),
    };
    await store.setDoc("templateVersions", version);
    template = {
      ...template,
      currentVersionId: version.id,
      currentVersion: version.version,
      approvedBy: actor.userId,
      effectiveDate: version.effectiveDate,
    };
    await writeAudit(store, {
      type: "TEMPLATE_VERSIONED",
      actor,
      entityType: "template",
      entityId: template.id,
      summary: `Versioned ${template.name} to v${version.version}${input.changeNotes ? `: ${input.changeNotes}` : ""}.`,
    });
  } else {
    await writeAudit(store, {
      type: "TEMPLATE_UPDATED",
      actor,
      entityType: "template",
      entityId: template.id,
      summary: `Updated ${template.name}.`,
    });
  }

  await store.setDoc("templates", template);
  return { template, version };
}

export async function createPack(
  store: DataStore,
  actor: SessionUser,
  raw: unknown,
): Promise<DocumentPack> {
  const input = createPackInputSchema.parse(raw);
  for (const templateId of input.templateIds) {
    const template = await store.getDoc<Template>("templates", templateId);
    if (!template) throw new Error(`Unknown template: ${templateId}`);
  }

  const now = nowIso();
  const pack: DocumentPack = {
    id: newId("pack"),
    name: input.name.trim(),
    description: input.description.trim(),
    templateIds: input.templateIds,
    createdAt: now,
    updatedAt: now,
  };
  await store.setDoc("documentPacks", pack);
  await writeAudit(store, {
    type: "SETTINGS_UPDATED",
    actor,
    entityType: "documentPack",
    entityId: pack.id,
    summary: `Created pack ${pack.name}.`,
  });
  return pack;
}

export async function updatePack(
  store: DataStore,
  actor: SessionUser,
  packId: string,
  raw: unknown,
): Promise<DocumentPack> {
  const input = updatePackInputSchema.parse(raw);
  const existing = await store.getDoc<DocumentPack>("documentPacks", packId);
  if (!existing) throw new Error("Pack not found");

  if (input.templateIds) {
    for (const templateId of input.templateIds) {
      const template = await store.getDoc<Template>("templates", templateId);
      if (!template) throw new Error(`Unknown template: ${templateId}`);
    }
  }

  const pack: DocumentPack = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    templateIds: input.templateIds ?? existing.templateIds,
    updatedAt: nowIso(),
  };
  await store.setDoc("documentPacks", pack);
  await writeAudit(store, {
    type: "SETTINGS_UPDATED",
    actor,
    entityType: "documentPack",
    entityId: pack.id,
    summary: `Updated pack ${pack.name}.`,
  });
  return pack;
}

export async function createKnowledgeFinding(
  store: DataStore,
  actor: SessionUser,
  raw: unknown,
): Promise<KnowledgeFinding> {
  const input = createKnowledgeFindingInputSchema.parse(raw);
  const finding: KnowledgeFinding = {
    id: newId("kf"),
    sourceDocumentIds: [],
    title: input.title.trim(),
    category: input.category.trim(),
    occurrenceCount: input.occurrenceCount,
    sampleText: input.sampleText.trim(),
    suggestedClauseId: input.suggestedClauseId,
    decision: input.decision,
    status: input.status,
    createdAt: nowIso(),
  };
  await store.setDoc("knowledgeFindings", finding);
  await writeAudit(store, {
    type: "KNOWLEDGE_APPROVED",
    actor,
    entityType: "knowledgeFinding",
    entityId: finding.id,
    summary: `Created finding ${finding.title}.`,
  });
  return finding;
}

export async function updateKnowledgeFinding(
  store: DataStore,
  actor: SessionUser,
  findingId: string,
  raw: unknown,
): Promise<KnowledgeFinding> {
  const input = updateKnowledgeFindingInputSchema.parse(raw);
  const existing = await store.getDoc<KnowledgeFinding>("knowledgeFindings", findingId);
  if (!existing) throw new Error("Finding not found");

  const finding: KnowledgeFinding = {
    ...existing,
    title: input.title ?? existing.title,
    sampleText: input.sampleText ?? existing.sampleText,
    decision: input.decision ?? existing.decision,
    status: input.status ?? existing.status,
    suggestedClauseId: input.suggestedClauseId ?? existing.suggestedClauseId,
  };
  await store.setDoc("knowledgeFindings", finding);
  await writeAudit(store, {
    type: "KNOWLEDGE_APPROVED",
    actor,
    entityType: "knowledgeFinding",
    entityId: finding.id,
    summary: `Updated finding ${finding.title}${finding.decision ? ` (${finding.decision})` : ""}.`,
  });
  return finding;
}
