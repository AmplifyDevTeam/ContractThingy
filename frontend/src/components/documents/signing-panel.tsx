"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  extendSigningLinkAction,
  getSigningLinkAction,
  revokeSigningLinkAction,
  sendSignatureAction,
} from "@/lib/actions/workspace";

const SENDABLE = ["APPROVED", "READY_TO_SEND"];
const OUTSTANDING = ["SENT", "VIEWED", "EXPIRED"];

export function SigningLinkPanel({
  documentId,
  status,
  recipientEmail,
  requestId,
  canSend,
}: {
  documentId: string;
  status: string;
  recipientEmail?: string;
  requestId?: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!canSend) return null;
  if (!SENDABLE.includes(status) && !OUTSTANDING.includes(status)) return null;

  function shareUrl(raw: string) {
    try {
      const parsed = new URL(raw);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // keep the server URL
    }
    return raw;
  }

  async function run<T>(fn: () => Promise<T>, onDone: (result: T) => void | Promise<void>, fallback: string) {
    setBusy(true);
    try {
      const result = await fn();
      await onDone(result);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const send = (resend: boolean) =>
    run(
      () => sendSignatureAction(documentId),
      async (result) => {
        const next = shareUrl(result.url);
        setUrl(next);
        setEmailDelivered(Boolean(result.emailDelivered));
        if (result.emailDelivered) {
          toast.success(`${resend ? "New link sent" : "Sent"} to ${result.recipientEmail}`);
        } else {
          await navigator.clipboard.writeText(next).catch(() => undefined);
          toast.warning("Email is not configured — the signing link was copied. Share it with the recipient.");
        }
      },
      "Could not send for signature",
    );

  const copyOrOpen = (mode: "copy" | "open") =>
    run(
      () => getSigningLinkAction(documentId),
      async (result) => {
        const next = shareUrl(result.url);
        setUrl(next);
        if (mode === "copy") {
          await navigator.clipboard.writeText(next).catch(() => undefined);
          toast.success("Signing link copied");
        } else {
          window.open(next, "_blank", "noopener,noreferrer");
        }
      },
      "Could not load the signing link",
    );

  return (
    <div className="space-y-3">
      {url ? (
        <div className="space-y-2">
          <Input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
          <p className="text-xs text-muted-foreground">
            {emailDelivered
              ? "Recipient was emailed. This is the same link they received."
              : "Email transport is in console mode — share this URL with the recipient."}
          </p>
        </div>
      ) : recipientEmail && OUTSTANDING.includes(status) ? (
        <p className="text-xs text-muted-foreground">
          Recipient: {recipientEmail}. Copying the link does not invalidate the one already emailed.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {SENDABLE.includes(status) ? (
          <Button disabled={busy} onClick={() => void send(false)}>
            Send for signature
          </Button>
        ) : null}
        {OUTSTANDING.includes(status) && status !== "EXPIRED" ? (
          <>
            <Button variant="outline" disabled={busy} onClick={() => void copyOrOpen("copy")}>
              Copy signing link
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void copyOrOpen("open")}>
              Preview signing page
            </Button>
          </>
        ) : null}
        {OUTSTANDING.includes(status) && requestId ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(
                () => extendSigningLinkAction(requestId, 7),
                () => {
                  toast.success("Link extended by 7 days");
                },
                "Could not extend the link",
              )
            }
          >
            Extend 7 days
          </Button>
        ) : null}
        {OUTSTANDING.includes(status) ? (
          <Button variant="outline" disabled={busy} onClick={() => void send(true)}>
            Resend (new link)
          </Button>
        ) : null}
        {OUTSTANDING.includes(status) && status !== "EXPIRED" && requestId ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(
                () => revokeSigningLinkAction(requestId),
                () => {
                  setUrl("");
                  toast.success("Signing link revoked");
                },
                "Could not revoke the link",
              )
            }
          >
            Revoke link
          </Button>
        ) : null}
      </div>
    </div>
  );
}
