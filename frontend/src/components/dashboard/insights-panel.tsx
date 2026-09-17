"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DashTile } from "@/components/dashboard/motion";
import { AiCaption, AiHint } from "@/components/ai-hint";
import { getDashboardInsightsAction } from "@/lib/actions/workspace";
import type {
  DashboardInsightSnapshot,
  DashboardInsightsResult,
} from "@/lib/dashboard/insights";

const toneDot: Record<DashboardInsightsResult["insights"][number]["tone"], string> = {
  urgent: "bg-amber-500",
  watch: "bg-primary/80",
  ok: "bg-muted-foreground/50",
};

export function DashboardInsightsPanel({
  initial,
  snapshot,
  aiEnabled,
}: {
  initial: DashboardInsightsResult;
  snapshot: DashboardInsightSnapshot;
  aiEnabled: boolean;
}) {
  const [result, setResult] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [askedAi, setAskedAi] = useState(false);

  useEffect(() => {
    if (!aiEnabled || askedAi) return;
    setAskedAi(true);
    startTransition(() => {
      void getDashboardInsightsAction(snapshot)
        .then((next) => setResult(next))
        .catch(() => {
          /* keep rules */
        });
    });
  }, [aiEnabled, askedAi, snapshot]);

  const fromAi = result.source === "ai";

  return (
    <DashTile className="md:col-span-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          {fromAi || pending ? (
            <AiHint pending={pending}>{fromAi ? "AI insights" : "AI insights"}</AiHint>
          ) : (
            <p className="text-[12px] text-muted-foreground">Workspace insights</p>
          )}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {pending
            ? "Asking Gemini…"
            : fromAi
              ? "Gemini suggestion"
              : aiEnabled
                ? "Rules · AI standby"
                : "Rules only"}
        </p>
      </div>

      <p className="font-display mt-4 max-w-[36ch] text-[1.65rem] leading-tight tracking-tight">
        {result.headline}
      </p>
      {fromAi ? (
        <AiCaption>AI suggestion based on today’s metrics — not a legal or HR decision.</AiCaption>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {result.insights.map((insight) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${toneDot[insight.tone]}`}
                    aria-hidden
                  />
                  <p className="text-[14px] font-medium leading-snug text-foreground">{insight.title}</p>
                </div>
                {fromAi ? <AiHint className="shrink-0">AI</AiHint> : null}
              </div>
              <p className="mt-2 pl-3.5 text-[13px] leading-relaxed text-muted-foreground">
                {insight.detail}
              </p>
            </>
          );

          if (insight.href) {
            return (
              <Link
                key={insight.id}
                href={insight.href}
                data-dash-row
                className="rounded-sm border border-border/80 px-3.5 py-3 transition-colors hover:bg-muted/40"
              >
                {body}
              </Link>
            );
          }

          return (
            <div key={insight.id} className="rounded-sm border border-border/80 px-3.5 py-3">
              {body}
            </div>
          );
        })}
      </div>
    </DashTile>
  );
}
