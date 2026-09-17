import { hashPassword } from "@/lib/auth/password";
import type { OrgState } from "@/lib/seed/state";
import type { OrgUser } from "@/lib/types";

/** Fictional demo fixtures only — not records derived from real Amplify agreements. */
const DEMO_USER_IDS = new Set(["user_hr", "user_legal"]);
const DEMO_PERSON_IDS = new Set(["p_alex_rivera", "p_jordan_malik", "p_ahmed_khan"]);
const DEMO_COMPANY_IDS = new Set(["co_test_roofing"]);
const DEMO_DOCUMENT_IDS = new Set(["doc_alex_ea", "doc_alex_promo"]);
const DEMO_VERSION_IDS = new Set(["dv_alex_ea_v1", "dv_alex_promo_v1"]);
const DEMO_RELATIONSHIP_IDS = new Set(["rel_promo_amends_ea"]);
const DEMO_AUDIT_IDS = new Set(["aud_seed_ea", "aud_seed_promo"]);

function removeById<T extends { id: string }>(list: T[], banned: Set<string>): boolean {
  const next = list.filter((item) => !banned.has(item.id));
  if (next.length === list.length) return false;
  list.length = 0;
  list.push(...next);
  return true;
}

function makeBootstrapAdmin(): OrgUser {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
  const displayName = (process.env.BOOTSTRAP_ADMIN_NAME ?? "Workspace Admin").trim();
  const createdAt = new Date().toISOString();

  if (email && password && password.length >= 8) {
    return {
      id: "user_super_admin",
      email,
      displayName: displayName || "Workspace Admin",
      role: "SUPER_ADMIN",
      active: true,
      passwordHash: hashPassword(password),
      createdAt,
    };
  }

  return {
    id: "user_super_admin",
    email: "admin@localhost",
    displayName: "Local Admin",
    role: "SUPER_ADMIN",
    active: true,
    passwordHash: hashPassword("change-me-now"),
    createdAt,
  };
}

function removeDemoUsers(users: OrgState["users"]): boolean {
  const next = users.filter((user) => {
    if (DEMO_USER_IDS.has(user.id)) return false;
    if (user.email === "admin@amplify.test") return false;
    if (user.email === "hr@amplify.test") return false;
    if (user.email === "legal@amplify.test") return false;
    return true;
  });
  if (next.length === users.length) return false;
  users.length = 0;
  users.push(...next);
  return true;
}

function ensureAdminUser(users: OrgState["users"]): boolean {
  if (users.some((user) => user.active && user.role === "SUPER_ADMIN")) return false;
  users.push(makeBootstrapAdmin());
  return true;
}

/** Strip fictional demo people/clients/documents. Keep records from real historical agreements. */
export function purgeDemoFixtures(org: OrgState): boolean {
  let changed = false;
  changed = removeDemoUsers(org.users) || changed;
  changed = ensureAdminUser(org.users) || changed;
  changed = removeById(org.people, DEMO_PERSON_IDS) || changed;
  changed = removeById(org.companies, DEMO_COMPANY_IDS) || changed;
  changed = removeById(org.documents, DEMO_DOCUMENT_IDS) || changed;
  changed = removeById(org.documentVersions, DEMO_VERSION_IDS) || changed;
  changed = removeById(org.documentRelationships, DEMO_RELATIONSHIP_IDS) || changed;
  changed = removeById(org.auditEvents, DEMO_AUDIT_IDS) || changed;

  for (const doc of org.documents) {
    if (doc.sha256?.startsWith("seed-hash-")) {
      doc.sha256 = undefined;
      changed = true;
    }
  }

  const liveDocIds = new Set(org.documents.map((item) => item.id));
  const beforeVersions = org.documentVersions.length;
  org.documentVersions = org.documentVersions.filter((item) => liveDocIds.has(item.documentId));
  if (org.documentVersions.length !== beforeVersions) changed = true;

  const beforeRels = org.documentRelationships.length;
  org.documentRelationships = org.documentRelationships.filter(
    (item) => liveDocIds.has(item.fromDocumentId) && liveDocIds.has(item.toDocumentId),
  );
  if (org.documentRelationships.length !== beforeRels) changed = true;

  return changed;
}
