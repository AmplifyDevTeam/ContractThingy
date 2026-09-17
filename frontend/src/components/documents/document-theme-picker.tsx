"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiCaption, AiHint } from "@/components/ai-hint";
import { themeById } from "@/lib/branding/themes";
import { recommendDocumentThemeAction, updateDocumentThemeAction } from "@/lib/actions/workspace";
import type { ThemeId } from "@/lib/types/enums";

type Suggestion = {
  themeId: ThemeId;
  reason: string;
  source: "ai" | "rules";
  label: string;
};

export function DocumentThemePicker({
  documentId,
  themeId,
  locked = false,
  aiEnabled = false,
}: {
  documentId: string;
  themeId: ThemeId;
  themes?: unknown;
  locked?: boolean;
  aiEnabled?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(themeId);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const activeTheme = themeById(selected);

  useEffect(() => {
    setSelected(themeId);
  }, [themeId]);

  useEffect(() => {
    if (locked) return;
    let cancelled = false;
    setSuggesting(true);
    void recommendDocumentThemeAction(documentId)
      .then((result) => {
        if (!cancelled) setSuggestion(result);
      })
      .catch(() => {
        /* picker still shows current theme */
      })
      .finally(() => {
        if (!cancelled) setSuggesting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, locked, aiEnabled]);

  async function applyTheme(id: ThemeId, fromAi: boolean) {
    if (locked || busy || id === selected) return;
    setBusy(true);
    const previous = selected;
    setSelected(id);
    try {
      await updateDocumentThemeAction(documentId, id);
      toast.success(fromAi ? "Applied AI-suggested PDF design" : "PDF design updated");
      router.refresh();
    } catch (error) {
      setSelected(previous);
      toast.error(error instanceof Error ? error.message : "Could not update design");
    } finally {
      setBusy(false);
    }
  }

  async function refreshSuggestion() {
    if (locked || suggesting) return;
    setSuggesting(true);
    try {
      const result = await recommendDocumentThemeAction(documentId);
      setSuggestion(result);
      toast.message(result.source === "ai" ? "AI suggested a letterhead" : "Suggested a letterhead");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not suggest a design");
    } finally {
      setSuggesting(false);
    }
  }

  const suggestedTheme = suggestion ? themeById(suggestion.themeId) : null;
  const suggestionIsActive = suggestion?.themeId === selected;

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {locked
          ? "Design is locked on voided documents."
          : "Letterhead is chosen from Amplify’s set. When Gemini is on, the pick below is an AI suggestion."}
      </p>

      {activeTheme ? (
        <div className="rounded-md border border-border px-3 py-2.5">
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Active now</p>
          <div
            className="mt-2 flex h-11 items-end overflow-hidden rounded-sm border border-border px-2.5 pb-1.5"
            style={{
              background: activeTheme.background === "dark" ? "#0c0d0b" : "#f4f4ef",
              color: activeTheme.background === "dark" ? "#e8e6e1" : "#121210",
            }}
          >
            <div className="w-full">
              <div className="h-0.5 w-8 rounded-full" style={{ background: activeTheme.accentColor }} />
              <div className="mt-1.5 truncate font-serif text-[11px] leading-none tracking-tight">
                {activeTheme.name}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {suggesting || suggestion?.source === "ai" ? (
                <AiHint pending={suggesting}>
                  {suggesting ? "AI suggesting" : "AI suggestion"}
                </AiHint>
              ) : (
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Rules suggestion
                </p>
              )}
            </div>

            {suggestion && suggestedTheme ? (
              <>
                <p className="mt-2 text-[13px] font-medium text-foreground">{suggestion.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{suggestion.reason}</p>
                {suggestion.source === "ai" ? (
                  <AiCaption>AI suggestion from the closed letterhead catalog — not free-form design.</AiCaption>
                ) : null}
                <div
                  className="mt-2 flex h-12 items-end overflow-hidden rounded-sm border border-border px-2.5 pb-1.5"
                  style={{
                    background: suggestedTheme.background === "dark" ? "#0c0d0b" : "#f4f4ef",
                    color: suggestedTheme.background === "dark" ? "#e8e6e1" : "#121210",
                  }}
                >
                  <div className="w-full">
                    <div
                      className="h-0.5 w-8 rounded-full"
                      style={{ background: suggestedTheme.accentColor }}
                    />
                    <div className="mt-1.5 truncate font-serif text-[11px] leading-none tracking-tight">
                      {suggestedTheme.name}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={locked || busy || suggestionIsActive}
                    onClick={() => void applyTheme(suggestion.themeId, suggestion.source === "ai")}
                  >
                    {suggestionIsActive
                      ? "Already active"
                      : suggestion.source === "ai"
                        ? "Apply AI suggestion"
                        : "Apply suggestion"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={locked || suggesting}
                    onClick={() => void refreshSuggestion()}
                  >
                    Suggest again
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {suggesting
                  ? "Choosing Paper White, Signal Dark, Harbor Night, or Ember Brief…"
                  : "No suggestion yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
