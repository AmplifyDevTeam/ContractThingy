"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateTemplateAction } from "@/lib/actions/client";
import { TEMPLATE_STATUSES } from "@/lib/types/enums";
import type { Clause, Template, TemplateVersion } from "@/lib/types";

type DraftSection = {
  key: string;
  id?: string;
  title: string;
  clauseIds: string[];
};

export function TemplateEditor({
  template,
  currentVersion,
  clauses = [],
}: {
  template: Template;
  currentVersion: TemplateVersion | null;
  clauses?: Clause[];
}) {
  const router = useRouter();
  const initialSections = [...(currentVersion?.sections ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      key: section.id,
      id: section.id,
      title: section.title,
      clauseIds: [...section.clauseIds],
    }));
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [status, setStatus] = useState(template.status);
  const [sections, setSections] = useState<DraftSection[]>(initialSections);
  const [changeNotes, setChangeNotes] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleClause(sectionKey: string, clauseId: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) return section;
        const clauseIds = section.clauseIds.includes(clauseId)
          ? section.clauseIds.filter((id) => id !== clauseId)
          : [...section.clauseIds, clauseId];
        return { ...section, clauseIds };
      }),
    );
  }

  async function save() {
    setBusy(true);
    try {
      await updateTemplateAction(template.id, {
        name: name.trim(),
        description: description.trim(),
        status,
        sections: sections
          .filter((section) => section.title.trim())
          .map((section, index) => ({
            id: section.id,
            title: section.title.trim(),
            clauseIds: section.clauseIds,
            order: index + 1,
          })),
        changeNotes: changeNotes.trim() || undefined,
      });
      toast.success("Template saved");
      setChangeNotes("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="template-name">Name</Label>
          <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-status">Status</Label>
          <select
            id="template-status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as Template["status"])}
          >
            {TEMPLATE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="template-description">Description</Label>
          <Textarea
            id="template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            Sections and clauses. Structural changes create a new template version.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSections((current) => [
                ...current,
                { key: `new-${Date.now()}`, title: "", clauseIds: [] },
              ])
            }
          >
            Add section
          </Button>
        </div>
        {sections.map((section, index) => (
          <div key={section.key} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`section-${section.key}`}>
                <span className="font-mono text-[11px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>{" "}
                Heading
              </Label>
              {sections.length > 1 ? (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setSections((current) => current.filter((item) => item.key !== section.key))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <Input
              id={`section-${section.key}`}
              value={section.title}
              onChange={(e) =>
                setSections((current) =>
                  current.map((item) =>
                    item.key === section.key ? { ...item, title: e.target.value } : item,
                  ),
                )
              }
            />
            <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {clauses.map((clause) => (
                <label key={clause.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.clauseIds.includes(clause.id)}
                    onChange={() => toggleClause(section.key, clause.id)}
                    className="size-4 accent-primary"
                  />
                  <span>{clause.title}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-notes">Change notes</Label>
        <Input
          id="template-notes"
          value={changeNotes}
          onChange={(e) => setChangeNotes(e.target.value)}
          placeholder="Optional note for version history"
        />
      </div>

      <Button type="button" onClick={save} disabled={busy || !name.trim() || sections.every((s) => !s.title.trim())}>
        {busy ? "Saving…" : "Save template"}
      </Button>
    </div>
  );
}
