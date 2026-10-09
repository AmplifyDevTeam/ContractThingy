"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getDocumentSyncStateAction } from "@/lib/actions/client";

const CHANNEL = "contractos-signing";

const WATCH = new Set(["SENT", "VIEWED", "PARTIALLY_SIGNED"]);
/** Poll while a signature is outstanding — same-tab BroadcastChannel is instant; this covers other devices. */
const POLL_MS = 4_000;

type SyncSnapshot = {
  status: string;
  signingStatus?: string | null;
  lastActivityAt?: string;
  recipientSignedAt?: string | null;
};

function changed(prev: SyncSnapshot, next: SyncSnapshot) {
  return (
    next.status !== prev.status ||
    next.signingStatus !== prev.signingStatus ||
    next.lastActivityAt !== prev.lastActivityAt ||
    (next.recipientSignedAt ?? null) !== (prev.recipientSignedAt ?? null)
  );
}

export function DocumentLiveSync({
  documentId,
  status,
  signingStatus,
  lastActivityAt,
  recipientSignedAt = null,
}: {
  documentId: string;
  status: string;
  signingStatus?: string | null;
  lastActivityAt?: string;
  recipientSignedAt?: string | null;
}) {
  const router = useRouter();
  const baseline = useRef<SyncSnapshot>({ status, signingStatus, lastActivityAt, recipientSignedAt });
  useEffect(() => {
    baseline.current = { status, signingStatus, lastActivityAt, recipientSignedAt };
  }, [status, signingStatus, lastActivityAt, recipientSignedAt]);

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
      if (event.data.type === "opened") {
        toast.message("Recipient opened the agreement");
      }
    };
    return () => channel.close();
  }, [documentId, router]);

  useEffect(() => {
    if (!WATCH.has(status)) return;

    let cancelled = false;

    async function tick() {
      if (document.visibilityState === "hidden") return;
      try {
        const next = await getDocumentSyncStateAction(documentId);
        if (cancelled || !next) return;
        const prev = baseline.current;
        if (!changed(prev, next)) return;

        if (prev.status !== "VIEWED" && next.status === "VIEWED") {
          toast.message("Recipient opened the agreement");
        }
        if (prev.status !== "PARTIALLY_SIGNED" && next.status === "PARTIALLY_SIGNED") {
          toast.success("Recipient has signed — ready to countersign");
        }
        if (next.status === "FINALIZED" && prev.status !== "FINALIZED") {
          toast.success("Agreement finalized");
        }
        if (next.status === "SIGNED" && prev.status !== "SIGNED") {
          toast.success("Signatures complete");
        }

        baseline.current = {
          status: next.status,
          signingStatus: next.signingStatus,
          lastActivityAt: next.lastActivityAt,
          recipientSignedAt: next.recipientSignedAt ?? null,
        };
        router.refresh();
      } catch {
        // ignore transient poll errors
      }
    }

    void tick();
    const interval = window.setInterval(() => void tick(), POLL_MS);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [documentId, status, router]);

  return null;
}

/** Keeps documents / signatures index pages current while any agreement is out for signature. */
export function DocumentsQueueLiveSync({
  documentIds,
}: {
  documentIds: string[];
}) {
  const router = useRouter();
  const watchIds = documentIds.filter(Boolean);
  const fingerprint = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<{ documentId?: string }>) => {
      if (!event.data?.documentId) return;
      if (watchIds.length > 0 && !watchIds.includes(event.data.documentId)) return;
      router.refresh();
    };
    return () => channel.close();
  }, [router, watchIds.join("|")]);

  useEffect(() => {
    if (watchIds.length === 0) return;

    let cancelled = false;

    async function tick() {
      if (document.visibilityState === "hidden") return;
      try {
        let dirty = false;
        for (const id of watchIds) {
          const next = await getDocumentSyncStateAction(id);
          if (cancelled || !next) continue;
          const key = `${next.status}|${next.signingStatus ?? ""}|${next.lastActivityAt ?? ""}|${next.recipientSignedAt ?? ""}`;
          const prev = fingerprint.current.get(id);
          if (prev === undefined) {
            fingerprint.current.set(id, key);
            continue;
          }
          if (prev !== key) {
            fingerprint.current.set(id, key);
            dirty = true;
          }
        }
        if (dirty) router.refresh();
      } catch {
        // ignore
      }
    }

    void tick();
    const interval = window.setInterval(() => void tick(), POLL_MS);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [watchIds.join("|"), router]);

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
