export type MergeField = {
  key: string;
  label: string;
  group: string;
};

/** Human labels for tokens that appear in library wording. */
export const MERGE_FIELDS: MergeField[] = [
  { key: "company.legalName", label: "Company legal name", group: "Company" },
  { key: "company.address", label: "Company address", group: "Company" },
  { key: "person.fullLegalName", label: "Employee full name", group: "Employee" },
  { key: "person.email", label: "Employee email", group: "Employee" },
  { key: "person.phone", label: "Employee phone", group: "Employee" },
  { key: "person.employeeId", label: "Employee ID", group: "Employee" },
  { key: "address.full", label: "Employee address", group: "Employee" },
  { key: "jobTitle", label: "Job title", group: "Role" },
  { key: "department", label: "Department", group: "Role" },
  { key: "reportingManager", label: "Reporting manager", group: "Role" },
  { key: "startDate", label: "Start date", group: "Role" },
  { key: "responsibilities.list", label: "Responsibilities list", group: "Role" },
  { key: "compensation.display", label: "Salary (display)", group: "Pay" },
  { key: "compensation.salary.currency", label: "Salary currency", group: "Pay" },
  { key: "compensation.salary.paymentTiming", label: "Pay timing", group: "Pay" },
  { key: "compensation.bonus.amount", label: "Bonus amount", group: "Pay" },
  { key: "compensation.bonus.description", label: "Bonus description", group: "Pay" },
  { key: "compensation.commission.structure", label: "Commission structure", group: "Pay" },
  { key: "noticePeriodDays", label: "Notice period (days)", group: "Terms" },
  { key: "probation.duration", label: "Probation duration", group: "Terms" },
  { key: "probation.unit", label: "Probation unit", group: "Terms" },
  { key: "clientProtectionMonths", label: "Client protection (months)", group: "Terms" },
  { key: "schedule.summary", label: "Schedule summary", group: "Schedule" },
  { key: "schedule.days", label: "Work days", group: "Schedule" },
  { key: "schedule.hours", label: "Work hours", group: "Schedule" },
  { key: "schedule.mode", label: "Work mode", group: "Schedule" },
  { key: "workingSchedule.timezone", label: "Timezone", group: "Schedule" },
  { key: "client.legalName", label: "Client legal name", group: "Client" },
  { key: "client.primaryContact", label: "Client contact", group: "Client" },
  { key: "client.email", label: "Client email", group: "Client" },
  { key: "serviceFee", label: "Service fee", group: "Client" },
  { key: "feeCurrency", label: "Fee currency", group: "Client" },
  { key: "termMonths", label: "Term (months)", group: "Client" },
];

const byKey = new Map(MERGE_FIELDS.map((field) => [field.key, field]));
const byLabel = new Map(MERGE_FIELDS.map((field) => [field.label.toLowerCase(), field]));

export function mergeToken(key: string): string {
  return `{{${key}}}`;
}

/** Editor-facing chip: [[Employee full name]] */
export function mergeChip(label: string): string {
  return `[[${label}]]`;
}

export function labelForMergeKey(key: string): string {
  return byKey.get(key)?.label ?? key.replaceAll(".", " › ");
}

export function keyForMergeLabel(label: string): string | null {
  return byLabel.get(label.trim().toLowerCase())?.key ?? null;
}

export function tokensToChips(text: string): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    return mergeChip(labelForMergeKey(key));
  });
}

export function chipsToTokens(text: string): string {
  return text.replace(/\[\[\s*([^\]]+?)\s*\]\]/g, (match, label: string) => {
    const key = keyForMergeLabel(label);
    return key ? mergeToken(key) : match;
  });
}

export function groupMergeFields(fields: MergeField[] = MERGE_FIELDS) {
  const groups = new Map<string, MergeField[]>();
  for (const field of fields) {
    const list = groups.get(field.group) ?? [];
    list.push(field);
    groups.set(field.group, list);
  }
  return [...groups.entries()];
}
