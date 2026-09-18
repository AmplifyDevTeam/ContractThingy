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
]);

export function publicErrorMessage(err: unknown, fallback = "Request failed"): string {
  const message = err instanceof Error ? err.message : fallback;
  if (SAFE_MESSAGES.has(message)) return message;
  if (message.startsWith("Missing permission:")) return message;
  if (message.toLowerCase().includes("not found")) return "Not found";
  if (process.env.NODE_ENV !== "production") return message;
  return fallback;
}
