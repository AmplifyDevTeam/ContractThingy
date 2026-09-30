import { createHash, randomInt, timingSafeEqual } from "node:crypto";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limit (per isolate). Good enough for single-region Vercel. */
export function rateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(args.key);
  if (!current || current.resetAt <= now) {
    buckets.set(args.key, { count: 1, resetAt: now + args.windowMs });
    return { ok: true };
  }
  if (current.count >= args.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

export function clientIp(header: string | undefined): string {
  return header?.split(",")[0]?.trim() || "unknown";
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * The real client behind a request. Calls from the Next.js frontend (server actions) arrive
 * from Vercel's servers; the frontend forwards the browser's IP/UA in x-client-ip / x-client-ua,
 * trusted only when x-proxy-secret matches PROXY_SHARED_SECRET.
 */
export function requestClient(header: (name: string) => string | undefined): { ip: string; ua?: string } {
  const secret = process.env.PROXY_SHARED_SECRET?.trim();
  const presented = header("x-proxy-secret");
  if (secret && presented && safeEqual(secret, presented)) {
    return {
      ip: header("x-client-ip")?.trim() || clientIp(header("x-forwarded-for")),
      ua: header("x-client-ua") ?? header("user-agent") ?? undefined,
    };
  }
  return { ip: clientIp(header("x-forwarded-for")), ua: header("user-agent") ?? undefined };
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function verifyOtpHash(code: string, storedHash: string | undefined): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashOtp(code), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 6-digit numeric OTP. */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

/** Safe public API errors — avoid leaking internals. */
const SAFE_MESSAGES = new Set([
  "Invalid email or password",
  "Authentication required",
  "Password login is disabled",
  "Missing Firebase ID token",
  "Invalid or expired Firebase session. Try signing in again.",
  "Firebase Admin is not configured on the API. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
  "Your Google account has no email address.",
  "No workspace account for this email. Ask an admin to invite you, or use an allowed company domain.",
  "This account is disabled. Contact an admin.",
  "Invalid or expired signing link",
  "Consent is required before signing",
  "Email verification code is required before signing",
  "Invalid or expired verification code",
  "Verification is not required for this agreement",
  "Too many attempts. Try again later.",
  "Document not found",
  "Not found",
  "A user with that email already exists",
  "Cannot remove or demote the last SUPER_ADMIN",
  "Only a SUPER_ADMIN can grant SUPER_ADMIN",
  "This document cannot be sent for signature",
  "Document must be approved before sending",
  "Signing request not found",
  "This party has already signed",
  "This signing link has been revoked",
  "This signing link has expired",
  "Too many incorrect codes. Request a new code.",
  "Recipient must sign first",
  "Company has already signed",
  "No signing request found",
  "Cannot extend this link",
  "Design is locked once a document has been sent",
  "PDF rendering is unavailable on this deployment",
  "The default development password cannot be used in production. Reset this account's password.",
  "Signed copy is not available yet",
  "This agreement is already signed",
  "Signature must be a PNG or JPEG image",
  "Signature image is too large",
  "Signature image is empty",
  "Only documents awaiting review can be approved",
  "Finalized documents cannot be voided",
  "Recipient name and email are required",
]);

export function publicErrorMessage(err: unknown, fallback = "Request failed"): string {
  const message = err instanceof Error ? err.message : fallback;
  if (SAFE_MESSAGES.has(message)) return message;
  if (message.startsWith("Missing permission:")) return message;
  if (message.startsWith("Firebase project mismatch:")) return message;
  if (message.toLowerCase().includes("not found")) return "Not found";
  if (process.env.NODE_ENV !== "production") return message;
  return fallback;
}
