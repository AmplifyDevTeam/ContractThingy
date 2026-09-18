import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiGet, SESSION_COOKIE, type SessionUser } from "@/lib/api";
import { AuthzError, assertPermission, type Permission } from "@/lib/auth/permissions";

export type { SessionUser };
export { SESSION_COOKIE };

function decodeSessionJwt(token: string): SessionUser | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part, "base64url").toString("utf8");
    const payload = JSON.parse(json) as Partial<SessionUser> & { exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (!payload.userId || !payload.email || !payload.role) return null;
    return {
      userId: payload.userId,
      orgId: payload.orgId || "amplify-media-technologies",
      email: payload.email,
      displayName: payload.displayName || payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/** Fast shell auth from the JWT cookie (no API round-trip). */
export async function getSessionFromCookie(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSessionJwt(token);
}

/** Fresh session from API (role hydration). Deduped per RSC request. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)?.value) return null;
  try {
    const data = await apiGet<{ user: SessionUser }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
});

export async function requireSession(): Promise<SessionUser> {
  // Cookie decode only — no /auth/me round-trip on every RSC navigation.
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  // Fresh role from API (hydrateSession) so promotions apply; also refreshes the JWT cookie.
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    assertPermission(session.role, permission);
  } catch (error) {
    if (error instanceof AuthzError) redirect("/dashboard");
    throw error;
  }
  return session;
}
