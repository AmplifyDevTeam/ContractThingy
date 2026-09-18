import { AMPLIFY_COMPANY } from "@/lib/branding/identity";
import { AMPLIFY_DOCUMENT_THEMES } from "@/lib/branding/themes";
import { hashPassword } from "@/lib/auth/password";
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
import { seedTemplates } from "@/lib/seed/templates";
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
  DocumentTypeRecord,
  DocumentVersion,
  EmailSettings,
  KnowledgeFinding,
  OrgUser,
  Person,
  RoleProfile,
  SecuritySettings,
  SigningSettings,
  SourceDocument,
} from "@/lib/types";

export type OrgState = {
  users: OrgUser[];
  people: Person[];
  companies: CompanyRecord[];
  templates: ReturnType<typeof seedTemplates>["templates"];
  templateVersions: ReturnType<typeof seedTemplates>["versions"];
  clauses: ReturnType<typeof seedClauses>["clauses"];
  clauseVersions: ReturnType<typeof seedClauses>["versions"];
  documentTypes: DocumentTypeRecord[];
  documents: ContractDocument[];
  documentVersions: DocumentVersion[];
  documentRelationships: DocumentRelationship[];
  signingRequests: unknown[];
  signatureEvents: unknown[];
  storedSignatures: unknown[];
  auditEvents: AuditEvent[];
  sourceDocuments: SourceDocument[];
  knowledgeFindings: KnowledgeFinding[];
  documentPacks: DocumentPack[];
  themes: DocumentTheme[];
  roleProfiles: RoleProfile[];
  notifications: unknown[];
  settings: {
    company: CompanySettings;
    ai: AiSettings;
    aiUsage: AiUsage;
    signing: SigningSettings;
    email: EmailSettings;
    security: SecuritySettings;
    sequences: Record<string, number>;
  };
};

const LIBRARY_CREATED_AT = "2026-01-01T00:00:00.000Z";

function bootstrapAdmin(): OrgUser {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const displayName = (process.env.BOOTSTRAP_ADMIN_NAME ?? "Workspace Admin").trim();

  if (!email || !password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required to create a production workspace.",
      );
    }
    // Local-only fallback so `next dev` can start; never prefill these on the login form.
    return {
      id: "user_super_admin",
      email: "admin@localhost",
      displayName: "Local Admin",
      role: "SUPER_ADMIN",
      active: true,
      passwordHash: hashPassword("change-me-now"),
      createdAt: LIBRARY_CREATED_AT,
    };
  }

  if (password.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.");
  }

  return {
    id: "user_super_admin",
    email,
    displayName: displayName || "Workspace Admin",
    role: "SUPER_ADMIN",
    active: true,
    passwordHash: hashPassword(password),
    createdAt: LIBRARY_CREATED_AT,
  };
}

function libraryRoleProfiles(): RoleProfile[] {
  return [
    {
      id: "role_software_developer",
      name: "Software Developer",
      department: "Engineering",
      suggestedResponsibilities: [
        "Design, build, and maintain internal and client-facing software",
        "Write tests and participate in code review",
        "Collaborate with operations and media teams on tooling",
        "Protect source code, credentials, and production systems",
      ],
      suggestedClauseIds: ["cl_ip_ownership", "cl_remote_work"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "role_appointment_setter",
      name: "Appointment Setter",
      department: "Sales",
      suggestedResponsibilities: [
        "Contact leads using approved scripts and systems",
        "Book qualified appointments for closers",
        "Keep CRM records accurate and current",
        "Handle client personal data according to Company policy",
      ],
      suggestedClauseIds: ["cl_data_protection", "cl_no_guarantee"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "role_media_buyer",
      name: "Media Buyer",
      department: "Media",
      suggestedResponsibilities: [
        "Plan and manage paid media campaigns",
        "Monitor performance and optimize spend",
        "Report results to account and operations leads",
      ],
      suggestedClauseIds: ["cl_data_protection"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "role_video_editor",
      name: "Video Editor",
      department: "Creative",
      suggestedResponsibilities: [
        "Edit video assets to brand and campaign specifications",
        "Manage versions and delivery deadlines",
        "Protect unpublished creative work",
      ],
      suggestedClauseIds: ["cl_ip_ownership"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "role_ghl_executive",
      name: "GHL Executive",
      department: "Operations",
      suggestedResponsibilities: [
        "Configure and maintain GoHighLevel assets",
        "Support campaign operations and reporting",
        "Protect client funnels and contact data",
      ],
      suggestedClauseIds: ["cl_data_protection"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "role_account_manager",
      name: "Account Manager",
      department: "Client Success",
      suggestedResponsibilities: [
        "Own day-to-day client communication",
        "Coordinate delivery across media and operations",
        "Escalate risks and protect client relationships",
      ],
      suggestedClauseIds: ["cl_client_protection"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "role_coo",
      name: "Chief Operating Officer",
      department: "Operations",
      suggestedResponsibilities: [
        "Lead day-to-day operations and delivery quality",
        "Build process, hiring, and performance systems",
        "Protect Company and client interests at an executive level",
      ],
      suggestedClauseIds: [
        "cl_exec_responsibilities",
        "cl_confidentiality_executive",
        "cl_handover",
      ],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
  ];
}

function libraryDocumentTypes(): DocumentTypeRecord[] {
  return [
    { id: "dt_ea", code: "employment_standard", name: "Standard Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_standard", idPrefix: "EA" },
    { id: "dt_as", code: "employment_appointment_setter", name: "Appointment Setter Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_employment_appointment_setter", idPrefix: "AS" },
    { id: "dt_pr", code: "promotion_amended_employment", name: "Promotion & Amended Employment Agreement", family: "EMPLOYMENT", defaultTemplateId: "tpl_promotion_amended", idPrefix: "AMEND" },
    { id: "dt_sa", code: "service_agreement", name: "Service Agreement", family: "CLIENT", defaultTemplateId: "tpl_service_agreement", idPrefix: "SA" },
    { id: "dt_lg", code: "lead_generation_agreement", name: "Lead Generation Agreement", family: "CLIENT", defaultTemplateId: "tpl_lead_generation", idPrefix: "LG" },
    { id: "dt_col", code: "collaboration_agreement", name: "Collaboration Agreement", family: "CLIENT", defaultTemplateId: "tpl_collaboration", idPrefix: "COL" },
    { id: "dt_mkt", code: "marketing_agreement", name: "Media Buying Services Agreement", family: "CLIENT", defaultTemplateId: "tpl_media_buying", idPrefix: "MKT" },
    { id: "dt_nda", code: "nda", name: "NDA", family: "EMPLOYMENT", idPrefix: "NDA" },
  ];
}

function libraryDocumentPacks(): DocumentPack[] {
  return [
    {
      id: "pack_new_dev",
      name: "New Software Developer",
      description: "Employment agreement plus IP and confidentiality coverage.",
      templateIds: ["tpl_employment_standard"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "pack_new_setter",
      name: "New Appointment Setter",
      description: "Appointment setter employment pack.",
      templateIds: ["tpl_employment_appointment_setter"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "pack_new_contractor",
      name: "New Contractor",
      description: "Contractor-oriented employment family starting point.",
      templateIds: ["tpl_employment_standard"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
    {
      id: "pack_new_client",
      name: "New Client",
      description: "Lead generation, collaboration, or media buying depending on the engagement.",
      templateIds: ["tpl_lead_generation", "tpl_collaboration", "tpl_media_buying", "tpl_service_agreement"],
      createdAt: LIBRARY_CREATED_AT,
      updatedAt: LIBRARY_CREATED_AT,
    },
  ];
}

/** Production bootstrap: library + settings + one admin. No demo people, clients, or documents. */
export function buildBootstrapState(_orgId: string): OrgState {
  const { clauses, versions: clauseVersions } = seedClauses();
  const { templates, versions: templateVersions } = seedTemplates();
  const themes: DocumentTheme[] = AMPLIFY_DOCUMENT_THEMES.map((theme) => ({ ...theme }));
  const company: CompanySettings = { ...AMPLIFY_COMPANY };
  const month = new Date().toISOString().slice(0, 7);

  return {
    users: [bootstrapAdmin()],
    people: [...EMPLOYMENT_PEOPLE],
    companies: [...CLIENT_COMPANIES],
    templates,
    templateVersions,
    clauses,
    clauseVersions,
    documentTypes: libraryDocumentTypes(),
    documents: [],
    documentVersions: [],
    documentRelationships: [],
    signingRequests: [],
    signatureEvents: [],
    storedSignatures: [],
    auditEvents: [],
    sourceDocuments: [...CLIENT_SOURCE_DOCUMENTS, ...EMPLOYMENT_SOURCE_DOCUMENTS],
    knowledgeFindings: [...CLIENT_KNOWLEDGE_FINDINGS, ...EMPLOYMENT_KNOWLEDGE_FINDINGS],
    documentPacks: libraryDocumentPacks(),
    themes,
    roleProfiles: libraryRoleProfiles(),
    notifications: [],
    settings: {
      company,
      ai: {
        enabled: false,
        analyzeUploads: true,
        recommendTemplates: true,
        recommendClauses: true,
        recommendThemes: true,
        extractFields: true,
        compareDocuments: true,
        generateSummaries: true,
        dashboardInsights: true,
        draftNewClauses: false,
        monthlySpendingWarningUsd: 50,
        hardSpendingLimitUsd: 150,
      },
      aiUsage: {
        month,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        requests: 0,
      },
      signing: {
        defaultExpiryDays: 7,
        defaultOrder: "recipient_first",
        requireOtpForClientAgreements: true,
        allowDraftDownload: false,
      },
      email: {
        fromName: AMPLIFY_COMPANY.displayName,
        fromAddress: AMPLIFY_COMPANY.email,
        replyTo: AMPLIFY_COMPANY.email,
        notifyInternalOnSign: true,
        notifyRecipientOnComplete: true,
        sendReminders: true,
      },
      security: {
        sessionDays: 14,
        minPasswordLength: 8,
        requireMixedCase: true,
        requireDigit: true,
        requireSymbol: false,
      },
      sequences: {},
    },
  };
}

/** @deprecated Use buildBootstrapState */
export function buildSeedState(orgId: string): OrgState {
  return buildBootstrapState(orgId);
}
