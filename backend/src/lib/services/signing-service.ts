import { createHash } from "node:crypto";
import { requestAppUrl } from "@/lib/config";
import { newId, nowIso, randomToken, sha256Hex } from "@/lib/ids";
import { assembleCurrentHtml } from "@/lib/services/document-service";
import { writeAudit } from "@/lib/services/audit-service";
import {
  loadEmailSettings,
  sendTemplatedEmail,
} from "@/lib/services/email-service";
import { renderPdf } from "@/lib/services/pdf-service";
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
  const sendable = ["APPROVED", "READY_TO_SEND", "SENT", "VIEWED"];
  if (!sendable.includes(document.status)) {
    throw new Error("Document must be approved before sending");
  }

  const existing = await store.queryDocs<SigningRequest>(
    "signingRequests",
    (item) => item.documentId === documentId && item.status !== "revoked" && item.status !== "completed",
  );
  for (const prior of existing) {
    await store.setDoc("signingRequests", { ...prior, status: "revoked" });
  }

  const templateVersion = await store.getDoc<TemplateVersion>(
    "templateVersions",
    document.templateVersionId,
  );
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
    token,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    status: "pending",
    order,
    requireOtp,
    expiresAt,
    reminderCount: 0,
    createdAt: now,
    createdBy: actor.userId,
  };

  await store.setDoc("signingRequests", request);
  const next: ContractDocument = {
    ...document,
    status: "SENT",
    sentAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
  await store.setDoc("documents", next);
  await recordEvent(store, {
    request,
    type: "document_sent",
    identity: actor.email,
  });
  await writeAudit(store, {
    type: "DOCUMENT_SENT",
    actor,
    entityType: "document",
    entityId: documentId,
    summary: `${document.readableId} sent for signature to ${recipient.email}.`,
  });

  const origin = options?.appUrl ?? (await requestAppUrl());
  const url = `${origin}/sign/${token}`;
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
  const requests = (
    await store.queryDocs<SigningRequest>(
      "signingRequests",
      (item) => item.documentId === documentId && item.status !== "revoked" && item.status !== "completed",
    )
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const request = requests[0];
  if (!request?.token) return null;
  if (new Date(request.expiresAt).getTime() < Date.now()) return null;
  const origin = options?.appUrl ?? (await requestAppUrl());
  return {
    url: `${origin}/sign/${request.token}`,
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
  const tokenHash = await sha256Hex(token);
  const requests = await store.queryDocs<SigningRequest>(
    "signingRequests",
    (item) => item.tokenHash === tokenHash,
  );
  const request = requests[0];
  if (!request) return null;
  if (request.status === "revoked") return null;
  if (new Date(request.expiresAt).getTime() < Date.now()) return null;
  const document = await store.getDoc<ContractDocument>("documents", request.documentId);
  const version = document
    ? await store.getDoc<DocumentVersion>("documentVersions", document.currentVersionId)
    : null;
  if (!document || !version) return null;
  return { request, document, version };
}

export async function markOpened(
  store: DataStore,
  request: SigningRequest,
  ip?: string,
  ua?: string,
) {
  if (request.status === "pending") {
    await store.setDoc("signingRequests", { ...request, status: "viewed" });
  }
  const document = await store.getDoc<ContractDocument>("documents", request.documentId);
  if (document && (document.status === "SENT" || document.status === "VIEWED")) {
    await store.setDoc("documents", {
      ...document,
      status: "VIEWED",
      updatedAt: nowIso(),
      lastActivityAt: nowIso(),
    });
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

export async function applyRecipientSignature(
  store: DataStore,
  request: SigningRequest,
  args: { method: "draw" | "type"; imageDataUrl: string; typedText?: string; ip?: string; ua?: string },
) {
  return store.transact(async (tx) => {
    const current = await tx.getDoc<SigningRequest>("signingRequests", request.id);
    if (!current) throw new Error("Signing request not found");
    if (current.recipientSignedAt) throw new Error("This party has already signed");
    if (current.status === "revoked") throw new Error("This signing link has been revoked");
    if (new Date(current.expiresAt).getTime() < Date.now()) throw new Error("This signing link has expired");

    const now = nowIso();
    const path = `organizations/${tx.orgId}/documents/${current.documentId}/signatures/${current.id}-recipient.png`;
    const bytes = dataUrlToBytes(args.imageDataUrl);
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
    await tx.setDoc("signingRequests", {
      ...current,
      recipientSignedAt: now,
      status: "partially_signed",
    });
    const document = await tx.getDoc<ContractDocument>("documents", current.documentId);
    if (document) {
      await tx.setDoc("documents", {
        ...document,
        status: "PARTIALLY_SIGNED",
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
    });

    const company = await tx.getSettings<CompanySettings>("company");
    const emailSettings = await loadEmailSettings(tx);
    if (emailSettings.notifyInternalOnSign && company.email) {
      const origin = await requestAppUrl();
      await sendTemplatedEmail({
        store: tx,
        to: company.email,
        template: "company_signature_required",
        data: {
          documentName: document?.name ?? "Agreement",
          recipientName: current.recipientName,
          companyName: company.legalName,
          signaturesUrl: `${origin}/signatures`,
        },
      });
    }
    return signature;
  });
}

export async function applyCompanySignature(
  store: DataStore,
  actor: SessionUser,
  documentId: string,
  args: { method: "draw" | "type"; imageDataUrl: string; typedText?: string },
) {
  return store.transact(async (tx) => {
    const requests = await tx.queryDocs<SigningRequest>(
      "signingRequests",
      (item) => item.documentId === documentId && item.status !== "revoked",
    );
    const request = requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!request) throw new Error("No signing request found");
    if (request.companySignedAt) throw new Error("Company has already signed");
    if (!request.recipientSignedAt && request.order === "recipient_first") {
      throw new Error("Recipient must sign first");
    }
    const now = nowIso();
    const path = `organizations/${tx.orgId}/documents/${documentId}/signatures/${request.id}-company.png`;
    await tx.putFile(path, dataUrlToBytes(args.imageDataUrl), "image/png");
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
    await tx.setDoc("signingRequests", {
      ...request,
      companySignedAt: now,
      status: "completed",
    });
    await writeAudit(tx, {
      type: "DOCUMENT_COUNTERSIGNED",
      actor,
      entityType: "document",
      entityId: documentId,
      summary: `Company countersigned document.`,
    });
    await finalizeDocument(tx, actor, documentId);
    return signature;
  });
}

export async function finalizeDocument(
  store: DataStore,
  actor: SessionUser | undefined,
  documentId: string,
) {
  const document = await store.getDoc<ContractDocument>("documents", documentId);
  if (!document) throw new Error("Document not found");
  if (document.status === "FINALIZED") return document;

  const version = await store.getDoc<DocumentVersion>("documentVersions", document.currentVersionId);
  if (!version) throw new Error("Missing document version");
  const company = await store.getSettings<CompanySettings>("company");
  const now = nowIso();
  const html = await assembleCurrentHtml(store, documentId, { finalizedAt: now });
  const pdf = await renderPdf(html);
  const hash = createHash("sha256").update(pdf).digest("hex");
  const path = `organizations/${store.orgId}/documents/${documentId}/final/final.pdf`;
  await store.putFile(path, pdf, "application/pdf");
  const next: ContractDocument = {
    ...document,
    status: "FINALIZED",
    finalPdfPath: path,
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
    summary: `${document.readableId} finalized. SHA-256 recorded.`,
    metadata: { sha256: hash },
  });

  const request = (
    await store.queryDocs<SigningRequest>("signingRequests", (item) => item.documentId === documentId)
  )[0];
  if (request) {
    const emailSettings = await loadEmailSettings(store);
    if (emailSettings.notifyRecipientOnComplete) {
      await sendTemplatedEmail({
        store,
        to: request.recipientEmail,
        template: "agreement_completed",
        data: {
          recipientName: request.recipientName,
          documentName: document.name,
          companyName: company.legalName,
          downloadUrl: `${await requestAppUrl()}/sign/${request.tokenHint}/complete`,
        },
      });
    }
  }
  return next;
}

export async function revokeSigningLink(store: DataStore, actor: SessionUser, requestId: string) {
  const request = await store.getDoc<SigningRequest>("signingRequests", requestId);
  if (!request) throw new Error("Signing request not found");
  await store.setDoc("signingRequests", { ...request, status: "revoked" });
  await recordEvent(store, {
    request,
    type: "link_revoked",
    identity: actor.email,
  });
}

export async function extendSigningLink(
  store: DataStore,
  actor: SessionUser,
  requestId: string,
  days: number,
) {
  const request = await store.getDoc<SigningRequest>("signingRequests", requestId);
  if (!request || request.status === "revoked") throw new Error("Cannot extend this link");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  await store.setDoc("signingRequests", { ...request, expiresAt, status: "pending" });
  await recordEvent(store, {
    request,
    type: "link_extended",
    identity: actor.email,
    metadata: { days },
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const match = dataUrl.match(/^data:.*?;base64,(.+)$/);
  const b64 = match ? match[1] : dataUrl;
  return new Uint8Array(Buffer.from(b64, "base64"));
}
