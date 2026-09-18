import { z } from "zod";
import {
  AUDIT_EVENT_TYPES,
  BONUS_TYPES,
  CLAUSE_STATUSES,
  DOCUMENT_ACTIONS,
  DOCUMENT_FAMILIES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPE_CODES,
  EMPLOYMENT_STATUSES,
  KNOWLEDGE_DECISIONS,
  PARTY_TYPES,
  PERSON_TYPES,
  RELATIONSHIP_TYPES,
  RULE_ACTION_TYPES,
  RULE_COMBINATORS,
  RULE_OPERATORS,
  SALARY_FREQUENCIES,
  SHIFT_TYPES,
  SIGNATURE_EVENT_TYPES,
  SIGNATURE_METHODS,
  SIGNING_ORDERS,
  SOURCE_DOCUMENT_STATES,
  TEMPLATE_STATUSES,
  THEME_IDS,
  USER_ROLES,
  WORK_MODES,
} from "@/lib/types/enums";

export const isoDateSchema = z.string().datetime({ offset: true }).or(z.string().date());

export const timestampSchema = z.object({
  seconds: z.number().optional(),
  nanoseconds: z.number().optional(),
  iso: z.string(),
});

export const actorSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(USER_ROLES),
});

export const addressSchema = z.object({
  line1: z.string().default(""),
  line2: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  postalCode: z.string().default(""),
  country: z.string().default(""),
});

export const salarySchema = z.object({
  amount: z.number().nonnegative().default(0),
  currency: z.string().default("PKR"),
  frequency: z.enum(SALARY_FREQUENCIES).default("monthly"),
  paymentTiming: z.string().default("monthly in arrears"),
});

export const bonusSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(BONUS_TYPES).optional(),
  amount: z.number().nonnegative().optional(),
  percentage: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
});

export const commissionSchema = z.object({
  enabled: z.boolean().default(false),
  structure: z.string().default(""),
});

export const benefitsSchema = z.object({
  enabled: z.boolean().default(false),
  items: z.array(z.string()).default([]),
});

export const probationSchema = z.object({
  enabled: z.boolean().default(true),
  duration: z.number().int().positive().default(30),
  unit: z.enum(["days", "working_days", "months"]).default("days"),
  paid: z.boolean().default(true),
});

export const compensationSchema = z.object({
  salary: salarySchema,
  bonus: bonusSchema,
  commission: commissionSchema,
  benefits: benefitsSchema,
  salaryDeductionClause: z.object({ enabled: z.boolean().default(false) }).default({
    enabled: false,
  }),
});

export const workingScheduleSchema = z.object({
  workingDays: z.array(z.string()).default(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  shiftType: z.enum(SHIFT_TYPES).default("standard"),
  startTime: z.string().default("09:00"),
  endTime: z.string().default("18:00"),
  breakStart: z.string().default("13:00"),
  breakEnd: z.string().default("14:00"),
  timezone: z.string().default("Asia/Karachi"),
  workMode: z.enum(WORK_MODES).default("on_site"),
  flexibleSchedule: z.boolean().default(false),
  urgentAvailability: z.boolean().default(false),
});

const ruleGroupSchema: z.ZodType<RuleGroupInput> = z.lazy(() =>
  z.object({
    combinator: z.enum(RULE_COMBINATORS),
    conditions: z.array(z.union([ruleConditionSchema, ruleGroupSchema])),
  }),
);

export const ruleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(RULE_OPERATORS),
  value: z.unknown().optional(),
});

export type RuleGroupInput = {
  combinator: (typeof RULE_COMBINATORS)[number];
  conditions: Array<z.infer<typeof ruleConditionSchema> | RuleGroupInput>;
};

export const ruleActionSchema = z.object({
  type: z.enum(RULE_ACTION_TYPES),
  clauseId: z.string().optional(),
  sectionId: z.string().optional(),
  templateId: z.string().optional(),
  field: z.string().optional(),
  value: z.unknown().optional(),
});

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  when: ruleGroupSchema,
  then: z.array(ruleActionSchema),
});

export const orgUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(USER_ROLES),
  active: z.boolean().default(true),
  passwordHash: z.string().optional(),
  firebaseUid: z.string().optional(),
  authProvider: z.enum(["password", "google", "firebase"]).optional(),
  createdAt: z.string(),
  lastLoginAt: z.string().optional(),
});

export const personSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  middleName: z.string().default(""),
  lastName: z.string().min(1),
  fullLegalName: z.string().min(1),
  fatherName: z.string().default(""),
  identityNumber: z.string().default(""),
  dateOfBirth: z.string().default(""),
  email: z.string().email(),
  phone: z.string().default(""),
  residentialAddress: addressSchema.default({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  }),
  permanentAddress: addressSchema.default({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  }),
  city: z.string().default(""),
  province: z.string().default(""),
  country: z.string().default("Pakistan"),
  employeeId: z.string().default(""),
  type: z.enum(PERSON_TYPES).default("employee"),
  currentJobTitle: z.string().default(""),
  department: z.string().default(""),
  reportingManager: z.string().default(""),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).default("active"),
  employmentStartDate: z.string().default(""),
  currentSalary: z.number().nonnegative().default(0),
  salaryCurrency: z.string().default("PKR"),
  salaryFrequency: z.enum(SALARY_FREQUENCIES).default("monthly"),
  notes: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
});

export const companyRecordSchema = z.object({
  id: z.string(),
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  companyType: z.string().default("LLC"),
  primaryContact: z.string().default(""),
  contactTitle: z.string().default(""),
  email: z.string().email(),
  phone: z.string().default(""),
  website: z.string().default(""),
  billingAddress: addressSchema,
  businessAddress: addressSchema,
  city: z.string().default(""),
  state: z.string().default(""),
  postalCode: z.string().default(""),
  country: z.string().default("United States"),
  jurisdiction: z.string().default(""),
  relationshipStatus: z.enum(["prospect", "active", "paused", "churned"]).default("active"),
  notes: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
});

export const fieldDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum([
    "string",
    "number",
    "boolean",
    "date",
    "select",
    "multiselect",
    "textarea",
    "currency",
    "group",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  visibleWhen: ruleGroupSchema.optional(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
});

export const templateSectionSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  title: z.string(),
  required: z.boolean().default(true),
  optional: z.boolean().default(false),
  clauseIds: z.array(z.string()).default([]),
  includeWhen: ruleGroupSchema.optional(),
});

export const signatureConfigSchema = z.object({
  order: z.enum(SIGNING_ORDERS).default("recipient_first"),
  requireOtp: z.boolean().default(false),
  requireManagerApproval: z.boolean().default(false),
  allowDraftDownload: z.boolean().default(false),
  expiryDays: z.number().int().positive().default(7),
  reminderSchedule: z.array(z.enum(["24h", "3d", "7d"])).default(["24h", "3d"]),
});

export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(DOCUMENT_FAMILIES),
  documentType: z.enum(DOCUMENT_TYPE_CODES),
  description: z.string().default(""),
  currentVersionId: z.string(),
  currentVersion: z.number().int(),
  status: z.enum(TEMPLATE_STATUSES).default("active"),
  themeId: z.enum(THEME_IDS).default("amplify_modern_dark"),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  effectiveDate: z.string().optional(),
});

export const templateVersionSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  version: z.number().int().positive(),
  name: z.string(),
  status: z.enum(["draft", "approved", "archived"]).default("approved"),
  themeId: z.enum(THEME_IDS),
  requiredFields: z.array(fieldDefinitionSchema),
  optionalFields: z.array(fieldDefinitionSchema),
  sections: z.array(templateSectionSchema),
  rules: z.array(ruleSchema),
  signatureConfig: signatureConfigSchema,
  jurisdiction: z.string().default("Pakistan"),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.string(),
  effectiveDate: z.string(),
});

export const clauseSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string().default(""),
  currentVersionId: z.string(),
  currentVersion: z.number().int(),
  status: z.enum(CLAUSE_STATUSES).default("approved"),
  tags: z.array(z.string()).default([]),
  applicableDocumentTypes: z.array(z.enum(DOCUMENT_TYPE_CODES)).default([]),
  applicableRoles: z.array(z.string()).default([]),
  applicableJurisdictions: z.array(z.string()).default([]),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  effectiveDate: z.string().optional(),
});

export const clauseVersionSchema = z.object({
  id: z.string(),
  clauseId: z.string(),
  version: z.number().int().positive(),
  status: z.enum(["draft", "approved", "archived"]).default("approved"),
  legalText: z.string().min(1),
  conditions: ruleGroupSchema.optional(),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.string(),
  effectiveDate: z.string(),
  changeNotes: z.string().default(""),
});

export const roleProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string().default(""),
  suggestedResponsibilities: z.array(z.string()),
  suggestedClauseIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const documentTypeSchema = z.object({
  id: z.string(),
  code: z.enum(DOCUMENT_TYPE_CODES),
  name: z.string(),
  family: z.enum(DOCUMENT_FAMILIES),
  defaultTemplateId: z.string().optional(),
  idPrefix: z.string(),
});

export const documentRelationshipSchema = z.object({
  id: z.string(),
  fromDocumentId: z.string(),
  toDocumentId: z.string(),
  type: z.enum(RELATIONSHIP_TYPES),
  createdAt: z.string(),
  createdBy: z.string(),
});

export const personSnapshotSchema = personSchema.pick({
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  fullLegalName: true,
  email: true,
  phone: true,
  identityNumber: true,
  fatherName: true,
  residentialAddress: true,
  city: true,
  province: true,
  country: true,
  employeeId: true,
  type: true,
  currentJobTitle: true,
});

export const companySnapshotSchema = z.object({
  legalName: z.string(),
  displayName: z.string(),
  address: addressSchema,
  phone: z.string(),
  email: z.string(),
  website: z.string(),
  authorizedSignatory: z.string(),
  authorizedSignatoryTitle: z.string(),
  ntn: z.string().default(""),
  jurisdiction: z.string().default(""),
});

export const documentSnapshotSchema = z.object({
  resolvedVariables: z.record(z.string(), z.unknown()),
  personSnapshot: personSnapshotSchema.optional(),
  clientSnapshot: companyRecordSchema.partial().optional(),
  companySnapshot: companySnapshotSchema,
  templateId: z.string(),
  templateVersionId: z.string(),
  templateVersion: z.number(),
  clauseVersionIds: z.array(z.string()),
  includedSectionIds: z.array(z.string()),
  includedClauseIds: z.array(z.string()),
  renderedHtml: z.string(),
  jurisdiction: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
});

export const contractDocumentSchema = z.object({
  id: z.string(),
  readableId: z.string(),
  name: z.string(),
  documentType: z.enum(DOCUMENT_TYPE_CODES),
  family: z.enum(DOCUMENT_FAMILIES),
  status: z.enum(DOCUMENT_STATUSES),
  partyType: z.enum(PARTY_TYPES),
  personId: z.string().optional(),
  companyId: z.string().optional(),
  partyName: z.string(),
  templateId: z.string(),
  templateVersionId: z.string(),
  currentVersionId: z.string(),
  themeId: z.enum(THEME_IDS),
  action: z.enum(DOCUMENT_ACTIONS),
  relatedDocumentId: z.string().optional(),
  draftPdfPath: z.string().optional(),
  finalPdfPath: z.string().optional(),
  sha256: z.string().optional(),
  ownerId: z.string(),
  ownerName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastActivityAt: z.string(),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
  sentAt: z.string().optional(),
  signedAt: z.string().optional(),
  finalizedAt: z.string().optional(),
  voidedAt: z.string().optional(),
  voidReason: z.string().optional(),
  generationLock: z.string().optional(),
});

export const documentVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  version: z.number().int().positive(),
  status: z.enum(DOCUMENT_STATUSES),
  snapshot: documentSnapshotSchema,
  createdAt: z.string(),
  createdBy: z.string(),
});

export const signingRequestSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  tokenHash: z.string(),
  tokenHint: z.string(),
  token: z.string().optional(),
  recipientName: z.string(),
  recipientEmail: z.string().email(),
  status: z.enum([
    "pending",
    "viewed",
    "partially_signed",
    "completed",
    "expired",
    "revoked",
  ]),
  order: z.enum(SIGNING_ORDERS),
  requireOtp: z.boolean().default(false),
  otpHash: z.string().optional(),
  otpExpiresAt: z.string().optional(),
  otpVerifiedAt: z.string().optional(),
  expiresAt: z.string(),
  recipientSignedAt: z.string().optional(),
  companySignedAt: z.string().optional(),
  consentAcceptedAt: z.string().optional(),
  lastReminderAt: z.string().optional(),
  reminderCount: z.number().int().default(0),
  createdAt: z.string(),
  createdBy: z.string(),
});

export const signatureEventSchema = z.object({
  id: z.string(),
  signingRequestId: z.string(),
  documentId: z.string(),
  type: z.enum(SIGNATURE_EVENT_TYPES),
  timestamp: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  signerIdentity: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const storedSignatureSchema = z.object({
  id: z.string(),
  signingRequestId: z.string(),
  documentId: z.string(),
  signerRole: z.enum(["recipient", "company"]),
  signerName: z.string(),
  signerEmail: z.string(),
  method: z.enum(SIGNATURE_METHODS),
  imagePath: z.string(),
  typedText: z.string().optional(),
  signedAt: z.string(),
});

export const auditEventSchema = z.object({
  id: z.string(),
  type: z.enum(AUDIT_EVENT_TYPES),
  timestamp: z.string(),
  actorUserId: z.string().optional(),
  actorEmail: z.string().optional(),
  actorName: z.string().optional(),
  entityType: z.string(),
  entityId: z.string(),
  summary: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  ipAddress: z.string().optional(),
});

export const sourceDocumentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  storagePath: z.string(),
  uploadedAt: z.string(),
  uploadedBy: z.string(),
  analysisStatus: z.enum(SOURCE_DOCUMENT_STATES),
  knowledgeStatus: z.enum(["pending", "reviewed", "approved", "ignored"]).default("pending"),
  detectedType: z.string().optional(),
  analysisJson: z.record(z.string(), z.unknown()).optional(),
  analysisConfidence: z.number().min(0).max(1).optional(),
});

export const knowledgeFindingSchema = z.object({
  id: z.string(),
  sourceDocumentId: z.string().optional(),
  sourceDocumentIds: z.array(z.string()).default([]),
  title: z.string(),
  category: z.string(),
  occurrenceCount: z.number().int().default(1),
  sampleText: z.string().default(""),
  suggestedClauseId: z.string().optional(),
  decision: z.enum(KNOWLEDGE_DECISIONS).optional(),
  status: z.enum(["pending", "resolved"]).default("pending"),
  createdAt: z.string(),
});

export const documentPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  templateIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const themeSchema = z.object({
  id: z.enum(THEME_IDS),
  name: z.string(),
  logoPath: z.string().optional(),
  primaryColor: z.string(),
  accentColor: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
  background: z.enum(["dark", "light"]),
  margins: z.object({
    top: z.string(),
    right: z.string(),
    bottom: z.string(),
    left: z.string(),
  }),
  pageSize: z.enum(["A4", "Letter"]).default("A4"),
  showHeader: z.boolean().default(true),
  showFooter: z.boolean().default(true),
  showPageNumbers: z.boolean().default(true),
  contactFooter: z.boolean().default(true),
  signatureLayout: z.enum(["side_by_side", "stacked"]).default("side_by_side"),
});

export const companySettingsSchema = z.object({
  legalName: z.string(),
  displayName: z.string(),
  companyType: z.string().default("Private Limited"),
  registrationDetails: z.string().default(""),
  ntn: z.string().default(""),
  primaryAddress: addressSchema,
  secondaryAddress: addressSchema.optional(),
  phone: z.string(),
  usPhone: z.string().optional(),
  email: z.string().email(),
  website: z.string(),
  authorizedSignatory: z.string(),
  authorizedSignatoryTitle: z.string(),
  logoPath: z.string().optional(),
  signaturePath: z.string().optional(),
  sealPath: z.string().optional(),
  defaultThemeId: z.enum(THEME_IDS).default("amplify_modern_dark"),
  defaultJurisdiction: z.string().default("Pakistan"),
  defaultNoticePeriodDays: z.number().int().positive().default(30),
  defaultCurrency: z.string().default("PKR"),
  defaultProbationDays: z.number().int().positive().default(30),
  defaultWorkMode: z.enum(WORK_MODES).default("hybrid"),
  defaultPageSize: z.enum(["A4", "Letter"]).default("A4"),
});

export const aiSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  analyzeUploads: z.boolean().default(true),
  recommendTemplates: z.boolean().default(true),
  recommendClauses: z.boolean().default(true),
  recommendThemes: z.boolean().default(true),
  extractFields: z.boolean().default(true),
  compareDocuments: z.boolean().default(true),
  generateSummaries: z.boolean().default(true),
  dashboardInsights: z.boolean().default(true),
  draftNewClauses: z.boolean().default(false),
  monthlySpendingWarningUsd: z.number().nonnegative().default(50),
  hardSpendingLimitUsd: z.number().nonnegative().default(150),
});

export const aiUsageSchema = z.object({
  month: z.string(),
  inputTokens: z.number().int().default(0),
  outputTokens: z.number().int().default(0),
  estimatedCostUsd: z.number().default(0),
  requests: z.number().int().default(0),
});

export const signingSettingsSchema = z.object({
  defaultExpiryDays: z.number().int().positive().default(7),
  defaultOrder: z.enum(SIGNING_ORDERS).default("recipient_first"),
  requireOtpForClientAgreements: z.boolean().default(true),
  allowDraftDownload: z.boolean().default(false),
});

export const emailSettingsSchema = z.object({
  fromName: z.string().default("ContractOS"),
  fromAddress: z
    .string()
    .default("")
    .refine((value) => !value || value.includes("@"), "Enter a valid from address"),
  replyTo: z
    .string()
    .default("")
    .refine((value) => !value || value.includes("@"), "Enter a valid reply-to address"),
  notifyInternalOnSign: z.boolean().default(true),
  notifyRecipientOnComplete: z.boolean().default(true),
  sendReminders: z.boolean().default(true),
});

export const securitySettingsSchema = z.object({
  sessionDays: z.number().int().min(1).max(90).default(14),
  minPasswordLength: z.number().int().min(8).max(128).default(8),
  requireMixedCase: z.boolean().default(false),
  requireDigit: z.boolean().default(false),
  requireSymbol: z.boolean().default(false),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: z.string(),
  type: z.string(),
});

export const generateDocumentInputSchema = z.object({
  partyType: z.enum(PARTY_TYPES),
  personId: z.string().optional(),
  companyId: z.string().optional(),
  action: z.enum(DOCUMENT_ACTIONS),
  templateId: z.string(),
  relatedDocumentId: z.string().optional(),
  variables: z.record(z.string(), z.unknown()),
  enabledOptionalClauseIds: z.array(z.string()).default([]),
  disabledClauseIds: z.array(z.string()).default([]),
  themeId: z.enum(THEME_IDS).optional(),
});

export const employmentVariablesSchema = z.object({
  jobTitle: z.string().min(1),
  department: z.string().default(""),
  reportingManager: z.string().default(""),
  roleProfileId: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  startDate: z.string().min(1),
  compensation: compensationSchema,
  probation: probationSchema,
  workingSchedule: workingScheduleSchema,
  noticePeriodDays: z.number().int().positive().default(30),
  clientProtectionMonths: z.number().int().nonnegative().default(12),
  jurisdiction: z.string().default("Pakistan"),
  remoteWork: z.boolean().default(false),
});

export const serviceVariablesSchema = z.object({
  services: z.array(z.string()).default([]),
  serviceFee: z.number().nonnegative().default(0),
  feeCurrency: z.string().default("USD"),
  feeFrequency: z.enum(["monthly", "one_time", "quarterly"]).default("monthly"),
  termMonths: z.number().int().positive().default(12),
  adSpendPaidSeparately: z.boolean().default(true),
  noSalesGuarantee: z.boolean().default(true),
  clientOwnsLeads: z.boolean().default(true),
  startDate: z.string().min(1),
  jurisdiction: z.string().default("United States"),
});

export type OrgUser = z.infer<typeof orgUserSchema>;
export type Person = z.infer<typeof personSchema>;
export type CompanyRecord = z.infer<typeof companyRecordSchema>;

/** Client payload for creating a person (server assigns id + audit fields). */
export const createPersonSchema = personSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

/** Client payload for creating a company (server assigns id + audit fields). */
export const createCompanySchema = companyRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});
export type Address = z.infer<typeof addressSchema>;
export type Compensation = z.infer<typeof compensationSchema>;
export type WorkingSchedule = z.infer<typeof workingScheduleSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleAction = z.infer<typeof ruleActionSchema>;
export type RuleGroup = RuleGroupInput;
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateVersion = z.infer<typeof templateVersionSchema>;
export type Clause = z.infer<typeof clauseSchema>;
export type ClauseVersion = z.infer<typeof clauseVersionSchema>;
export type RoleProfile = z.infer<typeof roleProfileSchema>;
export type DocumentTypeRecord = z.infer<typeof documentTypeSchema>;
export type DocumentRelationship = z.infer<typeof documentRelationshipSchema>;
export type ContractDocument = z.infer<typeof contractDocumentSchema>;
export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type DocumentSnapshot = z.infer<typeof documentSnapshotSchema>;
export type SigningRequest = z.infer<typeof signingRequestSchema>;
export type SignatureEvent = z.infer<typeof signatureEventSchema>;
export type StoredSignature = z.infer<typeof storedSignatureSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type KnowledgeFinding = z.infer<typeof knowledgeFindingSchema>;
export type DocumentPack = z.infer<typeof documentPackSchema>;
export type DocumentTheme = z.infer<typeof themeSchema>;
export type CompanySettings = z.infer<typeof companySettingsSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiUsage = z.infer<typeof aiUsageSchema>;
export type SigningSettings = z.infer<typeof signingSettingsSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;
export type AppNotification = z.infer<typeof notificationSchema>;
export type GenerateDocumentInput = z.infer<typeof generateDocumentInputSchema>;
export type EmploymentVariables = z.infer<typeof employmentVariablesSchema>;
export type ServiceVariables = z.infer<typeof serviceVariablesSchema>;
export type SignatureConfig = z.infer<typeof signatureConfigSchema>;
export type PersonSnapshot = z.infer<typeof personSnapshotSchema>;
export type CompanySnapshot = z.infer<typeof companySnapshotSchema>;
