import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "contractos_session";

export type SessionUser = {
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: import("@/lib/types").UserRole;
};

function apiBase() {
  const configured = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  // Misconfigured production backend still has FIREBASE_PROJECT_ID=contractos.
  // Route that host to the corrected API until the old Vercel project env is fixed.
  if (!configured || configured.includes("contract-thingy-backend.vercel.app")) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      return "https://amplify-contractos-api.vercel.app";
    }
  }
  return configured || "http://localhost:4000";
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
