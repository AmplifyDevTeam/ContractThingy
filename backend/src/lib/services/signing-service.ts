import { createHash } from "node:crypto";
import { requestAppUrl } from "@/lib/config";
import { newId, nowIso, randomToken, sha256Hex } from "@/lib/ids";
import { generateOtpCode, hashOtp, verifyOtpHash } from "@/lib/security/guards";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";
import { assembleCurrentHtml } from "@/lib/services/document-service";
import { writeAudit } from "@/lib/services/audit-service";
import { loadEmailSettings, sendTemplatedEmail } from "@/lib/services/email-service";
import { PdfUnavailableError, renderPdf } from "@/lib/services/pdf-service";
import type { DataStore } from "@/lib/data/store";
import type { SessionUser } from "@/lib/auth/session";
import type {
  CompanySettings,
  ContractDocument,
  DocumentVersion,
  SignatureEvent,
  SignatureEventType,
  SigningRequest,
  SigningSettings,
  StoredSignature,
  TemplateVersion,
} from "@/lib/types";

const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SIGNATURE_BYTES = 1_500_000;

type Client = { ip?: string; ua?: string };

async function recordEvent(
  store: DataStore,
  args: {
    request: SigningRequest;
    type: SignatureEventType;
    identity: string;
    ip?: string;
    ua?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const event: SignatureEvent = {
    id: newId("sev"),
    signingRequestId: args.request.id,
    documentId: args.request.documentId,
    type: args.type,
    timestamp: nowIso(),
    ipAddress: args.ip,
    userAgent: args.ua,
    signerIdentity: args.identity,
    metadata: args.metadata ?? {},
  };
  await store.setDoc("signatureEvents", event);
  return event;
}

function isExpired(request: SigningRequest): boolean {
  return new Date(request.expiresAt).getTime() < Date.now();
}

function signUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/sign/${token}`;
}

/** Mark an outstanding request (and its document) expired once its deadline passes. */
export async function expireIfStale(store: DataStore, request: SigningRequest): Promise<SigningRequest> {
  if (!isExpired(request)) return request;
  if (request.status === "completed" || request.status === "revoked" || request.status === "expired") return request;
  if (request.recipientSignedAt) return request; // waiting on Amplify, not on the recipient
  const next: SigningRequest = { ...request, status: "expired" };
  await store.setDoc("signingRequests", next);
  const document = await store.getDoc<ContractDocument>("documents", request.documentId);
  if (document && (document.status === "SENT" || document.status === "VIEWED")) {
    await store.setDoc("documents", { ...document, status: "EXPIRED", updatedAt: nowIso() });
  }
  return next;
}

/** Sweep all outstanding requests (cheap: only called from list screens). */
export async function expireStaleRequests(store: DataStore, requests: SigningRequest[]): Promise<SigningRequest[]> {
  const out: SigningRequest[] = [];
  for (const request of requests) out.push(await expireIfStale(store, request));
  return out;
}

async function issueAndEmailOtp(
  store: DataStore,
  request: SigningRequest,
  document: ContractDocument,
): Promise<SigningRequest> {
  const code = generateOtpCode();
  const now = nowIso();
  const next: SigningRequest = {
    ...request,
    otpHash: hashOtp(code),
    otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    otpVerifiedAt: undefined,
    otpAttempts: 0,
    otpSentAt: now,
  };
  await store.setDoc("signingRequests", next);
  const company = await store.getSettings<CompanySettings>("company");
  await sendTemplatedEmail({
    store,
    to: request.recipientEmail,
    template: "signing_otp",
    data: {
      recipientName: request.recipientName,
      recipientEmail: request.recipientEmail,
      documentName: document.name,
      companyName: company.legalName,
      otpCode: code,
    },
  });
  return next;
}

export async function sendForSignature(
  store: DataStore,
  actor: SessionUser,
  documentId: string,
  recipient: { name: string; email: string },
  options?: { appUrl?: string },
): Promise<{ url: string; recipientEmail: string; recipientName: string; emailDelivered: boolean; emailProvider: "resend" | "console" }> {
  const document = await store.getDoc<ContractDocument>("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "VOIDED" || document.status === "FINALIZED") {
    throw new Error("This document cannot be sent for signature");
  }
  const sendable = ["APPROVED", "READY_TO_SEND", "SENT", "VIEWED", "EXPIRED"];
  if (!sendable.includes(document.status)) {
    throw new Error("Document must be approved before sending");
  }

  // Re-sending replaces any outstanding link.
  const existing = await store.whereEquals<SigningRequest>("signingRequests", "documentId", documentId);
  for (const prior of existing) {
    if (prior.status === "revoked" || prior.status === "completed") continue;
    const { token: _drop, tokenEnc: _enc, ...rest } = prior as SigningRequest & { token?: string };
    await store.setDoc("signingRequests", { ...rest, status: "revoked" });
  }

  const templateVersion = await store.getDoc<TemplateVersion>("templateVersions", document.templateVersionId);
  const signing = await store.getSettings<SigningSettings>("signing");
  const expiryDays = signing.defaultExpiryDays ?? templateVersion?.signatureConfig.expiryDays ?? 7;
  const order = signing.defaultOrder ?? templateVersion?.signatureConfig.order ?? "recipient_first";
  const requireOtp =
    templateVersion?.signatureConfig.requireOtp === true ||
    (document.family === "CLIENT" && Boolean(signing.requireOtpForClientAgreements));
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const request: SigningRequest = {
    id: newId("sig"),
    documentId,
    tokenHash,
    tokenHint: token.slice(0, 6),
    tokenEnc: encryptToken(token),
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    status: "pending",
    order,
    requireOtp,
    otpAttempts: 0,
    expiresAt,
    reminderCount: 0,
    createdAt: now,
    createdBy: actor.userId,
  };
  await store.setDoc("signingRequests", request);

  await store.setDoc("documents", {
    ...document,
    status: "SENT",
    sentAt: now,
    updatedAt: now,
    lastActivityAt: now,
  } satisfies ContractDocument);
  await recordEvent(store, { request, type: "document_sent", identity: actor.email });
  await writeAudit(store, {
    type: "DOCUMENT_SENT",
    actor,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} sent for signature to ${recipient.email}.`,
  });

  const origin = options?.appUrl ?? (await requestAppUrl());
  const url = signUrl(origin, token);
  const company = await store.getSettings<CompanySettings>("company");
  const delivery = await sendTemplatedEmail({
    store,
    to: recipient.email,
    template: "document_sent",
    data: {
      recipientName: recipient.name,
      documentName: document.name,
      companyName: company.legalName,
      signUrl: url,
      expiresAt,
    },
  });

  return {
    url,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    emailDelivered: delivery.delivered,
    emailProvider: delivery.provider,
  };
}

/** The current signing link — the same one the recipient was emailed (no rotation). */
export async function getActiveSigningLink(
  store: DataStore,
  documentId: string,
  options?: { appUrl?: string },
): Promise<{
  url: string;
  recipientEmail: string;
  recipientName: string;
  emailDelivered: boolean;
  emailProvider: "resend" | "console";
} | null> {
  const requests = (await store.whereEquals<SigningRequest>("signingRequests", "documentId", documentId))
    .filter((item) => item.status !== "revoked" && item.status !== "completed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const request = requests[0];
  if (!request || isExpired(request)) return null;

  let token = decryptToken(request.tokenEnc);
  if (!token) {
    // Legacy request created before tokens were kept encrypted: issue a new token once.
    token = randomToken(32);
    await store.setDoc("signingRequests", {
      ...request,
      tokenHash: await sha256Hex(token),
      tokenHint: token.slice(0, 6),
      tokenEnc: encryptToken(token),
      token: undefined,
    });
  }

  const origin = options?.appUrl ?? (await requestAppUrl());
  return {
    url: signUrl(origin, token),
    recipientEmail: request.recipientEmail,
    recipientName: request.recipientName,
    emailDelivered: false,
    emailProvider: "console",
  };
}

export async function getSigningByToken(
  store: DataStore,
  token: string,
): Promise<{ request: SigningRequest; document: ContractDocument; version: DocumentVersion } | null> {
  if (!token || token.length < 16) return null;
  const tokenHash = await sha256Hex(token);
  const requests = await store.whereEquals<SigningRequest>("signingRequests", "tokenHash", tokenHash);
  let request = requests[0];
  if (!request) return null;
  if (request.status === "revoked") return null;
  // A completed request stays readable so the recipient can fetch their signed copy.
  if (request.status !== "completed") {
    request = await expireIfStale(store, request);
    if (request.status === "expired") return null;
  }
  const document = await store.getDoc<ContractDocument>("documents", request.documentId);
  const version = document
    ? await store.getDoc<DocumentVersion>("documentVersions", document.currentVersionId)
    : null;
  if (!document || !version) return null;
  return { request, document, version };
}

export async function sendSigningOtp(store: DataStore, token: string, options?: { force?: boolean }) {
  const found = await getSigningByToken(store, token);
  if (!found) throw new Error("Invalid or expired signing link");
  if (!found.request.requireOtp) throw new Error("Verification is not required for this agreement");
  if (found.request.otpVerifiedAt) return { ok: true as const, sent: false };
  const lastSent = found.request.otpSentAt ? new Date(found.request.otpSentAt).getTime() : 0;
  const stillValid =
    found.request.otpHash &&
    found.request.otpExpiresAt &&
    new Date(found.request.otpExpiresAt).getTime() > Date.now();
  // Page reloads must not spam codes: keep the current code unless a resend is explicitly asked for.
  if (stillValid && (!options?.force || Date.now() - lastSent < OTP_RESEND_COOLDOWN_MS)) {
    return { ok: true as const, sent: false };
  }
  await issueAndEmailOtp(store, found.request, found.document);
  return { ok: true as const, sent: true };
}

export async function verifySigningOtp(store: DataStore, token: string, code: string, client?: Client) {
  const found = await getSigningByToken(store, token);
  if (!found) throw new Error("Invalid or expired signing link");
  const request = found.request;
  if (!request.requireOtp) return { ok: true as const };
  if (!request.otpHash || !request.otpExpiresAt || new Date(request.otpExpiresAt).getTime() < Date.now()) {
    throw new Error("Invalid or expired verification code");
  }
  if (!verifyOtpHash(code, request.otpHash)) {
    const attempts = (request.otpAttempts ?? 0) + 1;
    const locked = attempts >= MAX_OTP_ATTEMPTS;
    await store.setDoc("signingRequests", {
      ...request,
      otpAttempts: attempts,
      ...(locked ? { otpHash: undefined, otpExpiresAt: undefined } : {}),
    });
    throw new Error(locked ? "Too many incorrect codes. Request a new code." : "Invalid or expired verification code");
  }
  const now = nowIso();
  await store.setDoc("signingRequests", {
    ...request,
    otpVerifiedAt: now,
    otpHash: undefined,
    otpAttempts: 0,
  });
  await recordEvent(store, {
    request,
    type: "otp_verified",
    identity: request.recipientEmail,
    ip: client?.ip,
    ua: client?.ua,
  });
  return { ok: true as const };
}

export async function markOpened(store: DataStore, request: SigningRequest, ip?: string, ua?: string) {
  if (request.status === "pending") {
    await store.setDoc("signingRequests", { ...request, status: "viewed" });
  }
  const document = await store.getDoc<ContractDocument>("documents", request.documentId);
  if (document && document.status === "SENT") {
    const now = nowIso();
    await store.setDoc("documents", { ...document, status: "VIEWED", updatedAt: now, lastActivityAt: now });
  }
  await recordEvent(store, {
    request,
    type: "document_opened",
    identity: request.recipientEmail,
    ip,
    ua,
  });
}

export async function acceptConsent(store: DataStore, request: SigningRequest, ip?: string, ua?: string) {
  const now = nowIso();
  await store.setDoc("signingRequests", { ...request, consentAcceptedAt: now });
  await recordEvent(store, {
    request,
    type: "consent_accepted",
    identity: request.recipientEmail,
    ip,
    ua,
  });
}

function dataUrlToPng(dataUrl: string): Uint8Array {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("Signature must be a PNG or JPEG image");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength === 0) throw new Error("Signature image is empty");
  if (bytes.byteLength > MAX_SIGNATURE_BYTES) throw new Error("Signature image is too large");
  return new Uint8Array(bytes);
}

export async function applyRecipientSignature(
  store: DataStore,
  request: SigningRequest,
  args: { method: "draw" | "type"; imageDataUrl: string; typedText?: string; ip?: string; ua?: string; appUrl?: string },
) {
  const bytes = dataUrlToPng(args.imageDataUrl);
  const result = await store.transact(async (tx) => {
    const current = await tx.getDoc<SigningRequest>("signingRequests", request.id);
    if (!current) throw new Error("Signing request not found");
    if (current.recipientSignedAt) throw new Error("This party has already signed");
    if (current.status === "revoked") throw new Error("This signing link has been revoked");
    if (isExpired(current)) throw new Error("This signing link has expired");
    if (current.requireOtp && !current.otpVerifiedAt) {
      throw new Error("Email verification code is required before signing");
    }

    const now = nowIso();
    const path = `organizations/${tx.orgId}/documents/${current.documentId}/signatures/${current.id}-recipient.png`;
    await tx.putFile(path, bytes, "image/png");
    const signature: StoredSignature = {
      id: newId("ssig"),
      signingRequestId: current.id,
      documentId: current.documentId,
      signerRole: "recipient",
      signerName: current.recipientName,
      signerEmail: current.recipientEmail,
      method: args.method,
      imagePath: path,
      typedText: args.typedText,
      signedAt: now,
    };
    await tx.setDoc("storedSignatures", signature);
    const companyAlreadySigned = Boolean(current.companySignedAt);
    await tx.setDoc("signingRequests", {
      ...current,
      recipientSignedAt: now,
      status: companyAlreadySigned ? "completed" : "partially_signed",
    });
    const document = await tx.getDoc<ContractDocument>("documents", current.documentId);
    if (document) {
      await tx.setDoc("documents", {
        ...document,
        status: companyAlreadySigned ? document.status : "PARTIALLY_SIGNED",
        updatedAt: now,
        lastActivityAt: now,
      });
    }
    await recordEvent(tx, {
      request: current,
      type: "signature_completed",
      identity: current.recipientEmail,
      ip: args.ip,
      ua: args.ua,
    });
    await writeAudit(tx, {
      type: "DOCUMENT_SIGNED",
      entityType: "document",
      entityId: current.documentId,
      summary: `${current.recipientName} signed ${document?.readableId ?? current.documentId}.`,
      ipAddress: args.ip,
    });
    return { signature, document, companyAlreadySigned };
  });

  if (result.companyAlreadySigned) {
    // Company signed first (company_first / parallel): both parties are done.
    await finalizeDocument(store, undefined, request.documentId, { appUrl: args.appUrl });
    return result.signature;
  }

  const company = await store.getSettings<CompanySettings>("company");
  const emailSettings = await loadEmailSettings(store);
  if (emailSettings.notifyInternalOnSign && company.email) {
    const origin = args.appUrl ?? (await requestAppUrl());
    await sendTemplatedEmail({
      store,
      to: company.email,
      template: "company_signature_required",
      data: {
        documentName: result.document?.name ?? "Agreement",
        recipientName: request.recipientName,
        companyName: company.legalName,
        signaturesUrl: `${origin.replace(/\/$/, "")}/documents/${request.documentId}`,
      },
    });
  }
  return result.signature;
}

export async function applyCompanySignature(
  store: DataStore,
  actor: SessionUser,
  documentId: string,
  args: { method: "draw" | "type"; imageDataUrl: string; typedText?: string; appUrl?: string },
) {
  const bytes = dataUrlToPng(args.imageDataUrl);
  const result = await store.transact(async (tx) => {
    const requests = (await tx.whereEquals<SigningRequest>("signingRequests", "documentId", documentId))
      .filter((item) => item.status !== "revoked")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const request = requests[0];
    if (!request) throw new Error("No signing request found");
    if (request.companySignedAt) throw new Error("Company has already signed");
    if (!request.recipientSignedAt && request.order === "recipient_first") {
      throw new Error("Recipient must sign first");
    }
    const now = nowIso();
    const path = `organizations/${tx.orgId}/documents/${documentId}/signatures/${request.id}-company.png`;
    await tx.putFile(path, bytes, "image/png");
    const signature: StoredSignature = {
      id: newId("ssig"),
      signingRequestId: request.id,
      documentId,
      signerRole: "company",
      signerName: actor.displayName,
      signerEmail: actor.email,
      method: args.method,
      imagePath: path,
      typedText: args.typedText,
      signedAt: now,
    };
    await tx.setDoc("storedSignatures", signature);
    const bothSigned = Boolean(request.recipientSignedAt);
    await tx.setDoc("signingRequests", {
      ...request,
      companySignedAt: now,
      status: bothSigned ? "completed" : "partially_signed",
    });
    const document = await tx.getDoc<ContractDocument>("documents", documentId);
    if (document) {
      await tx.setDoc("documents", { ...document, updatedAt: now, lastActivityAt: now });
    }
    await writeAudit(tx, {
      type: "DOCUMENT_COUNTERSIGNED",
      actor,
      entityType: "document",
      entityId: documentId,
      summary: bothSigned
        ? `${actor.displayName} countersigned for the company.`
        : `${actor.displayName} signed for the company; waiting on the recipient.`,
    });
    return { signature, bothSigned };
  });

  // Finalize only when BOTH parties have signed.
  if (result.bothSigned) await finalizeDocument(store, actor, documentId, { appUrl: args.appUrl });
  return result.signature;
}

export async function finalizeDocument(
  store: DataStore,
  actor: SessionUser | undefined,
  documentId: string,
  options?: { appUrl?: string },
) {
  const document = await store.getDoc<ContractDocument>("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "FINALIZED") return document;

  const version = await store.getDoc<DocumentVersion>("documentVersions", document.currentVersionId);
  if (!version) throw new Error("Missing document version");
  const company = await store.getSettings<CompanySettings>("company");
  const now = nowIso();
  const html = await assembleCurrentHtml(store, documentId, { finalizedAt: now });

  let bytes: Uint8Array;
  let contentType = "application/pdf";
  let fileName = "final.pdf";
  try {
    bytes = await renderPdf(html);
  } catch (error) {
    if (!(error instanceof PdfUnavailableError)) throw error;
    // Keep the exact signed record even when no PDF engine is available; it can be printed later.
    bytes = new TextEncoder().encode(html);
    contentType = "text/html";
    fileName = "final.html";
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `organizations/${store.orgId}/documents/${documentId}/final/${fileName}`;
  await store.putFile(path, bytes, contentType);
  const next: ContractDocument = {
    ...document,
    status: "FINALIZED",
    finalPdfPath: path,
    finalContentType: contentType,
    sha256: hash,
    signedAt: now,
    finalizedAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
  await store.setDoc("documents", next);
  await store.setDoc("documentVersions", {
    ...version,
    status: "FINALIZED",
    snapshot: { ...version.snapshot, renderedHtml: html },
  });
  await writeAudit(store, {
    type: "DOCUMENT_FINALIZED",
    actor,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} finalized. SHA-256 recorded${contentType === "text/html" ? " (HTML record; PDF engine unavailable)" : ""}.`,
    metadata: { sha256: hash, contentType },
  });

  const request = (await store.whereEquals<SigningRequest>("signingRequests", "documentId", documentId))
    .filter((item) => item.status === "completed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (request) {
    const emailSettings = await loadEmailSettings(store);
    const token = decryptToken(request.tokenEnc);
    if (emailSettings.notifyRecipientOnComplete && token) {
      const origin = options?.appUrl ?? (await requestAppUrl());
      await sendTemplatedEmail({
        store,
        to: request.recipientEmail,
        template: "agreement_completed",
        data: {
          recipientName: request.recipientName,
          documentName: document.name,
          companyName: company.legalName,
          downloadUrl: signUrl(origin, token),
        },
      });
    }
  }
  return next;
}

export async function revokeSigningLink(store: DataStore, actor: SessionUser, requestId: string) {
  const request = await store.getDoc<SigningRequest>("signingRequests", requestId);
  if (!request) throw new Error("Signing request not found");
  if (request.status === "completed") throw new Error("This agreement is already signed");
  const { tokenEnc: _enc, ...rest } = request;
  await store.setDoc("signingRequests", { ...rest, status: "revoked" });
  const document = await store.getDoc<ContractDocument>("documents", request.documentId);
  if (document && ["SENT", "VIEWED", "EXPIRED"].includes(document.status)) {
    const now = nowIso();
    await store.setDoc("documents", { ...document, status: "APPROVED", updatedAt: now, lastActivityAt: now });
  }
  await recordEvent(store, { request, type: "link_revoked", identity: actor.email });
  await writeAudit(store, {
    type: "DOCUMENT_EDITED",
    actor,
    entityType: "document",
    entityId: request.documentId,
    summary: `Signing link for ${request.recipientEmail} revoked.`,
  });
}

export async function extendSigningLink(store: DataStore, actor: SessionUser, requestId: string, days: number) {
  const request = await store.getDoc<SigningRequest>("signingRequests", requestId);
  if (!request || request.status === "revoked" || request.status === "completed") {
    throw new Error("Cannot extend this link");
  }
  const base = Math.max(Date.now(), new Date(request.expiresAt).getTime());
  const expiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
  const status = request.recipientSignedAt ? request.status : request.status === "expired" ? "pending" : request.status;
  await store.setDoc("signingRequests", { ...request, expiresAt, status });
  const document = await store.getDoc<ContractDocument>("documents", request.documentId);
  if (document?.status === "EXPIRED") {
    await store.setDoc("documents", { ...document, status: "SENT", updatedAt: nowIso() });
  }
  await recordEvent(store, { request, type: "link_extended", identity: actor.email, metadata: { days } });
}
