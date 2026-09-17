"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSigningLinkAction, sendSignatureAction } from "@/lib/actions/workspace";

export function SigningLinkPanel({
  documentId,
  status,
  recipientEmail,
}: {
  documentId: string;
  status: string;
  recipientEmail?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSend = ["APPROVED", "READY_TO_SEND", "SENT", "VIEWED", "PARTIALLY_SIGNED"].includes(status);

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

  async function issue(kind: "send" | "copy" | "open") {
    setBusy(true);
    try {
      const result =
        kind === "send" ? await sendSignatureAction(documentId) : await getSigningLinkAction(documentId);
      const nextUrl = shareUrl(result.url);
      setUrl(nextUrl);
      setEmailDelivered(Boolean(result.emailDelivered));
      if (kind === "send") {
        if (result.emailDelivered) {
          toast.success(`Sent to ${result.recipientEmail}`);
        } else {
          await navigator.clipboard.writeText(nextUrl);
          toast.success("Signing link copied. Configure Resend to email recipients automatically.");
        }
      } else if (kind === "copy") {
        await navigator.clipboard.writeText(nextUrl);
        toast.success("Signing link copied");
      }
      if (kind === "open") {
        window.open(nextUrl, "_blank", "noopener,noreferrer");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create signing link");
    } finally {
      setBusy(false);
    }
  }

  if (!canSend && status !== "SENT" && status !== "VIEWED" && status !== "PARTIALLY_SIGNED") {
    return null;
  }

  return (
    <div className="space-y-3">
      {url ? (
        <div className="space-y-2">
          <Input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
          <p className="text-xs text-muted-foreground">
            {emailDelivered
              ? "Recipient was emailed. You can still copy or open this link."
              : "Email transport is in console mode — share this URL with the recipient."}
          </p>
        </div>
      ) : recipientEmail ? (
        <p className="text-xs text-muted-foreground">
          Recipient: {recipientEmail}. The original token is not shown after refresh — copy or open to issue the working link.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {["APPROVED", "READY_TO_SEND"].includes(status) ? (
          <Button disabled={busy} onClick={() => void issue("send")}>
            Send for signature
          </Button>
        ) : null}
        <Button variant="outline" disabled={busy} onClick={() => void issue("copy")}>
          Copy signing link
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void issue("open")}>
          Open signing page
        </Button>
      </div>
    </div>
  );
}
