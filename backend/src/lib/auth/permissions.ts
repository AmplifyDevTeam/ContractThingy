import type { UserRole } from "@/lib/types";

export type Permission =
  | "people.read"
  | "people.read_sensitive"
  | "people.write"
  | "companies.read"
  | "companies.write"
  | "documents.read"
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

export function redactPerson<T>(person: T, role: UserRole): T {
  if (hasPermission(role, "people.read_sensitive")) return person;
  const copy = { ...(person as object) } as T;
  for (const field of SENSITIVE_PERSON_FIELDS) {
    if (typeof copy === "object" && copy && field in copy) {
      (copy as Record<string, unknown>)[field] = "";
    }
  }
  return copy;
}
