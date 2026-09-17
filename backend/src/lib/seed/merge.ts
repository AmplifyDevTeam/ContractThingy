import { AMPLIFY_COMPANY } from "@/lib/branding/identity";
import { AMPLIFY_DOCUMENT_THEMES, resolveThemeId } from "@/lib/branding/themes";
import { seedClauses } from "@/lib/seed/clauses";
import {
  CLIENT_COMPANIES,
  CLIENT_KNOWLEDGE_FINDINGS,
  CLIENT_SOURCE_DOCUMENTS,
} from "@/lib/seed/clients";
import {
  EMPLOYMENT_KNOWLEDGE_FINDINGS,
  EMPLOYMENT_PEOPLE,
  EMPLOYMENT_SOURCE_DOCUMENTS,
} from "@/lib/seed/employees";
import { purgeDemoFixtures } from "@/lib/seed/purge-demo";
import type { OrgState } from "@/lib/seed/state";
import { seedTemplates } from "@/lib/seed/templates";
import type { DocumentPack, DocumentTypeRecord } from "@/lib/types";
import type { ThemeId } from "@/lib/types/enums";

function addMissing<T extends { id: string }>(list: T[], incoming: T[]): boolean {
  let changed = false;
  for (const item of incoming) {
    if (!list.some((existing) => existing.id === item.id)) {
      list.push(item);
      changed = true;
    }
  }
  return changed;
}

function upsertById<T extends { id: string }>(list: T[], incoming: T[]): boolean {
  let changed = false;
  for (const item of incoming) {
    const index = list.findIndex((existing) => existing.id === item.id);
    if (index < 0) {
      list.push(item);
      changed = true;
      continue;
    }
    if (JSON.stringify(list[index]) !== JSON.stringify(item)) {
      list[index] = item;
      changed = true;
    }
  }
  return changed;
}

const createdAt = "2026-01-01T00:00:00.000Z";

const LIBRARY_DOCUMENT_TYPES: DocumentTypeRecord[] = [
  { id: "dt_ea", code: "employment_standard", name: "Standard Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_standard", idPrefix: "EA" },
  { id: "dt_as", code: "employment_appointment_setter", name: "Appointment Setter Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_appointment_setter", idPrefix: "AS" },
  { id: "dt_pr", code: "promotion_amended_employment", name: "Promotion & Amended Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_promotion_amended", idPrefix: "AMEND" },
  { id: "dt_sa", code: "service_agreement", name: "Service Agreement", family: "CLIENT", defaultTemplateId: "tpl_service_agreement", idPrefix: "SA" },
  { id: "dt_lg", code: "lead_generation_agreement", name: "Lead Generation Agreement", family: "CLIENT", defaultTemplateId: "tpl_lead_generation", idPrefix: "LG" },
  { id: "dt_col", code: "collaboration_agreement", name: "Collaboration Agreement", family: "CLIENT", defaultTemplateId: "tpl_collaboration", idPrefix: "COL" },
  { id: "dt_mkt", code: "marketing_agreement", name: "Media Buying Services Agreement", family: "CLIENT", defaultTemplateId: "tpl_media_buying", idPrefix: "MKT" },
  { id: "dt_nda", code: "nda", name: "NDA", family: "EMPLOYMENT", idPrefix: "NDA" },
];

const LIBRARY_PACKS: DocumentPack[] = [
  {
    id: "pack_new_dev",
    name: "New Software Developer",
    description: "Employment agreement plus IP and confidentiality coverage.",
    templateIds: ["tpl_employment_standard"],
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "pack_new_setter",
    name: "New Appointment Setter",
    description: "Appointment setter employment pack.",
    templateIds: ["tpl_employment_appointment_setter"],
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "pack_new_contractor",
    name: "New Contractor",
    description: "Contractor-oriented employment family starting point.",
    templateIds: ["tpl_employment_standard"],
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "pack_new_client",
    name: "New Client",
    description: "Lead generation, collaboration, or media buying depending on the engagement.",
    templateIds: ["tpl_lead_generation", "tpl_collaboration", "tpl_media_buying", "tpl_service_agreement"],
    createdAt,
    updatedAt: createdAt,
  },
];

/** Keep the approved library + historical records from real agreements current. */
export function mergeLibraryIntoOrg(org: OrgState): boolean {
  const { clauses, versions: clauseVersions } = seedClauses();
  const { templates, versions: templateVersions } = seedTemplates();
  let changed = false;

  changed = purgeDemoFixtures(org) || changed;

  // Historical directory + knowledge extracted from real Amplify agreements
  changed = addMissing(org.people, EMPLOYMENT_PEOPLE) || changed;
  changed = addMissing(org.companies, CLIENT_COMPANIES) || changed;
  changed =
    upsertById(org.sourceDocuments, [...CLIENT_SOURCE_DOCUMENTS, ...EMPLOYMENT_SOURCE_DOCUMENTS]) ||
    changed;
  changed =
    upsertById(org.knowledgeFindings, [...CLIENT_KNOWLEDGE_FINDINGS, ...EMPLOYMENT_KNOWLEDGE_FINDINGS]) ||
    changed;

  changed = upsertById(org.templates, templates) || changed;
  changed = upsertById(org.templateVersions, templateVersions) || changed;
  changed = upsertById(org.clauses, clauses) || changed;
  changed = upsertById(org.clauseVersions, clauseVersions) || changed;
  changed = upsertById(org.documentTypes, LIBRARY_DOCUMENT_TYPES) || changed;
  changed = addMissing(org.documentPacks, LIBRARY_PACKS) || changed;

  const company = org.settings.company;
  if (!company.signaturePath || !company.authorizedSignatory || !company.email) {
    org.settings.company = { ...AMPLIFY_COMPANY, ...company };
    changed = true;
  }
  const companyNow = org.settings.company;
  if (
    companyNow.defaultProbationDays == null ||
    companyNow.defaultWorkMode == null ||
    companyNow.defaultPageSize == null
  ) {
    org.settings.company = {
      ...companyNow,
      defaultProbationDays: companyNow.defaultProbationDays ?? AMPLIFY_COMPANY.defaultProbationDays,
      defaultWorkMode: companyNow.defaultWorkMode ?? AMPLIFY_COMPANY.defaultWorkMode,
      defaultPageSize: companyNow.defaultPageSize ?? AMPLIFY_COMPANY.defaultPageSize,
    };
    changed = true;
  }
  if (!org.settings.email) {
    org.settings.email = {
      fromName: companyNow.displayName || AMPLIFY_COMPANY.displayName,
      fromAddress: companyNow.email || AMPLIFY_COMPANY.email,
      replyTo: companyNow.email || AMPLIFY_COMPANY.email,
      notifyInternalOnSign: true,
      notifyRecipientOnComplete: true,
      sendReminders: true,
    };
    changed = true;
  }
  if (!org.settings.security) {
    org.settings.security = {
      sessionDays: 14,
      minPasswordLength: 8,
      requireMixedCase: true,
      requireDigit: true,
      requireSymbol: false,
    };
    changed = true;
  }
  if (org.settings.ai && org.settings.ai.recommendThemes == null) {
    org.settings.ai = { ...org.settings.ai, recommendThemes: true };
    changed = true;
  }
  if (org.settings.ai && org.settings.ai.dashboardInsights == null) {
    org.settings.ai = { ...org.settings.ai, dashboardInsights: true };
    changed = true;
  }

  const liveThemeIds = new Set(AMPLIFY_DOCUMENT_THEMES.map((theme) => theme.id));
  const companyTheme = resolveThemeId(org.settings.company.defaultThemeId);
  if (org.settings.company.defaultThemeId !== companyTheme) {
    org.settings.company = { ...org.settings.company, defaultThemeId: companyTheme };
    changed = true;
  }
  for (const document of org.documents) {
    const nextTheme = resolveThemeId(document.themeId);
    if (document.themeId !== nextTheme) {
      document.themeId = nextTheme;
      changed = true;
    }
  }
  for (const template of org.templates) {
    const nextTheme = resolveThemeId(template.themeId);
    if (template.themeId !== nextTheme) {
      template.themeId = nextTheme;
      changed = true;
    }
  }
  for (const version of org.templateVersions) {
    const nextTheme = resolveThemeId(version.themeId);
    if (version.themeId !== nextTheme) {
      version.themeId = nextTheme;
      changed = true;
    }
  }

  const beforeThemeCount = org.themes.length;
  org.themes = org.themes.filter((theme) => liveThemeIds.has(theme.id as ThemeId));
  if (org.themes.length !== beforeThemeCount) changed = true;

  changed = upsertById(org.themes, AMPLIFY_DOCUMENT_THEMES.map((theme) => ({ ...theme }))) || changed;
  return changed;
}
