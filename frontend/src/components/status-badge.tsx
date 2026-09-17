import type { DocumentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  DRAFT: "border-border text-muted-foreground",
  CONFIGURING: "border-border text-muted-foreground",
  REVIEW_REQUIRED: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  APPROVED: "border-primary/25 bg-primary/10 text-primary",
  READY_TO_SEND: "border-primary/25 bg-primary/10 text-primary",
  SENT: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  VIEWED: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  PARTIALLY_SIGNED: "border-primary/25 bg-primary/10 text-primary",
  SIGNED: "border-primary/25 bg-primary/10 text-primary",
  FINALIZED: "border-primary/30 bg-primary/15 text-primary",
  VOIDED: "border-destructive/30 bg-destructive/10 text-destructive",
  EXPIRED: "border-destructive/30 bg-destructive/10 text-destructive",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  partially_signed: "border-primary/25 bg-primary/10 text-primary",
  completed: "border-primary/30 bg-primary/15 text-primary",
  revoked: "border-destructive/30 bg-destructive/10 text-destructive",
  expired: "border-destructive/30 bg-destructive/10 text-destructive",
  ANALYZED: "border-primary/25 bg-primary/10 text-primary",
  reviewed: "border-primary/25 bg-primary/10 text-primary",
  approve_standard: "border-primary/25 bg-primary/10 text-primary",
  approve_optional: "border-primary/25 bg-primary/10 text-primary",
  active: "border-primary/25 bg-primary/10 text-primary",
  probation: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  on_leave: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  offer_pending: "border-border text-muted-foreground",
  resigned: "border-destructive/30 bg-destructive/10 text-destructive",
  terminated: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: DocumentStatus | string }) {
  return (
    <Badge variant="outline" className={cn("h-[22px] rounded-md px-2 text-[11px] font-medium capitalize", TONE[status] ?? "")}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
