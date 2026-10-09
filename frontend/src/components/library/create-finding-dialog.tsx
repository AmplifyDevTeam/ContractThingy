"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createKnowledgeFindingAction } from "@/lib/actions/client";
import { KNOWLEDGE_DECISIONS } from "@/lib/types/enums";
import type { KnowledgeFinding } from "@/lib/types";

export function CreateFindingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [decision, setDecision] = useState("");
  const [status, setStatus] = useState<KnowledgeFinding["status"]>("pending");

  function reset() {
    setTitle("");
    setCategory("");
    setSampleText("");
    setDecision("");
    setStatus("pending");
  }

  async function save() {
    setBusy(true);
    try {
      await createKnowledgeFindingAction({
        title: title.trim(),
        category: category.trim(),
        sampleText: sampleText.trim(),
        decision: decision ? (decision as KnowledgeFinding["decision"]) : undefined,
        status,
      });
      toast.success("Finding created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create finding");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New finding
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>New knowledge finding</DialogTitle>
            <DialogDescription>
              Capture a pattern from reviewed agreements before promoting it into a clause.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-finding-title">Title</Label>
              <Input id="new-finding-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-finding-category">Category</Label>
              <Input
                id="new-finding-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Employment · Compensation"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-finding-sample">Sample / notes</Label>
              <Textarea
                id="new-finding-sample"
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-finding-decision">Decision</Label>
                <select
                  id="new-finding-decision"
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
                <Label htmlFor="new-finding-status">Status</Label>
                <select
                  id="new-finding-status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as KnowledgeFinding["status"])}
                >
                  <option value="pending">pending</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !title.trim() || !category.trim()}
              onClick={() => void save()}
            >
              {busy ? "Creating…" : "Create finding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
