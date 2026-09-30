"use server";

import { toResult } from "@/lib/actions/result";

import { apiGet, apiPost } from "@/lib/api";

export type SigningPayload = {
  documentName: string;
  readableId: string;
  recipientName: string;
  html: string;
  allowDraftDownload: boolean;
  status: string;
  requireOtp: boolean;
  otpVerified: boolean;
  consentAcceptedAt?: string | null;
  recipientSignedAt?: string | null;
  finalized: boolean;
  sha256?: string | null;
  signedAt?: string | null;
  partyName: string;
  companyName?: string;
  /** Opened by a signed-in staff member: nothing is recorded as a recipient view. */
  preview?: boolean;
  signedCopyAvailable?: boolean;
} | null;

async function openSigningAction__impl(token: string): Promise<SigningPayload> {
  return apiGet<SigningPayload>(`/sign/${token}`);
}

async function consentSigningAction__impl(token: string) {
  return apiPost<{ ok: true }>(`/sign/${token}/consent`);
}

async function sendSigningOtpAction__impl(token: string, force = false) {
  return apiPost<{ ok: true; sent?: boolean }>(`/sign/${token}/otp/send`, { force });
}

async function verifySigningOtpAction__impl(token: string, code: string) {
  return apiPost<{ ok: true }>(`/sign/${token}/otp/verify`, { code });
}

async function recipientSignAction__impl(
  token: string,
  imageDataUrl: string,
  method: "draw" | "type",
) {
  return apiPost<{ ok: true; documentId: string }>(`/sign/${token}/sign`, { imageDataUrl, method });
}

// ── Public actions (return ActionResult; see lib/actions/result.ts) ──
export async function openSigningAction(...args: Parameters<typeof openSigningAction__impl>) {
  return toResult(() => openSigningAction__impl(...args));
}
export async function consentSigningAction(...args: Parameters<typeof consentSigningAction__impl>) {
  return toResult(() => consentSigningAction__impl(...args));
}
export async function sendSigningOtpAction(...args: Parameters<typeof sendSigningOtpAction__impl>) {
  return toResult(() => sendSigningOtpAction__impl(...args));
}
export async function verifySigningOtpAction(...args: Parameters<typeof verifySigningOtpAction__impl>) {
  return toResult(() => verifySigningOtpAction__impl(...args));
}
export async function recipientSignAction(...args: Parameters<typeof recipientSignAction__impl>) {
  return toResult(() => recipientSignAction__impl(...args));
}
