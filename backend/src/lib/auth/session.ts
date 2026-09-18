import { SignJWT, jwtVerify } from "jose";
import {
  DEFAULT_ORG_ID,
  authAllowedDomains,
  authDefaultRole,
  authOpenSignup,
  isFirebaseConfigured,
  passwordLoginEnabled,
  sessionSecret,
} from "@/lib/config";
import { getStore } from "@/lib/data/store";
import { verifyPassword } from "@/lib/auth/password";
import { AuthzError, assertPermission, type Permission } from "@/lib/auth/permissions";
import { adminAuth } from "@/lib/firebase/admin";
import { newId, nowIso } from "@/lib/ids";
import type { OrgUser, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "contractos_session";

export type SessionUser = {
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
};

function peekJwtAudience(idToken: string): string | null {
  try {
    const part = idToken.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { aud?: string };
    return typeof payload.aud === "string" ? payload.aud : null;
  } catch {
    return null;
  }
}

function secretKey() {
  return new TextEncoder().encode(sessionSecret());
}

export async function createSessionToken(
  user: SessionUser,
  options?: { sessionDays?: number },
): Promise<string> {
  const days = Math.min(90, Math.max(1, options?.sessionDays ?? 14));
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export function sessionFromAuthHeader(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requirePermissionFromToken(
  token: string | null | undefined,
  permission: Permission,
): Promise<SessionUser> {
  if (!token) throw new AuthzError("Authentication required");
  const session = await readSessionToken(token);
  if (!session) throw new AuthzError("Authentication required");
  const fresh = await hydrateSession(session);
  if (!fresh) throw new AuthzError("Authentication required");
  assertPermission(fresh.role, permission);
  return fresh;
}

/** Reload role/name from the store so promotions apply without re-login. */
export async function hydrateSession(session: SessionUser): Promise<SessionUser | null> {
  const store = await getStore(session.orgId || DEFAULT_ORG_ID);
  const user = await store.getDoc<OrgUser>("users", session.userId);
  if (!user?.active) return null;
  return toSession(user);
}

function toSession(user: OrgUser): SessionUser {
  return {
    userId: user.id,
    orgId: DEFAULT_ORG_ID,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function loginWithPassword(email: string, password: string): Promise<SessionUser> {
  if (!passwordLoginEnabled()) {
    throw new Error("Password login is disabled");
  }
  const store = await getStore(DEFAULT_ORG_ID);
  const users = await store.listDocs<OrgUser>("users");
  const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.active);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  const next: OrgUser = { ...user, lastLoginAt: nowIso() };
  await store.setDoc("users", next);
  return toSession(next);
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function canSelfSignup(email: string, existingCount: number): boolean {
  if (existingCount === 0) return true;
  if (authOpenSignup()) return true;
  const domains = authAllowedDomains();
  if (domains.length === 0) return false;
  return domains.includes(emailDomain(email));
}

/** Verify Firebase ID token (Google or email/password), upsert org user, return app session. */
export async function loginWithFirebaseIdToken(idToken: string): Promise<SessionUser> {
  if (!idToken.trim()) throw new Error("Missing Firebase ID token");

  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase Admin is not configured on the API. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  const tokenAud = peekJwtAudience(idToken);
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (tokenAud && projectId && tokenAud !== projectId) {
    throw new Error(
      `Firebase project mismatch: token is for "${tokenAud}" but API has FIREBASE_PROJECT_ID="${projectId}".`,
    );
  }

  let decoded: {
    uid: string;
    email?: string;
    name?: string;
    firebase?: { sign_in_provider?: string };
  };
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error("[auth/firebase] verifyIdToken failed:", err instanceof Error ? err.message : err);
    throw new Error("Invalid or expired Firebase session. Try signing in again.");
  }

  const email = (decoded.email ?? "").trim().toLowerCase();
  if (!email) throw new Error("Your Google account has no email address.");

  const store = await getStore(DEFAULT_ORG_ID);
  const users = await store.listDocs<OrgUser>("users");
  const byUid = users.find((item) => item.firebaseUid === decoded.uid);
  const byEmail = users.find((item) => item.email.toLowerCase() === email);
  let user = byUid ?? byEmail;

  const provider =
    decoded.firebase?.sign_in_provider === "google.com" ? ("google" as const) : ("firebase" as const);
  const displayName = (decoded.name ?? "").trim() || email.split("@")[0] || "Workspace user";

  if (!user) {
    if (!canSelfSignup(email, users.length)) {
      throw new Error(
        "No workspace account for this email. Ask an admin to invite you, or use an allowed company domain.",
      );
    }
    // Bootstrap password admin alone shouldn't block the first real Firebase user from owning the workspace.
    const hasFirebaseUser = users.some((item) => Boolean(item.firebaseUid));
    const role =
      users.length === 0 || !hasFirebaseUser ? ("SUPER_ADMIN" as const) : authDefaultRole();
    user = {
      id: newId("user"),
      email,
      displayName,
      role,
      active: true,
      firebaseUid: decoded.uid,
      authProvider: provider,
      createdAt: nowIso(),
      lastLoginAt: nowIso(),
    };
  } else {
    if (!user.active) throw new Error("This account is disabled. Contact an admin.");
    user = {
      ...user,
      firebaseUid: decoded.uid,
      authProvider: provider,
      displayName: user.displayName || displayName,
      lastLoginAt: nowIso(),
    };
  }

  await store.setDoc("users", user);
  return toSession(user);
}
