export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_HR",
  "LEGAL_ADMIN",
  "MANAGER",
  "VIEWER",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PERSON_TYPES = [
  "employee",
  "contractor",
  "intern",
  "consultant",
  "other",
] as const;
export type PersonType = (typeof PERSON_TYPES)[number];

export const EMPLOYMENT_STATUSES = [
  "active",
  "probation",
  "on_leave",
  "terminated",
  "resigned",
  "offer_pending",
] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const PARTY_TYPES = [
  "employee",
  "contractor",
  "intern",
  "client",
  "company",
  "other",
] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const DOCUMENT_FAMILIES = ["EMPLOYMENT", "CLIENT", "OTHER"] as const;
export type DocumentFamily = (typeof DOCUMENT_FAMILIES)[number];

export const DOCUMENT_TYPE_CODES = [
  "employment_standard",
  "employment_appointment_setter",
  "employment_executive",
  "internship_agreement",
  "contractor_agreement",
  "promotion_agreement",
  "promotion_amended_employment",
  "employment_amendment",
  "salary_amendment",
  "offer_letter",
  "termination_letter",
  "experience_letter",
  "nda",
  "confidentiality_agreement",
  "ip_agreement",
  "remote_work_agreement",
  "service_agreement",
  "collaboration_agreement",
  "lead_generation_agreement",
  "marketing_agreement",
  "statement_of_work",
  "renewal_agreement",
  "pricing_amendment",
  "service_amendment",
  "custom_agreement",
] as const;
export type DocumentTypeCode = (typeof DOCUMENT_TYPE_CODES)[number];

export const DOCUMENT_STATUSES = [
  "DRAFT",
  "CONFIGURING",
  "REVIEW_REQUIRED",
  "APPROVED",
  "READY_TO_SEND",
  "SENT",
  "VIEWED",
  "PARTIALLY_SIGNED",
  "SIGNED",
  "FINALIZED",
  "VOIDED",
  "EXPIRED",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CLAUSE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "optional",
  "role_specific",
  "legacy",
  "archived",
] as const;
export type ClauseStatus = (typeof CLAUSE_STATUSES)[number];

export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const RELATIONSHIP_TYPES = [
  "amends",
  "supersedes",
  "supplements",
  "renews",
  "replaces",
  "terminates",
  "references",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const SOURCE_DOCUMENT_STATES = [
  "UPLOADED",
  "PROCESSING",
  "ANALYZED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type SourceDocumentState = (typeof SOURCE_DOCUMENT_STATES)[number];

export const KNOWLEDGE_DECISIONS = [
  "approve_standard",
  "approve_optional",
  "role_specific",
  "executive_only",
  "legacy_only",
  "ignore",
] as const;
export type KnowledgeDecision = (typeof KNOWLEDGE_DECISIONS)[number];

export const SIGNING_ORDERS = [
  "recipient_first",
  "company_first",
  "parallel",
] as const;
export type SigningOrder = (typeof SIGNING_ORDERS)[number];

export const SIGNATURE_METHODS = ["draw", "type"] as const;
export type SignatureMethod = (typeof SIGNATURE_METHODS)[number];

export const SIGNATURE_EVENT_TYPES = [
  "document_sent",
  "email_delivered",
  "document_opened",
  "document_viewed",
  "consent_accepted",
  "otp_verified",
  "signature_started",
  "signature_completed",
  "company_signed",
  "document_finalized",
  "pdf_downloaded",
  "link_revoked",
  "link_extended",
  "reminder_sent",
] as const;
export type SignatureEventType = (typeof SIGNATURE_EVENT_TYPES)[number];

export const AUDIT_EVENT_TYPES = [
  "DOCUMENT_CREATED",
  "DOCUMENT_EDITED",
  "DOCUMENT_GENERATED",
  "DOCUMENT_APPROVED",
  "DOCUMENT_SENT",
  "DOCUMENT_OPENED",
  "DOCUMENT_SIGNED",
  "DOCUMENT_COUNTERSIGNED",
  "DOCUMENT_FINALIZED",
  "DOCUMENT_DOWNLOADED",
  "DOCUMENT_VOIDED",
  "TEMPLATE_CREATED",
  "TEMPLATE_UPDATED",
  "TEMPLATE_VERSIONED",
  "CLAUSE_CREATED",
  "CLAUSE_APPROVED",
  "CLAUSE_VERSIONED",
  "SOURCE_DOCUMENT_UPLOADED",
  "SOURCE_DOCUMENT_ANALYZED",
  "KNOWLEDGE_APPROVED",
  "PERSON_CREATED",
  "PERSON_UPDATED",
  "COMPANY_CREATED",
  "COMPANY_UPDATED",
  "SETTINGS_UPDATED",
  "USER_INVITED",
  "USER_ROLE_CHANGED",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const RULE_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "contains",
  "not_contains",
  "exists",
  "not_exists",
  "in",
  "not_in",
] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_COMBINATORS = ["AND", "OR"] as const;
export type RuleCombinator = (typeof RULE_COMBINATORS)[number];

export const RULE_ACTION_TYPES = [
  "include_clause",
  "exclude_clause",
  "include_section",
  "exclude_section",
  "recommend_template",
  "recommend_clause",
  "set_field",
] as const;
export type RuleActionType = (typeof RULE_ACTION_TYPES)[number];

export const SALARY_FREQUENCIES = [
  "hourly",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "annual",
] as const;
export type SalaryFrequency = (typeof SALARY_FREQUENCIES)[number];

export const BONUS_TYPES = [
  "fixed",
  "performance",
  "percentage",
  "commission",
  "custom",
] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

export const WORK_MODES = ["on_site", "remote", "hybrid", "flexible"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const SHIFT_TYPES = [
  "standard",
  "evening",
  "night",
  "rotating",
  "flexible",
] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const THEME_IDS = [
  "amplify_classic_white",
  "amplify_modern_dark",
  "amplify_harbor_night",
  "amplify_ember_brief",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DOCUMENT_ACTIONS = [
  "hire",
  "promote",
  "change_salary",
  "amend_agreement",
  "generate_nda",
  "terminate",
  "new_lead_generation",
  "new_collaboration",
  "new_media_buying",
  "new_service_agreement",
  "renew",
  "amend_services",
  "change_pricing",
  "custom",
] as const;
export type DocumentAction = (typeof DOCUMENT_ACTIONS)[number];

export const DOCUMENT_ID_PREFIXES: Record<string, string> = {
  employment_standard: "EA",
  employment_appointment_setter: "AS",
  employment_executive: "EX",
  internship_agreement: "IN",
  contractor_agreement: "CA",
  promotion_agreement: "PR",
  promotion_amended_employment: "AMEND",
  employment_amendment: "AMEND",
  salary_amendment: "SAL",
  offer_letter: "OL",
  termination_letter: "TL",
  experience_letter: "EL",
  nda: "NDA",
  confidentiality_agreement: "CONF",
  ip_agreement: "IP",
  remote_work_agreement: "RW",
  service_agreement: "SA",
  collaboration_agreement: "COL",
  lead_generation_agreement: "LG",
  marketing_agreement: "MKT",
  statement_of_work: "SOW",
  renewal_agreement: "REN",
  pricing_amendment: "PA",
  service_amendment: "SAM",
  custom_agreement: "CUS",
};
