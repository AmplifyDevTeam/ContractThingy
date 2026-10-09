"use client";

import { useRef } from "react";
import { groupMergeFields, mergeChip, type MergeField } from "@/lib/merge-fields";

/** Compact field picker for generate / document override textareas. */
export function MergeFieldInserter({
  value,
  onChange,
  textareaId,
  fields,
}: {
  value: string;
  onChange: (next: string) => void;
  textareaId?: string;
  fields?: MergeField[];
}) {
  const lastFocus = useRef<{ start: number; end: number } | null>(null);
  const groups = groupMergeFields(fields);

  function rememberSelection(area: HTMLTextAreaElement) {
    lastFocus.current = { start: area.selectionStart, end: area.selectionEnd };
  }

  function insertField(field: MergeField) {
    const chip = mergeChip(field.label);
    const area = textareaId
      ? (document.getElementById(textareaId) as HTMLTextAreaElement | null)
      : null;
    const start = area?.selectionStart ?? lastFocus.current?.start ?? value.length;
    const end = area?.selectionEnd ?? lastFocus.current?.end ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
    const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
    const next = `${before}${needsSpaceBefore ? " " : ""}${chip}${needsSpaceAfter ? " " : ""}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      const cursor = start + (needsSpaceBefore ? 1 : 0) + chip.length + (needsSpaceAfter ? 1 : 0);
      area.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Insert a field — fills in when the document is generated
      </p>
      <div className="max-h-28 space-y-2 overflow-y-auto pr-1">
        {groups.map(([group, items]) => (
          <div key={group} className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const area = textareaId
                      ? (document.getElementById(textareaId) as HTMLTextAreaElement | null)
                      : null;
                    if (area) rememberSelection(area);
                    insertField(field);
                  }}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
