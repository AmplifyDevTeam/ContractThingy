import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { sessionSecret } from "@/lib/config";

/**
 * Signing tokens are stored as a SHA-256 hash for lookup. We also keep an AES-256-GCM
 * encrypted copy so staff can copy the *same* link again without invalidating the one
 * already emailed. The key is derived from SESSION_SECRET.
 */
function key(): Buffer {
  return createHash("sha256").update(`${sessionSecret()}:signing-link-token`).digest();
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${body.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptToken(value: string | undefined): string | null {
  if (!value) return null;
  const [version, iv, body, tag] = value.split(".");
  if (version !== "v1" || !iv || !body || !tag) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
