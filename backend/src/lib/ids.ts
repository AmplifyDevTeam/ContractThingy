import { DOCUMENT_ID_PREFIXES } from "@/lib/types/enums";

export function nextReadableId(args: {
  documentType: string;
  year: number;
  sequence: number;
}): string {
  const prefix = DOCUMENT_ID_PREFIXES[args.documentType] ?? "DOC";
  return `AMP-${prefix}-${args.year}-${String(args.sequence).padStart(4, "0")}`;
}

export function randomToken(bytes = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64url");
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Buffer.from(digest).toString("hex");
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
