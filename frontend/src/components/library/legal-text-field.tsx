"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { editableLegalToHtml, LEGAL_TEXT_HINT } from "@/lib/legal-text";
import { groupMergeFields, mergeChip, type MergeField } from "@/lib/merge-fields";

function highlightChips(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[\[([^\]]+)\]\]/g,
      '<span class="rounded-md bg-primary/15 px-1.5 py-0.5 font-medium text-primary" style="white-space:nowrap">$1</span>',
    )
    .replace(/\n/g, "<br/>");
}

export function LegalTextField({
  id,
  label = "Approved wording",
  value,
  onChange,
  minRowsClassName = "min-h-48",
  fields,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  minRowsClassName?: string;
  fields?: MergeField[];
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const previewHtml = editableLegalToHtml(value);
  const groups = groupMergeFields(fields);

  function insertField(field: MergeField) {
    const area = areaRef.current;
    const chip = mergeChip(field.label);
    if (!area) {
      onChange(value ? `${value.trimEnd()} ${chip}` : chip);
      return;
    }
    const start = area.selectionStart ?? value.length;
    const end = area.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
    const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
    const next = `${before}${needsSpaceBefore ? " " : ""}${chip}${needsSpaceAfter ? " " : ""}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      area.focus();
      const cursor = start + (needsSpaceBefore ? 1 : 0) + chip.length + (needsSpaceAfter ? 1 : 0);
      area.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          ref={areaRef}
          id={id}
          className={`${minRowsClassName} text-sm leading-relaxed`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`This Agreement is made between [[Company legal name]] (the "Company") and [[Employee full name]] (the "Employee").

The Company and the Employee are each a "Party" and together the "Parties".`}
        />
        <p className="text-[12px] text-muted-foreground">{LEGAL_TEXT_HINT}</p>
      </div>

      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Insert field</p>
        <div className="space-y-3">
          {groups.map(([group, items]) => (
            <div key={group} className="space-y-1.5">
              <p className="text-[12px] text-muted-foreground">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => insertField(field)}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {value.trim() ? (
        <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">How it reads</p>
          <div
            className="mt-2 text-sm leading-7 text-foreground"
            dangerouslySetInnerHTML={{ __html: highlightChips(value) }}
          />
          {previewHtml ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Highlighted items fill in automatically when you generate a document for a person or client.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
