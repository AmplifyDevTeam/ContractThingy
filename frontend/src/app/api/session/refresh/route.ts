import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/api";
import { apiBase } from "@/lib/api-base";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/api/session")) return "/dashboard";
  return raw;
}

/** Re-mint the session cookie from the API (picks up role changes without a re-login). */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  const res = await fetch(`${apiBase()}/auth/me?remint=1`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) {
    const out = NextResponse.redirect(new URL("/login", request.url));
    out.cookies.delete(SESSION_COOKIE);
    return out;
  }
  const data = (await res.json().catch(() => null)) as { token?: string; maxAge?: number } | null;
  const out = NextResponse.redirect(new URL(next, request.url));
  if (data?.token) {
    out.cookies.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: data.maxAge ?? 14 * 24 * 60 * 60,
    });
  }
  return out;
}
