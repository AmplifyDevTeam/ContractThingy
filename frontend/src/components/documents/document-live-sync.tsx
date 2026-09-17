"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getDocumentSyncStateAction } from "@/lib/actions/workspace";

const CHANNEL = "contractos-signing";

const WATCH = new Set(["SENT", "VIEWED", "PARTIALLY_SIGNED"]);

export function DocumentLiveSync({
  documentId,
  status,
  signingStatus,
  lastActivityAt,
}: {
  documentId: string;
  status: string;
  signingStatus?: string | null;
  lastActivityAt?: string;
}) {
  const router = useRouter();
  const baseline = useRef({ status, signingStatus, lastActivityAt });
  baseline.current = { status, signingStatus, lastActivityAt };

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<{ documentId?: string; type?: string }>) => {
      if (event.data?.documentId !== documentId) return;
      router.refresh();
      if (event.data.type === "recipient_signed") {
        toast.success("Recipient signature recorded");
      }
      if (event.data.type === "finalized") {
        toast.success("Agreement finalized");
      }
    };
    return () => channel.close();
  }, [documentId, router]);

  useEffect(() => {
    if (!WATCH.has(status)) return;

    let cancelled = false;

    async function tick() {
      try {
        const next = await getDocumentSyncStateAction(documentId);
        if (cancelled || !next) return;
        const prev = baseline.current;
        const changed =
          next.status !== prev.status ||
          next.signingStatus !== prev.signingStatus ||
          next.lastActivityAt !== prev.lastActivityAt;
        if (!changed) return;
        if (prev.status !== "PARTIALLY_SIGNED" && next.status === "PARTIALLY_SIGNED") {
          toast.success("Recipient has signed — ready to countersign");
        }
        if (next.status === "FINALIZED" && prev.status !== "FINALIZED") {
          toast.success("Agreement finalized");
        }
        router.refresh();
      } catch {
        // ignore transient poll errors
      }
    }

    const interval = window.setInterval(() => void tick(), 2500);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [documentId, status, signingStatus, lastActivityAt, router]);

  return null;
}

export function broadcastSigningEvent(payload: {
  documentId: string;
  type: "recipient_signed" | "finalized" | "opened";
}) {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // ignore
  }
}
