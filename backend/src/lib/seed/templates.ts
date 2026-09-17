import type { Rule, Template, TemplateSection, TemplateVersion } from "@/lib/types";

const actor = "user_super_admin";
const createdAt = "2026-01-15T09:00:00.000Z";

function section(
  id: string,
  order: number,
  title: string,
  clauseIds: string[],
  extra?: Partial<TemplateSection>,
): TemplateSection {
  return {
    id,
    order,
    title,
    required: extra?.required ?? true,
    optional: extra?.optional ?? false,
    clauseIds,
    includeWhen: extra?.includeWhen,
  };
}

const employmentFields = [
  { key: "jobTitle", label: "Role / job title", type: "string" as const, required: true },
  { key: "department", label: "Department", type: "string" as const, required: true },
  { key: "reportingManager", label: "Reporting manager", type: "string" as const, required: true },
  { key: "startDate", label: "Start date", type: "date" as const, required: true },
  { key: "compensation.salary.amount", label: "Salary amount", type: "currency" as const, required: true },
  { key: "compensation.salary.currency", label: "Currency", type: "string" as const, required: true },
  { key: "compensation.salary.frequency", label: "Salary frequency", type: "select" as const, required: true },
  { key: "noticePeriodDays", label: "Notice period (days)", type: "number" as const, required: true },
];

const optionalEmploymentFields = [
  { key: "compensation.bonus.enabled", label: "Bonus enabled", type: "boolean" as const, required: false },
  { key: "probation.enabled", label: "Probation enabled", type: "boolean" as const, required: false },
  { key: "remoteWork", label: "Remote work", type: "boolean" as const, required: false },
  { key: "clientProtectionMonths", label: "Client protection (months)", type: "number" as const, required: false },
];

const employmentRules: Rule[] = [
  {
    id: "rule_bonus_performance",
    name: "Include performance bonus clause",
    when: {
      combinator: "AND",
      conditions: [
        { field: "compensation.bonus.enabled", operator: "equals", value: true },
        { field: "compensation.bonus.type", operator: "equals", value: "performance" },
      ],
    },
    then: [{ type: "include_clause", clauseId: "cl_bonus_performance" }],
  },
  {
    id: "rule_bonus_fixed",
    name: "Include fixed bonus clause",
    when: {
      combinator: "AND",
      conditions: [
        { field: "compensation.bonus.enabled", operator: "equals", value: true },
        { field: "compensation.bonus.type", operator: "equals", value: "fixed" },
      ],
    },
    then: [{ type: "include_clause", clauseId: "cl_bonus_fixed" }],
  },
  {
    id: "rule_commission",
    name: "Include commission clause",
    when: {
      combinator: "OR",
      conditions: [
        { field: "compensation.commission.enabled", operator: "equals", value: true },
        { field: "compensation.bonus.type", operator: "equals", value: "commission" },
      ],
    },
    then: [{ type: "include_clause", clauseId: "cl_commission" }],
  },
  {
    id: "rule_no_probation",
    name: "Exclude probation when disabled",
    when: {
      combinator: "AND",
      conditions: [{ field: "probation.enabled", operator: "equals", value: false }],
    },
    then: [
      { type: "exclude_clause", clauseId: "cl_probation_paid" },
      { type: "include_clause", clauseId: "cl_no_probation" },
    ],
  },
  {
    id: "rule_remote",
    name: "Include remote work",
    when: {
      combinator: "OR",
      conditions: [
        { field: "remoteWork", operator: "equals", value: true },
        { field: "workingSchedule.workMode", operator: "equals", value: "remote" },
        { field: "workingSchedule.workMode", operator: "equals", value: "hybrid" },
      ],
    },
    then: [{ type: "include_clause", clauseId: "cl_remote_work" }],
  },
  {
    id: "rule_executive",
    name: "Executive protections",
    when: {
      combinator: "OR",
      conditions: [
        { field: "employeeLevel", operator: "equals", value: "executive" },
        { field: "jobTitle", operator: "contains", value: "Chief" },
        { field: "jobTitle", operator: "contains", value: "Director" },
        { field: "jobTitle", operator: "contains", value: "Manager" },
      ],
    },
    then: [
      { type: "include_clause", clauseId: "cl_exec_responsibilities" },
      { type: "include_clause", clauseId: "cl_confidentiality_executive" },
      { type: "include_clause", clauseId: "cl_handover" },
      { type: "include_clause", clauseId: "cl_client_protection_exec" },
    ],
  },
  {
    id: "rule_us_jurisdiction",
    name: "US jurisdiction clause",
    when: {
      combinator: "AND",
      conditions: [{ field: "jurisdiction", operator: "contains", value: "United" }],
    },
    then: [
      { type: "exclude_clause", clauseId: "cl_jurisdiction_pk" },
      { type: "include_clause", clauseId: "cl_jurisdiction_us" },
    ],
  },
];

function template(
  id: string,
  name: string,
  documentType: Template["documentType"],
  category: Template["category"],
  description: string,
  sections: TemplateSection[],
  rules: Rule[] = employmentRules,
): { template: Template; version: TemplateVersion } {
  const versionId = `tv_${id}_v1`;
  return {
    template: {
      id,
      name,
      category,
      documentType,
      description,
      currentVersionId: versionId,
      currentVersion: 1,
      status: "active",
      themeId: "amplify_modern_dark",
      createdBy: actor,
      approvedBy: actor,
      createdAt,
      updatedAt: createdAt,
      effectiveDate: "2026-01-15",
    },
    version: {
      id: versionId,
      templateId: id,
      version: 1,
      name: `${name} v1`,
      status: "approved",
      themeId: "amplify_modern_dark",
      requiredFields: category === "CLIENT" ? [
        { key: "startDate", label: "Start date", type: "date", required: true },
        { key: "serviceFee", label: "Service fee", type: "currency", required: true },
        { key: "feeCurrency", label: "Currency", type: "string", required: true },
        { key: "termMonths", label: "Term (months)", type: "number", required: true },
      ] : employmentFields,
      optionalFields: category === "CLIENT" ? [
        { key: "adSpendPaidSeparately", label: "Ad spend paid separately", type: "boolean", required: false },
        { key: "noSalesGuarantee", label: "No sales guarantee", type: "boolean", required: false },
        { key: "clientOwnsLeads", label: "Client owns leads", type: "boolean", required: false },
        { key: "inboundCalls", label: "Inbound call generation", type: "boolean", required: false },
      ] : optionalEmploymentFields,
      sections,
      rules,
      signatureConfig: {
        order: "recipient_first",
        requireOtp: category === "CLIENT",
        requireManagerApproval: documentType.includes("executive") || documentType.includes("promotion"),
        allowDraftDownload: true,
        expiryDays: 7,
        reminderSchedule: ["24h", "3d"],
      },
      jurisdiction: category === "CLIENT" ? "United States" : "Pakistan",
      createdBy: actor,
      approvedBy: actor,
      createdAt,
      effectiveDate: "2026-01-15",
    },
  };
}

const employmentSections: TemplateSection[] = [
  section("sec_parties", 1, "Parties", ["cl_parties"]),
  section("sec_employee", 2, "Employee Information", ["cl_employee_info"]),
  section("sec_position", 3, "Position", ["cl_position"]),
  section("sec_responsibilities", 4, "Responsibilities", ["cl_responsibilities", "cl_exec_responsibilities"]),
  section("sec_compensation", 5, "Compensation", [
    "cl_compensation_monthly",
    "cl_bonus_performance",
    "cl_bonus_fixed",
    "cl_commission",
  ]),
  section("sec_probation", 6, "Probation", ["cl_probation_paid", "cl_no_probation"]),
  section("sec_hours", 7, "Working Hours", ["cl_working_hours", "cl_remote_work"]),
  section("sec_confidentiality", 8, "Confidentiality", [
    "cl_confidentiality_standard",
    "cl_confidentiality_executive",
  ]),
  section("sec_data", 9, "Client Data Protection", ["cl_data_protection"]),
  section("sec_ip", 10, "Intellectual Property", ["cl_ip_ownership"]),
  section("sec_client_protection", 11, "Client Protection", [
    "cl_client_protection",
    "cl_client_protection_exec",
  ]),
  section("sec_conduct", 12, "Performance & Conduct", ["cl_performance"]),
  section("sec_termination", 13, "Termination", [
    "cl_termination_notice",
    "cl_immediate_termination",
    "cl_handover",
    "cl_return_property",
  ]),
  section("sec_jurisdiction", 14, "Jurisdiction", ["cl_jurisdiction_pk", "cl_jurisdiction_us"]),
  section("sec_entire", 15, "Entire Agreement", ["cl_entire_agreement"]),
];

const appointmentSections: TemplateSection[] = employmentSections.map((item) =>
  item.id === "sec_data"
    ? { ...item, clauseIds: ["cl_data_protection", "cl_no_guarantee"] }
    : item,
);

const promotionSections: TemplateSection[] = [
  section("sec_amendment", 1, "Amendment Recitals", ["cl_amendment_recitals"]),
  ...employmentSections.filter((item) => item.id !== "sec_parties"),
];

const clientRules: Rule[] = [
  {
    id: "rule_no_guarantee",
    name: "No sales guarantee",
    when: {
      combinator: "AND",
      conditions: [{ field: "noSalesGuarantee", operator: "equals", value: true }],
    },
    then: [{ type: "include_clause", clauseId: "cl_no_guarantee" }],
  },
  {
    id: "rule_ad_spend",
    name: "Ad spend separately",
    when: {
      combinator: "AND",
      conditions: [{ field: "adSpendPaidSeparately", operator: "equals", value: true }],
    },
    then: [{ type: "include_clause", clauseId: "cl_ad_spend" }],
  },
  {
    id: "rule_leads",
    name: "Client owns leads",
    when: {
      combinator: "AND",
      conditions: [{ field: "clientOwnsLeads", operator: "equals", value: true }],
    },
    then: [{ type: "include_clause", clauseId: "cl_lead_ownership" }],
  },
  {
    id: "rule_inbound_calls",
    name: "Inbound call generation",
    when: {
      combinator: "AND",
      conditions: [{ field: "inboundCalls", operator: "equals", value: true }],
    },
    then: [{ type: "include_clause", clauseId: "cl_inbound_calls" }],
  },
];

const serviceSections: TemplateSection[] = [
  section("sec_c_parties", 1, "Parties", ["cl_client_parties"]),
  section("sec_c_services", 2, "Services", ["cl_services_scope"]),
  section("sec_c_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
  section("sec_c_term", 4, "Term", ["cl_fixed_term_service"]),
  section("sec_c_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
  section("sec_c_conf", 6, "Confidentiality", ["cl_confidentiality_standard"]),
  section("sec_c_jurisdiction", 7, "Jurisdiction", ["cl_jurisdiction_us"]),
  section("sec_c_entire", 8, "Entire Agreement", ["cl_entire_agreement"]),
];

const leadSections: TemplateSection[] = [
  section("sec_lg_parties", 1, "Parties", ["cl_client_parties"]),
  section("sec_lg_services", 2, "Services", ["cl_services_scope", "cl_optimization_period", "cl_additional_verticals", "cl_inbound_calls"]),
  section("sec_lg_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
  section("sec_lg_term", 4, "Term", ["cl_fixed_term_service"]),
  section("sec_lg_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
  section("sec_lg_leads", 6, "Lead Ownership", ["cl_lead_ownership"]),
  section("sec_lg_conf", 7, "Confidentiality", ["cl_confidentiality_standard"]),
  section("sec_lg_jurisdiction", 8, "Jurisdiction", ["cl_jurisdiction_us"]),
  section("sec_lg_entire", 9, "Entire Agreement", ["cl_entire_agreement"]),
];

const collaborationSections: TemplateSection[] = [
  section("sec_col_parties", 1, "Parties", ["cl_client_parties"]),
  section("sec_col_services", 2, "Collaboration", ["cl_collaboration_scope", "cl_optimization_period", "cl_additional_verticals", "cl_inbound_calls"]),
  section("sec_col_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
  section("sec_col_term", 4, "Term", ["cl_fixed_term_service"]),
  section("sec_col_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
  section("sec_col_leads", 6, "Lead Ownership", ["cl_lead_ownership"]),
  section("sec_col_conf", 7, "Confidentiality", ["cl_confidentiality_standard"]),
  section("sec_col_jurisdiction", 8, "Jurisdiction", ["cl_jurisdiction_us"]),
  section("sec_col_entire", 9, "Entire Agreement", ["cl_entire_agreement"]),
];

const mediaBuyingSections: TemplateSection[] = [
  section("sec_mkt_parties", 1, "Parties", ["cl_client_parties"]),
  section("sec_mkt_services", 2, "Media Buying", ["cl_media_buying_scope", "cl_optimization_period", "cl_additional_verticals"]),
  section("sec_mkt_fees", 3, "Fees", ["cl_monthly_retainer", "cl_ad_spend"]),
  section("sec_mkt_term", 4, "Term", ["cl_fixed_term_service"]),
  section("sec_mkt_guarantee", 5, "No Guarantee", ["cl_no_guarantee"]),
  section("sec_mkt_conf", 6, "Confidentiality", ["cl_confidentiality_standard"]),
  section("sec_mkt_jurisdiction", 7, "Jurisdiction", ["cl_jurisdiction_us"]),
  section("sec_mkt_entire", 8, "Entire Agreement", ["cl_entire_agreement"]),
];

export function seedTemplates(): { templates: Template[]; versions: TemplateVersion[] } {
  const items = [
    template(
      "tpl_employment_standard",
      "Standard Employment Agreement",
      "employment_standard",
      "EMPLOYMENT",
      "Approved standard employment agreement for Amplify staff.",
      employmentSections,
    ),
    template(
      "tpl_employment_appointment_setter",
      "Appointment Setter Employment Agreement",
      "employment_appointment_setter",
      "EMPLOYMENT",
      "Employment agreement for appointment setters, including client data protections.",
      appointmentSections,
    ),
    template(
      "tpl_promotion_amended",
      "Promotion & Amended Employment Agreement",
      "promotion_amended_employment",
      "EMPLOYMENT",
      "Amends an existing employment agreement for promotion or material role change.",
      promotionSections,
    ),
    template(
      "tpl_service_agreement",
      "Service Agreement",
      "service_agreement",
      "CLIENT",
      "Standard client service agreement.",
      serviceSections,
      clientRules,
    ),
    template(
      "tpl_lead_generation",
      "Lead Generation Agreement",
      "lead_generation_agreement",
      "CLIENT",
      "Client agreement for lead generation, ad spend, and lead ownership.",
      leadSections,
      clientRules,
    ),
    template(
      "tpl_collaboration",
      "Collaboration Agreement",
      "collaboration_agreement",
      "CLIENT",
      "Performance-marketing collaboration for inbound calls, leads, and shared campaign method.",
      collaborationSections,
      clientRules,
    ),
    template(
      "tpl_media_buying",
      "Media Buying Services Agreement",
      "marketing_agreement",
      "CLIENT",
      "Paid media buying, landing pages, tracking, pacing, and reporting.",
      mediaBuyingSections,
      clientRules,
    ),
  ];
  return {
    templates: items.map((item) => item.template),
    versions: items.map((item) => item.version),
  };
}
