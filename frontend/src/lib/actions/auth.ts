"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiPost, ApiError, SESSION_COOKIE } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const data = await apiPost<{ token: string; user: SessionUser }>("/auth/login", {
      email,
      password,
    });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
    });
  } catch (error) {
    if (error instanceof ApiError) redirect("/login?error=1");
    throw error;
  }
  redirect("/dashboard");
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
