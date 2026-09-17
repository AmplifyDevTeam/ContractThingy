"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/signing/signature-pad";
import { approveAction, voidAction, countersignAction } from "@/lib/actions/workspace";
import { broadcastSigningEvent } from "@/components/documents/document-live-sync";
import type { ContractDocument } from "@/lib/types";

export function DocumentActions({ document }: { document: ContractDocument }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["DRAFT", "CONFIGURING", "REVIEW_REQUIRED"].includes(document.status) ? (
          <Button disabled={busy} onClick={() => void run("Approved", () => approveAction(document.id))}>
            Approve
          </Button>
        ) : null}
        {document.status !== "FINALIZED" && document.status !== "VOIDED" ? (
          <Button
            variant="destructive"
            disabled={busy || !reason}
            onClick={() => void run("Voided", () => voidAction(document.id, reason))}
          >
            Void
          </Button>
        ) : null}
      </div>
      {document.status !== "FINALIZED" && document.status !== "VOIDED" ? (
        <Textarea
          placeholder="Void reason (required to void)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      ) : null}
      {document.status === "PARTIALLY_SIGNED" ? (
        <div className="min-w-0 overflow-hidden rounded-md border border-border p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-medium">Amplify countersignature</h3>
          <SignaturePad
            busy={busy}
            onSubmit={async (dataUrl, method) => {
              await run("Countersigned", () => countersignAction(document.id, dataUrl, method));
              broadcastSigningEvent({ documentId: document.id, type: "finalized" });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
