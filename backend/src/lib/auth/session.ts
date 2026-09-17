import { SignJWT, jwtVerify } from "jose";
import { DEFAULT_ORG_ID, sessionSecret } from "@/lib/config";
import { getStore } from "@/lib/data/store";
import { verifyPassword } from "@/lib/auth/password";
import { AuthzError, assertPermission, type Permission } from "@/lib/auth/permissions";
import type { OrgUser, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "contractos_session";

export type SessionUser = {
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
};

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
  assertPermission(session.role, permission);
  return session;
}

export async function loginWithPassword(email: string, password: string): Promise<SessionUser> {
  const store = await getStore(DEFAULT_ORG_ID);
  const users = await store.listDocs<OrgUser>("users");
  const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.active);
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  return {
    userId: user.id,
    orgId: DEFAULT_ORG_ID,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}
