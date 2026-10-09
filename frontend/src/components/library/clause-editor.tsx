"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalTextField } from "@/components/library/legal-text-field";
import { updateClauseAction } from "@/lib/actions/client";
import { editableLegalToHtml, htmlToEditableLegal } from "@/lib/legal-text";
import { CLAUSE_STATUSES } from "@/lib/types/enums";
import type { Clause, ClauseVersion } from "@/lib/types";

export function ClauseEditor({
  clause,
  currentVersion,
}: {
  clause: Clause;
  currentVersion: ClauseVersion | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(clause.title);
  const [description, setDescription] = useState(clause.description);
  const [category, setCategory] = useState(clause.category);
  const [status, setStatus] = useState(clause.status);
  const [tags, setTags] = useState(clause.tags.join(", "));
  const [legalText, setLegalText] = useState(() => htmlToEditableLegal(currentVersion?.legalText ?? ""));
  const [changeNotes, setChangeNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(clause.title);
    setDescription(clause.description);
    setCategory(clause.category);
    setStatus(clause.status);
    setTags(clause.tags.join(", "));
    setLegalText(htmlToEditableLegal(currentVersion?.legalText ?? ""));
  }, [clause.id, clause.title, clause.description, clause.category, clause.status, clause.tags, currentVersion?.id, currentVersion?.legalText]);

  async function save() {
    setBusy(true);
    try {
      await updateClauseAction(clause.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        status,
        tags: tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        legalText: editableLegalToHtml(legalText),
        changeNotes: changeNotes.trim() || undefined,
      });
      toast.success("Clause saved");
      setChangeNotes("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save clause");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="clause-title">Title</Label>
          <Input id="clause-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clause-category">Category</Label>
          <Input id="clause-category" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clause-status">Status</Label>
          <select
            id="clause-status"
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="clause-description">Description</Label>
          <Input
            id="clause-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="clause-tags">Tags</Label>
          <Input
            id="clause-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma separated"
          />
        </div>
      </div>

      <LegalTextField id="clause-wording" value={legalText} onChange={setLegalText} />

      <div className="space-y-1.5">
        <Label htmlFor="clause-notes">Change notes</Label>
        <Input
          id="clause-notes"
          value={changeNotes}
          onChange={(e) => setChangeNotes(e.target.value)}
          placeholder="Optional note for version history"
        />
      </div>

      <p className="text-[12px] text-muted-foreground">
        Saving changed wording creates a new approved version; existing documents keep their pinned text.
      </p>

      <Button type="button" onClick={save} disabled={busy || !title.trim() || !legalText.trim()}>
        {busy ? "Saving…" : "Save clause"}
      </Button>
    </div>
  );
}
