export const DEFAULT_ORG_ID = "amplify-media-technologies";

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export function useLocalAdapter(): boolean {
  if (process.env.DATA_ADAPTER === "local") return true;
  if (process.env.DATA_ADAPTER === "firestore") return false;
  return !isFirebaseConfigured();
}

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return "amplify-contractos-local-dev-secret";
}

export function appUrl(): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isLoopbackUrl(value: string): boolean {
  try {
    return isLoopbackHost(new URL(value.includes("://") ? value : `http://${value}`).hostname);
  } catch {
    return false;
  }
}

/** Origin for signing links/emails. Pass Host from the HTTP request when available. */
export function resolveAppUrl(requestHost?: string | null, requestProto?: string | null): string {
  const fallback = appUrl();
  if (!requestHost) return fallback;
  const proto = requestProto ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const fromRequest = `${proto}://${requestHost}`.replace(/\/$/, "");
  if (!isLoopbackUrl(fromRequest)) return fromRequest;
  if (!isLoopbackUrl(fallback)) return fallback;
  return fromRequest;
}

/** @deprecated Prefer resolveAppUrl(host) from the request handler */
export async function requestAppUrl(): Promise<string> {
  return resolveAppUrl();
}

export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const cwd = process.cwd();
  if (cwd.endsWith("/backend") || cwd.endsWith("\\backend")) {
    return `${cwd}/../.data`;
  }
  return `${cwd}/.data`;
}

export function geminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function openaiEnabled(): boolean {
  return geminiEnabled();
}

export function envReadyFile(): boolean {
  return Boolean(process.env.SESSION_SECRET);
}

export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.APP_URL ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
