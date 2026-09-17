"use client";

import { useRef } from "react";
import Link from "next/link";
import { format, subMonths } from "date-fns";
import { StatusBadge } from "@/components/status-badge";
import { AnimatedNumber, DashTile, useDashboardMotion } from "@/components/dashboard/motion";
import { DashboardInsightsPanel } from "@/components/dashboard/insights-panel";
import type {
  DashboardInsightSnapshot,
  DashboardInsightsResult,
} from "@/lib/dashboard/insights";

export type DashboardDoc = {
  id: string;
  name: string;
  readableId: string;
  partyName: string;
  status: string;
  createdAt: string;
  lastActivityAt: string;
};

export type DashboardActivity = {
  key: string;
  label: string;
  count: number;
};

export type DashboardStats = {
  nowIso: string;
  attention: DashboardDoc[];
  recent: DashboardDoc[];
  activity: DashboardActivity[];
  activityMax: number;
  generatedThisMonth: number;
  monthDelta: number;
  stillOpen: number;
  completionRate: number;
  openSignatures: number;
  awaitingRecipient: number;
  awaitingAmplify: number;
  expiring: number;
  onStaff: number;
  probation: number;
  interns: number;
  leavers: number;
  pending: number;
  activeClients: number;
  prospects: number;
  companiesTotal: number;
  sources: number;
  approvedPatterns: number;
  employmentDocs: number;
  clientDocs: number;
  insights: DashboardInsightsResult;
  insightSnapshot: DashboardInsightSnapshot;
  aiInsightsEnabled: boolean;
};

export function DashboardBoard({ stats }: { stats: DashboardStats }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useDashboardMotion(rootRef);

  const now = new Date(stats.nowIso);
  const lastMonthLabel = format(subMonths(now, 1), "MMMM");

  return (
    <div ref={rootRef}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DashTile className="md:col-span-2 md:row-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">Needs attention</p>
            <Link href="/documents" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
              All documents
            </Link>
          </div>
          <p className="font-display mt-4 text-[3.25rem] leading-none tracking-tight">
            <AnimatedNumber value={stats.attention.length} delay={0.08} />
          </p>
          <p className="mt-2 max-w-[42ch] text-sm text-muted-foreground">
            Agreements waiting on review, send, or signature. This is the work that is blocked.
          </p>
          <div className="mt-8 flex-1">
            {stats.attention.length === 0 ? (
              <p className="border-t border-border pt-6 text-sm text-muted-foreground">Nothing waiting.</p>
            ) : (
              stats.attention.map((doc) => (
                <Link
                  key={doc.id}
                  data-dash-row
                  href={`/documents/${doc.id}`}
                  className="flex items-baseline justify-between gap-3 border-t border-border py-3 first:border-t"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{doc.partyName}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                      {doc.readableId} · {format(new Date(doc.lastActivityAt), "d MMM")}
                    </span>
                  </span>
                  <StatusBadge status={doc.status} />
                </Link>
              ))
            )}
          </div>
        </DashTile>

        <DashTile>
          <p className="text-[12px] text-muted-foreground">Generated this month</p>
          <p className="font-display mt-4 text-[3.25rem] leading-none tracking-tight">
            <AnimatedNumber value={stats.generatedThisMonth} delay={0.12} />
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {stats.monthDelta > 0
              ? `+${stats.monthDelta} versus ${lastMonthLabel}`
              : stats.monthDelta < 0
                ? `${stats.monthDelta} versus ${lastMonthLabel}`
                : `Level with ${lastMonthLabel}`}
          </p>
          <p className="mt-auto pt-6 text-[13px] text-muted-foreground">
            <AnimatedNumber value={stats.stillOpen} delay={0.2} className="tabular-nums" /> still open ·{" "}
            <AnimatedNumber value={stats.completionRate} delay={0.24} suffix="%" className="tabular-nums" /> finalized
            overall
          </p>
        </DashTile>

        <DashTile>
          <p className="text-[12px] text-muted-foreground">Open signatures</p>
          <p className="font-display mt-4 text-[3.25rem] leading-none tracking-tight">
            <AnimatedNumber value={stats.openSignatures} delay={0.16} />
          </p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Recipient</dt>
              <dd>
                <AnimatedNumber value={stats.awaitingRecipient} delay={0.22} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Amplify to countersign</dt>
              <dd>
                <AnimatedNumber value={stats.awaitingAmplify} delay={0.26} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Links expiring in 3 days</dt>
              <dd>
                <AnimatedNumber value={stats.expiring} delay={0.3} />
              </dd>
            </div>
          </dl>
        </DashTile>

        <DashboardInsightsPanel
          initial={stats.insights}
          snapshot={stats.insightSnapshot}
          aiEnabled={stats.aiInsightsEnabled}
        />

        <DashTile className="md:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">Six-month volume</p>
            <p className="text-[13px] text-muted-foreground">
              {stats.employmentDocs} employment · {stats.clientDocs} client
            </p>
          </div>
          <div className="mt-8 flex items-end gap-3">
            {stats.activity.map((item, index) => {
              const pct =
                item.count === 0 ? 0 : Math.max(8, (item.count / stats.activityMax) * 100);
              return (
                <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end rounded-sm bg-muted">
                    <div
                      data-dash-bar
                      data-height={`${pct}%`}
                      className="w-full rounded-sm bg-primary/80"
                      style={{ height: 0 }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{item.label}</span>
                  <span className="text-[13px]">
                    <AnimatedNumber value={item.count} delay={0.35 + index * 0.04} />
                  </span>
                </div>
              );
            })}
          </div>
        </DashTile>

        <DashTile>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">People</p>
            <Link href="/people" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
              Directory
            </Link>
          </div>
          <p className="font-display mt-4 text-[3.25rem] leading-none tracking-tight">
            <AnimatedNumber value={stats.onStaff} delay={0.2} />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">On staff</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Probation or trial</dt>
              <dd>
                <AnimatedNumber value={stats.probation} delay={0.28} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Interns</dt>
              <dd>
                <AnimatedNumber value={stats.interns} delay={0.32} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Left</dt>
              <dd>
                <AnimatedNumber value={stats.leavers} delay={0.36} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Offers pending</dt>
              <dd>
                <AnimatedNumber value={stats.pending} delay={0.4} />
              </dd>
            </div>
          </dl>
        </DashTile>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <DashTile className="md:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">Recent documents</p>
            <Link href="/documents" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="mt-4">
            {stats.recent.map((doc) => (
              <Link
                key={doc.id}
                data-dash-row
                href={`/documents/${doc.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t border-border py-3"
              >
                <span>
                  <span className="block truncate text-[15px] font-medium">{doc.name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                    {doc.readableId} · {doc.partyName} · {format(new Date(doc.createdAt), "d MMM yyyy")}
                  </span>
                </span>
                <StatusBadge status={doc.status} />
              </Link>
            ))}
          </div>
        </DashTile>

        <div className="grid gap-3">
          <Link
            data-dash-tile
            href="/companies"
            className="block rounded-md border border-border bg-card p-6 hover:bg-muted/40"
          >
            <p className="text-[12px] text-muted-foreground">Clients</p>
            <p className="font-display mt-3 text-[2.5rem] leading-none tracking-tight">
              <AnimatedNumber value={stats.activeClients} delay={0.28} />
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Active · {stats.prospects} prospect{stats.prospects === 1 ? "" : "s"} · {stats.companiesTotal} total
            </p>
          </Link>
          <Link
            data-dash-tile
            href="/knowledge"
            className="block rounded-md border border-border bg-card p-6 hover:bg-muted/40"
          >
            <p className="text-[12px] text-muted-foreground">Knowledge</p>
            <p className="font-display mt-3 text-[2.5rem] leading-none tracking-tight">
              <AnimatedNumber value={stats.sources} delay={0.32} />
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Source PDFs · {stats.approvedPatterns} approved patterns
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
