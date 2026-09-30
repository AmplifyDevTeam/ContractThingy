/**
 * Backend API origin for server-side calls.
 * Legacy guard: an old Vercel project (contract-thingy-backend) points at the wrong Firebase
 * project, so it is rerouted to the current API until its env is cleaned up.
 */
const LEGACY_HOST = "contract-thingy-backend.vercel.app";
const PRODUCTION_FALLBACK = "https://amplify-contractos-api.vercel.app";

export function apiBase(): string {
  const configured = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!configured || configured.includes(LEGACY_HOST)) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") return PRODUCTION_FALLBACK;
  }
  return configured || "http://localhost:4000";
}
