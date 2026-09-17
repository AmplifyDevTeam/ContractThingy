import Link from "next/link";
import { format, subMonths } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { DashboardBoard, type DashboardStats } from "@/components/dashboard/board";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import {
  buildInsightSnapshot,
  ruleDashboardInsights,
} from "@/lib/dashboard/insights";
import type {
  AiSettings,
  CompanyRecord,
  ContractDocument,
  KnowledgeFinding,
  Person,
  SigningRequest,
  SourceDocument,
} from "@/lib/types";

const ACTIONABLE: ContractDocument["status"][] = [
  "REVIEW_REQUIRED",
  "READY_TO_SEND",
  "SENT",
  "VIEWED",
  "PARTIALLY_SIGNED",
];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function slimDoc(doc: ContractDocument) {
  return {
    id: doc.id,
    name: doc.name,
    readableId: doc.readableId,
    partyName: doc.partyName,
    status: doc.status,
    createdAt: doc.createdAt,
    lastActivityAt: doc.lastActivityAt,
  };
}

export default async function DashboardPage() {
  await requirePermission("documents.read");
  const data = await apiGet<{
    documents: ContractDocument[];
    requests: SigningRequest[];
    people: Person[];
    companies: CompanyRecord[];
    sources: SourceDocument[];
    findings: KnowledgeFinding[];
    ai: AiSettings | null;
    aiInsightsEnabled: boolean;
  }>("/dashboard");

  const { documents, requests, people, companies, sources, findings, aiInsightsEnabled } = data;
  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(subMonths(now, 1));
  const generatedThisMonth = documents.filter((item) => item.createdAt.startsWith(thisMonth)).length;
  const generatedLastMonth = documents.filter((item) => item.createdAt.startsWith(lastMonth)).length;
  const monthDelta = generatedThisMonth - generatedLastMonth;

  const awaitingRecipient = documents.filter((item) => ["SENT", "VIEWED"].includes(item.status)).length;
  const awaitingAmplify = documents.filter((item) => item.status === "PARTIALLY_SIGNED").length;
  const finalized = documents.filter((item) => item.status === "FINALIZED").length;
  const stillOpen = documents.filter((item) => !["FINALIZED", "VOIDED", "EXPIRED"].includes(item.status)).length;
  const completionRate = documents.length === 0 ? 0 : Math.round((finalized / documents.length) * 100);

  const expiring = requests.filter((item) => {
    const remaining = new Date(item.expiresAt).getTime() - Date.now();
    return item.status !== "revoked" && item.status !== "completed" && remaining > 0 && remaining < 3 * 24 * 60 * 60 * 1000;
  }).length;

  const attention = [...documents]
    .filter((item) => ACTIONABLE.includes(item.status))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    .slice(0, 6)
    .map(slimDoc);

  const recent = [...documents]
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    .slice(0, 6)
    .map(slimDoc);

  const activity = Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(now, 5 - index);
    const key = monthKey(date);
    return {
      key,
      label: format(date, "MMM"),
      count: documents.filter((item) => item.createdAt.startsWith(key)).length,
    };
  });
  const activityMax = Math.max(...activity.map((item) => item.count), 1);

  const onStaff = people.filter((item) => ["active", "probation", "on_leave"].includes(item.employmentStatus)).length;
  const leavers = people.filter((item) => ["resigned", "terminated"].includes(item.employmentStatus)).length;
  const pending = people.filter((item) => item.employmentStatus === "offer_pending").length;
  const interns = people.filter((item) => item.type === "intern" && !["resigned", "terminated"].includes(item.employmentStatus)).length;
  const probation = people.filter((item) => item.employmentStatus === "probation").length;

  const activeClients = companies.filter((item) => item.relationshipStatus === "active").length;
  const prospects = companies.filter((item) => item.relationshipStatus === "prospect").length;

  const employmentDocs = documents.filter((item) => item.family === "EMPLOYMENT").length;
  const clientDocs = documents.filter((item) => item.family === "CLIENT").length;
  const approvedPatterns = findings.filter((item) => item.status === "resolved").length;

  const insightSnapshot = buildInsightSnapshot({
    attention,
    generatedThisMonth,
    monthDelta,
    stillOpen,
    completionRate,
    openSignatures: awaitingRecipient + awaitingAmplify,
    awaitingRecipient,
    awaitingAmplify,
    expiring,
    onStaff,
    probation,
    pending,
    activeClients,
    prospects,
    sources: sources.length,
    approvedPatterns,
    employmentDocs,
    clientDocs,
  });
  const insights = ruleDashboardInsights(insightSnapshot);

  const stats: DashboardStats = {
    nowIso: now.toISOString(),
    attention,
    recent,
    activity,
    activityMax,
    generatedThisMonth,
    monthDelta,
    stillOpen,
    completionRate,
    openSignatures: awaitingRecipient + awaitingAmplify,
    awaitingRecipient,
    awaitingAmplify,
    expiring,
    onStaff,
    probation,
    interns,
    leavers,
    pending,
    activeClients,
    prospects,
    companiesTotal: companies.length,
    sources: sources.length,
    approvedPatterns,
    employmentDocs,
    clientDocs,
    insights,
    insightSnapshot,
    aiInsightsEnabled,
  };

  return (
    <div>
      <PageHeader
        kicker="Overview"
        title="Today"
        description={format(now, "EEEE d MMMM yyyy")}
        actions={
          <Button asChild>
            <Link href="/generate">Generate document</Link>
          </Button>
        }
      />
      <DashboardBoard stats={stats} />
    </div>
  );
}
