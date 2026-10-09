"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { updateKnowledgeFindingAction } from "@/lib/actions/client";
import { KNOWLEDGE_DECISIONS } from "@/lib/types/enums";
import type { KnowledgeFinding } from "@/lib/types";

function FindingRow({ finding, index }: { finding: KnowledgeFinding; index: number }) {
  const router = useRouter();
  const [title, setTitle] = useState(finding.title);
  const [sampleText, setSampleText] = useState(finding.sampleText);
  const [decision, setDecision] = useState(finding.decision ?? "");
  const [status, setStatus] = useState(finding.status);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateKnowledgeFindingAction(finding.id, {
        title: title.trim(),
        sampleText: sampleText.trim(),
        decision: decision ? (decision as KnowledgeFinding["decision"]) : undefined,
        status,
      });
      toast.success("Finding saved");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save finding");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <div className="font-medium">{finding.title}</div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Found in {finding.occurrenceCount} documents · {finding.category}
              {finding.suggestedClauseId ? ` · ${finding.suggestedClauseId}` : ""}
            </div>
            {finding.sampleText ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {finding.sampleText}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={finding.decision ?? finding.status} />
          <button
            type="button"
            className="font-mono text-[11px] text-primary hover:underline"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label htmlFor={`finding-title-${finding.id}`}>Title</Label>
            <Input
              id={`finding-title-${finding.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`finding-sample-${finding.id}`}>Sample / notes</Label>
            <Textarea
              id={`finding-sample-${finding.id}`}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`finding-decision-${finding.id}`}>Decision</Label>
              <select
                id={`finding-decision-${finding.id}`}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="">Unset</option>
                {KNOWLEDGE_DECISIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`finding-status-${finding.id}`}>Status</Label>
              <select
                id={`finding-status-${finding.id}`}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as KnowledgeFinding["status"])}
              >
                <option value="pending">pending</option>
                <option value="resolved">resolved</option>
              </select>
            </div>
          </div>
          <Button type="button" onClick={save} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : "Save finding"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function KnowledgeFindingsEditor({ findings }: { findings: KnowledgeFinding[] }) {
  if (findings.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">No patterns yet.</p>;
  }

  return (
    <div className="mt-2">
      {findings.map((finding, index) => (
        <FindingRow key={finding.id} finding={finding} index={index} />
      ))}
    </div>
  );
}
