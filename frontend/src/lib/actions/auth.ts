"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiPost, ApiError, SESSION_COOKIE } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const data = await apiPost<{ token: string; user: SessionUser }>("/auth/login", {
      email,
      password,
    });
    await setSessionCookie(data.token);
  } catch (error) {
    if (error instanceof ApiError) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  redirect("/dashboard");
}

/** Workspace password login (bootstrap admin / invited password users). */
export async function loginWithPasswordAction(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const data = await apiPost<{ token: string; user: SessionUser }>("/auth/login", {
      email,
      password,
    });
    await setSessionCookie(data.token);
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Sign-in failed" };
  }
}

/** Exchange a Firebase ID token for an app session cookie. Caller navigates on success. */
export async function loginWithFirebaseAction(
  idToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const data = await apiPost<{ token: string; user: SessionUser }>("/auth/firebase", {
      idToken,
    });
    await setSessionCookie(data.token);
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      const hint =
        error.status >= 500
          ? "Backend unavailable — check API_URL and that the API deployment is healthy."
          : error.message;
      return { ok: false, error: hint };
    }
    return { ok: false, error: "Sign-in failed" };
  }
}

export async function logoutAction() {
  try {
    await apiPost("/auth/logout");
  } catch {
    /* ignore */
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
