import { cookies, headers as requestHeaders } from "next/headers";
import { apiBase } from "@/lib/api-base";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "contractos_session";

export type SessionUser = {
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: import("@/lib/types").UserRole;
};

/**
 * Server actions call the API from the Vercel server, so the API would otherwise log the
 * frontend's IP for signers. Forward the real client IP/UA, authenticated by a shared secret.
 */
async function forwardClientIdentity(headers: Headers) {
  const secret = process.env.PROXY_SHARED_SECRET?.trim();
  if (!secret) return;
  try {
    const incoming = await requestHeaders();
    const ip =
      incoming.get("x-real-ip") ||
      incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    if (ip) headers.set("x-client-ip", ip);
    const ua = incoming.get("user-agent");
    if (ua) headers.set("x-client-ua", ua);
    headers.set("x-proxy-secret", secret);
  } catch {
    // headers() is unavailable outside a request scope.
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { raw?: boolean },
): Promise<T> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Cookie", `${SESSION_COOKIE}=${token}`);
  }
  const frontendHost = process.env.APP_URL?.replace(/^https?:\/\//, "") || "localhost:3000";
  headers.set("x-frontend-host", frontendHost);
  await forwardClientIdentity(headers);

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    if (!path.startsWith("/auth/")) redirect("/login");
    throw new ApiError(401, "Authentication required");
  }

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      if (res.status === 404) {
        message = "API not found — check API_URL points at the backend deployment";
      }
    }
    throw new ApiError(res.status, message);
  }

  if (init?.raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return (await res.json()) as T;
  return res as unknown as T;
}

export async function apiGet<T>(path: string) {
  return apiFetch<T>(path);
}

export async function apiPost<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export async function apiPatch<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
}

export async function apiPut<T>(path: string, body?: unknown) {
  return apiFetch<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });
}
