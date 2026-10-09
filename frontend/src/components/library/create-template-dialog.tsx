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
import { createTemplateAction } from "@/lib/actions/client";
import { DOCUMENT_FAMILIES, DOCUMENT_TYPE_CODES } from "@/lib/types/enums";
import type { Clause, Template } from "@/lib/types";

type DraftSection = { key: string; title: string; clauseIds: string[] };

export function CreateTemplateDialog({ clauses }: { clauses: Clause[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Template["category"]>("EMPLOYMENT");
  const [documentType, setDocumentType] = useState<Template["documentType"]>("custom_agreement");
  const [sections, setSections] = useState<DraftSection[]>([
    { key: "s1", title: "Parties", clauseIds: [] },
  ]);

  function reset() {
    setName("");
    setDescription("");
    setCategory("EMPLOYMENT");
    setDocumentType("custom_agreement");
    setSections([{ key: "s1", title: "Parties", clauseIds: [] }]);
  }

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
      const result = await createTemplateAction({
        name: name.trim(),
        description: description.trim(),
        category,
        documentType,
        sections: sections
          .filter((section) => section.title.trim())
          .map((section, index) => ({
            title: section.title.trim(),
            clauseIds: section.clauseIds,
            order: index + 1,
          })),
      });
      toast.success("Template created");
      setOpen(false);
      reset();
      router.push(`/templates/${result.template.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create template");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(name.trim() && sections.some((section) => section.title.trim()));

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New template
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>
              Start with a name and at least one section. You can attach clauses now or refine later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto py-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-template-name">Name</Label>
              <Input id="new-template-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-template-category">Category</Label>
                <select
                  id="new-template-category"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Template["category"])}
                >
                  {DOCUMENT_FAMILIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-template-type">Document type</Label>
                <select
                  id="new-template-type"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as Template["documentType"])}
                >
                  {DOCUMENT_TYPE_CODES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-template-description">Description</Label>
              <Textarea
                id="new-template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] text-muted-foreground">Sections</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSections((current) => [
                      ...current,
                      { key: `s${current.length + 1}-${Date.now()}`, title: "", clauseIds: [] },
                    ])
                  }
                >
                  Add section
                </Button>
              </div>
              {sections.map((section, index) => (
                <div key={section.key} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`new-section-${section.key}`}>
                      Section {String(index + 1).padStart(2, "0")}
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
                    id={`new-section-${section.key}`}
                    value={section.title}
                    onChange={(e) =>
                      setSections((current) =>
                        current.map((item) =>
                          item.key === section.key ? { ...item, title: e.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Heading"
                  />
                  <div className="max-h-36 space-y-1 overflow-y-auto text-sm">
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" disabled={busy || !ready} onClick={() => void save()}>
              {busy ? "Creating…" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
