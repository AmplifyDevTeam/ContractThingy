"use server";

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

export async function openSigningAction(token: string): Promise<SigningPayload> {
  return apiGet<SigningPayload>(`/sign/${token}`);
}

export async function consentSigningAction(token: string) {
  return apiPost<{ ok: true }>(`/sign/${token}/consent`);
}

export async function sendSigningOtpAction(token: string, force = false) {
  return apiPost<{ ok: true; sent?: boolean }>(`/sign/${token}/otp/send`, { force });
}

export async function verifySigningOtpAction(token: string, code: string) {
  return apiPost<{ ok: true }>(`/sign/${token}/otp/verify`, { code });
}

export async function recipientSignAction(
  token: string,
  imageDataUrl: string,
  method: "draw" | "type",
) {
  return apiPost<{ ok: true; documentId: string }>(`/sign/${token}/sign`, { imageDataUrl, method });
}
