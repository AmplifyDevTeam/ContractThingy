import { Sparkles } from "lucide-react";
import { cn } from "cn";

/** Small label for any surface that shows Gemini / AI output. */
export function AiHint({
  children = "AI suggestion",
  className,
  pending = false,
}: {
  children?: React.ReactNode;
  className?: string;
  pending?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase",
        className,
      )}
      title="Generated or ranked by Gemini. Approved legal wording still comes from the library."
    >
      <Sparkles className="size-2.5 shrink-0" aria-hidden />
      {pending ? "Asking AI…" : children}
    </span>
  );
}

/** Inline note under AI copy. */
export function AiCaption({
  children = "AI suggestion — verify before you act. Library wording stays the source of truth.",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground", className)}>
      <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
