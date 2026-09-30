import type { UserRole } from "@/lib/types";

export type Permission =
  | "people.read"
  | "people.read_sensitive"
  | "people.write"
  | "companies.read"
  | "companies.write"
  | "documents.read"
  | "documents.pdf"
  | "documents.create"
  | "documents.edit"
  | "documents.approve"
  | "documents.send"
  | "documents.void"
  | "documents.countersign"
  | "templates.read"
  | "templates.write"
  | "clauses.read"
  | "clauses.write"
  | "clauses.approve"
  | "knowledge.read"
  | "knowledge.write"
  | "knowledge.approve"
  | "packs.read"
  | "packs.write"
  | "audit.read"
  | "settings.read"
  | "settings.write"
  | "users.manage"
  | "ai.use"
  | "signing.manage";

const ALL: Permission[] = [
  "people.read",
  "people.read_sensitive",
  "people.write",
  "companies.read",
  "companies.write",
  "documents.read",
  "documents.pdf",
  "documents.create",
  "documents.edit",
  "documents.approve",
  "documents.send",
  "documents.void",
  "documents.countersign",
  "templates.read",
  "templates.write",
  "clauses.read",
  "clauses.write",
  "clauses.approve",
  "knowledge.read",
  "knowledge.write",
  "knowledge.approve",
  "packs.read",
  "packs.write",
  "audit.read",
  "settings.read",
  "settings.write",
  "users.manage",
  "ai.use",
  "signing.manage",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN_HR: [
    "people.read",
    "people.read_sensitive",
    "people.write",
    "companies.read",
    "companies.write",
    "documents.read",
    "documents.pdf",
    "documents.create",
    "documents.edit",
    "documents.approve",
    "documents.send",
    "documents.void",
    "documents.countersign",
    "templates.read",
    "clauses.read",
    "knowledge.read",
    "packs.read",
    "packs.write",
    "audit.read",
    "settings.read",
    "ai.use",
    "signing.manage",
  ],
  LEGAL_ADMIN: [
    "people.read",
    "companies.read",
    "documents.read",
    "documents.pdf",
    "templates.read",
    "templates.write",
    "clauses.read",
    "clauses.write",
    "clauses.approve",
    "knowledge.read",
    "knowledge.write",
    "knowledge.approve",
    "packs.read",
    "packs.write",
    "audit.read",
    "settings.read",
    "ai.use",
  ],
  MANAGER: [
    "people.read",
    "companies.read",
    "documents.read",
    "documents.pdf",
    "documents.create",
    "documents.edit",
    "documents.approve",
    "templates.read",
    "clauses.read",
    "packs.read",
    "audit.read",
  ],
  VIEWER: [
    "people.read",
    "companies.read",
    "documents.read",
    "templates.read",
    "clauses.read",
    "packs.read",
    "audit.read",
  ],
};

export function permissionsFor(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthzError(`Missing permission: ${permission}`);
  }
}

export class AuthzError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "AuthzError";
  }
}

export const SENSITIVE_PERSON_FIELDS = [
  "identityNumber",
  "dateOfBirth",
  "fatherName",
] as const;

/** Pay data is also restricted to roles with people.read_sensitive. */
export const PAY_PERSON_FIELDS = ["currentSalary"] as const;

export function canSeeSensitive(role: UserRole): boolean {
  return hasPermission(role, "people.read_sensitive");
}

export function redactPerson<T>(person: T, role: UserRole): T {
  if (canSeeSensitive(role)) return person;
  if (!person || typeof person !== "object") return person;
  const copy = { ...(person as object) } as Record<string, unknown>;
  for (const field of SENSITIVE_PERSON_FIELDS) {
    if (field in copy) copy[field] = "";
  }
  for (const field of PAY_PERSON_FIELDS) {
    if (field in copy) copy[field] = 0;
  }
  if ("residentialAddress" in copy) delete copy.residentialAddress;
  return copy as T;
}

/** Strip employee compensation from historical-agreement analysis for non-sensitive roles. */
export function redactSource<T extends { personId?: string; analysisJson?: Record<string, unknown> }>(
  source: T,
  role: UserRole,
): T {
  if (canSeeSensitive(role)) return source;
  const analysis = source.analysisJson;
  const isPersonSource =
    Boolean(source.personId) || typeof analysis?.personId === "string" || analysis?.family === "EMPLOYMENT";
  if (!isPersonSource || !analysis) return source;
  const { compensation: _c, monthlyFee: _m, salary: _s, ...rest } = analysis as Record<string, unknown>;
  return { ...source, analysisJson: rest };
}
