"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MergeFieldInserter } from "@/components/library/merge-field-inserter";
import { updateDocumentContentAction } from "@/lib/actions/client";
import { editableLegalToHtml, htmlToEditableLegal, LEGAL_TEXT_HINT } from "@/lib/legal-text";
import type { Clause, ClauseVersion, CustomSection, TemplateVersion } from "@/lib/types";

function mapOverridesToEditable(overrides: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(overrides).map(([id, value]) => [id, htmlToEditableLegal(value)]),
  );
}

const CUSTOM_TAB = "__custom__";

export function DocumentContentEditor({
  documentId,
  templateVersion,
  clauses,
  clauseVersions,
  sectionTitleOverrides = {},
  clauseTextOverrides = {},
  customSections = [],
  locked = false,
}: {
  documentId: string;
  templateVersion: TemplateVersion | null;
  clauses: Clause[];
  clauseVersions: ClauseVersion[];
  sectionTitleOverrides?: Record<string, string>;
  clauseTextOverrides?: Record<string, string>;
  customSections?: CustomSection[];
  locked?: boolean;
}) {
  const router = useRouter();
  const [titles, setTitles] = useState<Record<string, string>>(sectionTitleOverrides);
  const [wording, setWording] = useState<Record<string, string>>(() =>
    mapOverridesToEditable(clauseTextOverrides),
  );
  const [extras, setExtras] = useState<CustomSection[]>(() =>
    customSections.map((item) => ({ ...item, html: htmlToEditableLegal(item.html) })),
  );
  const [openCustom, setOpenCustom] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(clauseTextOverrides).map((id) => [id, true])),
  );
  const [busy, setBusy] = useState(false);

  const sections = useMemo(
    () => [...(templateVersion?.sections ?? [])].sort((a, b) => a.order - b.order),
    [templateVersion],
  );
  const [activeId, setActiveId] = useState<string>(() => sections[0]?.id ?? CUSTOM_TAB);
  const clausesById = useMemo(() => new Map(clauses.map((item) => [item.id, item])), [clauses]);
  const libraryEditable = useMemo(() => {
    const map = new Map<string, string>();
    for (const version of clauseVersions) {
      if (!map.has(version.clauseId)) map.set(version.clauseId, htmlToEditableLegal(version.legalText));
    }
    return map;
  }, [clauseVersions]);

  const customizedCount = useMemo(() => {
    let count = Object.keys(wording).filter((id) => {
      const editable = (wording[id] ?? "").trim();
      const library = (libraryEditable.get(id) ?? "").trim();
      return editable && editable !== library;
    }).length;
    for (const section of sections) {
      const value = (titles[section.id] ?? "").trim();
      if (value && value !== section.title) count += 1;
    }
    count += extras.filter((item) => item.title.trim() || item.html.trim()).length;
    return count;
  }, [wording, libraryEditable, titles, sections, extras]);

  if (locked) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Headings and clause wording lock after the document is sent.
      </p>
    );
  }

  async function save() {
    setBusy(true);
    try {
      const sectionTitleOverridesNext: Record<string, string> = {};
      for (const section of sections) {
        const value = (titles[section.id] ?? "").trim();
        if (value && value !== section.title) sectionTitleOverridesNext[section.id] = value;
      }
      const clauseTextOverridesNext: Record<string, string> = {};
      for (const [id, value] of Object.entries(wording)) {
        const editable = value.trim();
        const library = (libraryEditable.get(id) ?? "").trim();
        if (editable && editable !== library) clauseTextOverridesNext[id] = editableLegalToHtml(value);
      }
      await updateDocumentContentAction(documentId, {
        sectionTitleOverrides: sectionTitleOverridesNext,
        clauseTextOverrides: clauseTextOverridesNext,
        customSections: extras
          .filter((item) => item.title.trim() || item.html.trim())
          .map((item) => ({
            ...item,
            html: editableLegalToHtml(item.html),
          })),
      });
      toast.success("Document wording updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update wording");
    } finally {
      setBusy(false);
    }
  }

  const activeSection = sections.find((section) => section.id === activeId) ?? null;
  const activeClauses = activeSection
    ? activeSection.clauseIds.map((id) => clausesById.get(id)).filter((item): item is Clause => Boolean(item))
    : [];

  function sectionHasEdits(sectionId: string) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return false;
    const title = (titles[sectionId] ?? "").trim();
    if (title && title !== section.title) return true;
    return section.clauseIds.some((id) => {
      const editable = (wording[id] ?? "").trim();
      const library = (libraryEditable.get(id) ?? "").trim();
      return Boolean(editable && editable !== library);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[12px] text-muted-foreground">{LEGAL_TEXT_HINT}</p>
          {customizedCount > 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              {customizedCount} customization{customizedCount === 1 ? "" : "s"} on this document
            </p>
          ) : null}
        </div>
        <Button type="button" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save wording"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {sections.map((section, index) => {
          const selected = activeId === section.id;
          const edited = sectionHasEdits(section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveId(section.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-left text-[12px] transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <span className="font-mono text-[10px] opacity-70">{String(index + 1).padStart(2, "0")}</span>
              <span className="ml-1.5">{titles[section.id] ?? section.title}</span>
              {edited ? <span className="ml-1.5 opacity-80">·</span> : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setActiveId(CUSTOM_TAB)}
          className={`shrink-0 rounded-md px-3 py-1.5 text-[12px] transition-colors ${
            activeId === CUSTOM_TAB
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          Custom
          {extras.length > 0 ? (
            <span className="ml-1.5 font-mono text-[10px] opacity-70">{extras.length}</span>
          ) : null}
        </button>
      </div>

      {activeSection ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`heading-${activeSection.id}`}>Heading</Label>
              <Input
                id={`heading-${activeSection.id}`}
                value={titles[activeSection.id] ?? activeSection.title}
                onChange={(e) =>
                  setTitles((current) => ({ ...current, [activeSection.id]: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">
                {activeClauses.length} clause{activeClauses.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-col gap-1">
                {activeClauses.map((clause) => {
                  const customOpen = Boolean(openCustom[clause.id] || wording[clause.id]);
                  const edited = (() => {
                    const editable = (wording[clause.id] ?? "").trim();
                    const library = (libraryEditable.get(clause.id) ?? "").trim();
                    return Boolean(editable && editable !== library);
                  })();
                  return (
                    <button
                      key={clause.id}
                      type="button"
                      onClick={() => {
                        if (!customOpen) {
                          setWording((current) => ({
                            ...current,
                            [clause.id]: libraryEditable.get(clause.id) ?? "",
                          }));
                          setOpenCustom((current) => ({ ...current, [clause.id]: true }));
                        }
                        requestAnimationFrame(() => {
                          document.getElementById(`custom-wording-${clause.id}`)?.focus();
                        });
                      }}
                      className={`rounded-md border px-3 py-2 text-left text-[12px] transition-colors ${
                        customOpen
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="block font-medium text-foreground">{clause.title}</span>
                      <span className="mt-0.5 block text-[11px]">
                        {edited ? "Custom wording" : customOpen ? "Editing library text" : "Library wording"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            {activeClauses.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No clauses in this section.</p>
            ) : (
              activeClauses.map((clause) => {
                const customOpen = Boolean(openCustom[clause.id] || wording[clause.id]);
                if (!customOpen) return null;
                return (
                  <div key={clause.id} className="space-y-2 rounded-md border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium">{clause.title}</p>
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:underline"
                        onClick={() => {
                          setWording((current) => {
                            const next = { ...current };
                            delete next[clause.id];
                            return next;
                          });
                          setOpenCustom((current) => ({ ...current, [clause.id]: false }));
                        }}
                      >
                        Use library wording
                      </button>
                    </div>
                    <Textarea
                      id={`custom-wording-${clause.id}`}
                      rows={6}
                      className="text-sm leading-relaxed"
                      value={wording[clause.id] ?? libraryEditable.get(clause.id) ?? ""}
                      onChange={(e) =>
                        setWording((current) => ({ ...current, [clause.id]: e.target.value }))
                      }
                    />
                    <MergeFieldInserter
                      textareaId={`custom-wording-${clause.id}`}
                      value={wording[clause.id] ?? libraryEditable.get(clause.id) ?? ""}
                      onChange={(next) => setWording((current) => ({ ...current, [clause.id]: next }))}
                    />
                  </div>
                );
              })
            )}
            {activeClauses.every((clause) => !openCustom[clause.id] && !wording[clause.id]) ? (
              <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
                <p className="max-w-sm text-[13px] text-muted-foreground">
                  Select a clause on the left to override its library wording for this document only.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-muted-foreground">
              Extra sections appended after the template outline.
            </p>
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={() =>
                setExtras((current) => [
                  ...current,
                  {
                    id: `custom_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`,
                    title: "",
                    html: "",
                  },
                ])
              }
            >
              Add section
            </button>
          </div>
          {extras.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
              <p className="text-[13px] text-muted-foreground">No custom sections yet.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {extras.map((section) => (
                <div key={section.id} className="space-y-2 rounded-md border border-border bg-background p-3">
                  <Input
                    value={section.title}
                    placeholder="Custom heading"
                    onChange={(e) =>
                      setExtras((current) =>
                        current.map((item) =>
                          item.id === section.id ? { ...item, title: e.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Textarea
                    id={`custom-section-${section.id}`}
                    rows={4}
                    className="text-sm leading-relaxed"
                    value={section.html}
                    placeholder="Custom wording in plain language"
                    onChange={(e) =>
                      setExtras((current) =>
                        current.map((item) =>
                          item.id === section.id ? { ...item, html: e.target.value } : item,
                        ),
                      )
                    }
                  />
                  <MergeFieldInserter
                    textareaId={`custom-section-${section.id}`}
                    value={section.html}
                    onChange={(next) =>
                      setExtras((current) =>
                        current.map((item) => (item.id === section.id ? { ...item, html: next } : item)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => setExtras((current) => current.filter((item) => item.id !== section.id))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
