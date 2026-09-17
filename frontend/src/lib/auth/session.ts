import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiGet, SESSION_COOKIE, type SessionUser } from "@/lib/api";
import { AuthzError, assertPermission, type Permission } from "@/lib/auth/permissions";

export type { SessionUser };
export { SESSION_COOKIE };

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)?.value) return null;
  try {
    const data = await apiGet<{ user: SessionUser }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const session = await requireSession();
  try {
    assertPermission(session.role, permission);
  } catch (error) {
    if (error instanceof AuthzError) redirect("/dashboard");
    throw error;
  }
  return session;
}
