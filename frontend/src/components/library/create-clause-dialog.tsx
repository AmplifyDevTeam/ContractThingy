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
import { LegalTextField } from "@/components/library/legal-text-field";
import { createClauseAction } from "@/lib/actions/client";
import { editableLegalToHtml } from "@/lib/legal-text";
import { CLAUSE_STATUSES } from "@/lib/types/enums";
import type { Clause } from "@/lib/types";

export function CreateClauseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Clause["status"]>("approved");
  const [tags, setTags] = useState("");
  const [legalText, setLegalText] = useState("");

  function reset() {
    setTitle("");
    setCategory("");
    setDescription("");
    setStatus("approved");
    setTags("");
    setLegalText("");
  }

  async function save() {
    setBusy(true);
    try {
      const result = await createClauseAction({
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        status,
        tags: tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        legalText: editableLegalToHtml(legalText),
      });
      toast.success("Clause created");
      setOpen(false);
      reset();
      router.push(`/clauses/${result.clause.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create clause");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New clause
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
            <DialogTitle>New clause</DialogTitle>
            <DialogDescription>
              Add approved wording to the library. Templates can reference it after you save.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto py-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-clause-title">Title</Label>
              <Input id="new-clause-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-clause-category">Category</Label>
                <Input
                  id="new-clause-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Compensation"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-clause-status">Status</Label>
                <select
                  id="new-clause-status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Clause["status"])}
                >
                  {CLAUSE_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-clause-description">Description</Label>
              <Input
                id="new-clause-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-clause-tags">Tags</Label>
              <Input
                id="new-clause-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma separated"
              />
            </div>
            <LegalTextField
              id="new-clause-wording"
              value={legalText}
              onChange={setLegalText}
              minRowsClassName="min-h-36"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !title.trim() || !category.trim() || !legalText.trim()}
              onClick={() => void save()}
            >
              {busy ? "Creating…" : "Create clause"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
