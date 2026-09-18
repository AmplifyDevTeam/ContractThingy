import { appUrl } from "@/lib/config";
import type { DataStore } from "@/lib/data/store";
import type { EmailSettings } from "@/lib/types";

export type EmailTemplateId =
  | "document_sent"
  | "signing_reminder"
  | "signing_otp"
  | "recipient_signed"
  | "company_signature_required"
  | "agreement_completed"
  | "signing_expired"
  | "test_message";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export type EmailDelivery = {
  delivered: boolean;
  provider: "resend" | "console";
};

export interface EmailProvider {
  readonly name: "resend" | "console";
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console" as const;
  async send(message: EmailMessage): Promise<void> {
    console.info("[email]", {
      to: message.to,
      from: message.from,
      replyTo: message.replyTo,
      subject: message.subject,
      preview: message.text ?? message.html.replace(/<[^>]+>/g, " ").slice(0, 180),
    });
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend" as const;
  constructor(private apiKey: string) {}
  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from ?? envEmailFrom(),
        reply_to: message.replyTo || undefined,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend error ${res.status}: ${detail.slice(0, 240) || res.statusText}`);
    }
  }
}

export type EmailTransportStatus = {
  configured: boolean;
  provider: "resend" | "console";
  from: string;
};

function envEmailFrom() {
  return process.env.EMAIL_FROM ?? "ContractOS <onboarding@resend.dev>";
}

export function formatEmailFrom(settings?: Partial<EmailSettings> | null): string {
  const address = settings?.fromAddress?.trim();
  if (address?.includes("@")) {
    const name = settings?.fromName?.trim();
    return name ? `${name} <${address}>` : address;
  }
  return envEmailFrom();
}

export function getEmailProvider(): EmailProvider {
  const key = process.env.EMAIL_API_KEY?.trim();
  const driver = (process.env.EMAIL_PROVIDER ?? (key ? "resend" : "console")).toLowerCase();
  if (driver === "resend" && key) return new ResendEmailProvider(key);
  return new ConsoleEmailProvider();
}

export function emailTransportStatus(settings?: Partial<EmailSettings> | null): EmailTransportStatus {
  const provider = getEmailProvider();
  return {
    configured: provider.name === "resend",
    provider: provider.name,
    from: formatEmailFrom(settings),
  };
}

export function emailConfigured(): boolean {
  return getEmailProvider().name === "resend";
}

export async function loadEmailSettings(store: DataStore): Promise<EmailSettings> {
  const stored = await store.getSettings<EmailSettings | undefined>("email");
  return {
    fromName: stored?.fromName ?? "ContractOS",
    fromAddress: stored?.fromAddress ?? "",
    replyTo: stored?.replyTo ?? "",
    notifyInternalOnSign: stored?.notifyInternalOnSign ?? true,
    notifyRecipientOnComplete: stored?.notifyRecipientOnComplete ?? true,
    sendReminders: stored?.sendReminders ?? true,
  };
}

export async function emailIdentityFromStore(store: DataStore): Promise<{ from: string; replyTo?: string }> {
  const settings = await loadEmailSettings(store);
  return {
    from: formatEmailFrom(settings),
    replyTo: settings.replyTo?.trim() || undefined,
  };
}

const TEMPLATES: Record<EmailTemplateId, (data: Record<string, string>) => EmailMessage> = {
  document_sent: (data) => ({
    to: data.recipientEmail ?? "",
    subject: `${data.companyName}: ${data.documentName} is ready to sign`,
    html: layout(
      data,
      `<p>Hello ${data.recipientName},</p>
       <p>${data.companyName} has sent <strong>${data.documentName}</strong> for your review and electronic signature.</p>
       <p><a class="btn" href="${data.signUrl}">Review and sign</a></p>
       <p class="muted">This link expires on ${data.expiresAt}.</p>`,
    ),
  }),
  signing_reminder: (data) => ({
    to: data.recipientEmail ?? "",
    subject: `Reminder: ${data.documentName} is waiting for your signature`,
    html: layout(
      data,
      `<p>Hello ${data.recipientName},</p>
       <p>This is a reminder to review and sign <strong>${data.documentName}</strong>.</p>
       <p><a class="btn" href="${data.signUrl}">Continue signing</a></p>`,
    ),
  }),
  signing_otp: (data) => ({
    to: data.recipientEmail ?? "",
    subject: `Verification code for ${data.documentName}`,
    html: layout(
      data,
      `<p>Hello ${data.recipientName},</p>
       <p>Your verification code for <strong>${data.documentName}</strong> is:</p>
       <p style="font-size:28px;letter-spacing:.2em;font-weight:700;color:#D4FF4A">${data.otpCode}</p>
       <p class="muted">This code expires in 10 minutes. Do not share it.</p>`,
    ),
    text: `Your verification code is ${data.otpCode}`,
  }),
  recipient_signed: (data) => ({
    to: data.to,
    subject: `${data.recipientName} signed ${data.documentName}`,
    html: layout(data, `<p>${data.recipientName} has signed ${data.documentName}.</p>`),
  }),
  company_signature_required: (data) => ({
    to: data.to,
    subject: `Countersignature required: ${data.documentName}`,
    html: layout(
      data,
      `<p>${data.recipientName} has signed ${data.documentName}. An authorized Amplify representative should countersign to finalize.</p>
       <p><a class="btn" href="${data.signaturesUrl ?? `${appUrl()}/signatures`}">Open signatures</a></p>`,
    ),
  }),
  agreement_completed: (data) => ({
    to: data.to,
    subject: `Completed: ${data.documentName}`,
    html: layout(
      data,
      `<p>Hello ${data.recipientName},</p>
       <p>${data.documentName} is complete. All required signatures have been collected.</p>
       <p><a class="btn" href="${data.downloadUrl ?? appUrl()}">View agreement</a></p>`,
    ),
  }),
  signing_expired: (data) => ({
    to: data.to,
    subject: `Signing link expired: ${data.documentName}`,
    html: layout(data, `<p>The signing link for ${data.documentName} has expired.</p>`),
  }),
  test_message: (data) => ({
    to: data.to,
    subject: "Amplify ContractOS email test",
    html: layout(
      data,
      `<p>This is a test message from Amplify ContractOS.</p>
       <p class="muted">If you received this, Resend delivery is working for ${data.companyName ?? "Amplify"}.</p>`,
    ),
  }),
};

function layout(data: Record<string, string>, body: string): string {
  const company = data.companyName ?? "Amplify Media Technologies";
  return `<!DOCTYPE html>
  <html><body style="font-family:Inter,Arial,sans-serif;background:#0c0d0b;color:#f4f6ef;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#141511;border:1px solid rgba(212,255,74,.15);border-radius:16px;padding:28px">
      <div style="letter-spacing:.28em;font-size:12px;color:#D4FF4A">AMPLIFY CONTRACTOS</div>
      <div style="color:#a3aa9a;margin:6px 0 24px">${company}</div>
      ${body}
      <p style="color:#a3aa9a;font-size:12px;margin-top:32px">This message was sent by Amplify ContractOS. Branding is controlled by company settings, not by the email transport.</p>
    </div>
    <style>.btn{display:inline-block;background:#D4FF4A;color:#111;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600}.muted{color:#a3aa9a}</style>
  </body></html>`;
}

export async function sendTemplatedEmail(args: {
  to: string;
  template: EmailTemplateId;
  data: Record<string, string>;
  from?: string;
  replyTo?: string;
  store?: DataStore;
}): Promise<EmailDelivery> {
  const provider = getEmailProvider();
  const identity = args.store
    ? await emailIdentityFromStore(args.store)
    : { from: args.from ?? envEmailFrom(), replyTo: args.replyTo };
  const built = TEMPLATES[args.template]({ ...args.data, to: args.to, recipientEmail: args.to });
  await provider.send({
    ...built,
    to: args.to,
    from: args.from ?? identity.from,
    replyTo: args.replyTo ?? identity.replyTo,
  });
  return { delivered: provider.name === "resend", provider: provider.name };
}
