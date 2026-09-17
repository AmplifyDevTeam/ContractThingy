type DashboardDoc = {
  id: string;
  name: string;
  readableId: string;
  partyName: string;
  status: string;
  createdAt: string;
  lastActivityAt: string;
};

export type DashboardInsight = {
  id: string;
  title: string;
  detail: string;
  tone: "urgent" | "watch" | "ok";
  href?: string;
};

export type DashboardInsightsResult = {
  source: "ai" | "rules";
  headline: string;
  insights: DashboardInsight[];
};

export type DashboardInsightSnapshot = {
  attentionCount: number;
  attention: Array<{ readableId: string; partyName: string; status: string }>;
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
  pending: number;
  activeClients: number;
  prospects: number;
  sources: number;
  approvedPatterns: number;
  employmentDocs: number;
  clientDocs: number;
};

export function buildInsightSnapshot(input: {
  attention: DashboardDoc[];
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
  pending: number;
  activeClients: number;
  prospects: number;
  sources: number;
  approvedPatterns: number;
  employmentDocs: number;
  clientDocs: number;
}): DashboardInsightSnapshot {
  return {
    attentionCount: input.attention.length,
    attention: input.attention.slice(0, 5).map((doc) => ({
      readableId: doc.readableId,
      partyName: doc.partyName,
      status: doc.status,
    })),
    generatedThisMonth: input.generatedThisMonth,
    monthDelta: input.monthDelta,
    stillOpen: input.stillOpen,
    completionRate: input.completionRate,
    openSignatures: input.openSignatures,
    awaitingRecipient: input.awaitingRecipient,
    awaitingAmplify: input.awaitingAmplify,
    expiring: input.expiring,
    onStaff: input.onStaff,
    probation: input.probation,
    pending: input.pending,
    activeClients: input.activeClients,
    prospects: input.prospects,
    sources: input.sources,
    approvedPatterns: input.approvedPatterns,
    employmentDocs: input.employmentDocs,
    clientDocs: input.clientDocs,
  };
}

export function ruleDashboardInsights(snapshot: DashboardInsightSnapshot): DashboardInsightsResult {
  const insights: DashboardInsight[] = [];

  if (snapshot.attentionCount > 0) {
    const lead = snapshot.attention[0];
    insights.push({
      id: "blocked",
      title: `${snapshot.attentionCount} agreement${snapshot.attentionCount === 1 ? "" : "s"} blocked`,
      detail: lead
        ? `${lead.partyName} (${lead.readableId}) is ${lead.status.replaceAll("_", " ").toLowerCase()} — clear review or signing first.`
        : "Clear review, send, or signature queues before generating more volume.",
      tone: "urgent",
      href: "/documents",
    });
  }

  if (snapshot.expiring > 0) {
    insights.push({
      id: "expiring",
      title: `${snapshot.expiring} signing link${snapshot.expiring === 1 ? "" : "s"} expire in 3 days`,
      detail: "Nudge recipients or regenerate links before they go stale.",
      tone: "urgent",
      href: "/signatures",
    });
  }

  if (snapshot.awaitingAmplify > 0) {
    insights.push({
      id: "countersign",
      title: "Amplify countersignature waiting",
      detail: `${snapshot.awaitingAmplify} document${snapshot.awaitingAmplify === 1 ? "" : "s"} need company signature to finalize.`,
      tone: "watch",
      href: "/signatures",
    });
  } else if (snapshot.awaitingRecipient > 0) {
    insights.push({
      id: "recipient",
      title: "Waiting on recipient signatures",
      detail: `${snapshot.awaitingRecipient} open send${snapshot.awaitingRecipient === 1 ? "" : "s"} — follow up if viewed but unsigned.`,
      tone: "watch",
      href: "/signatures",
    });
  }

  if (snapshot.pending > 0) {
    insights.push({
      id: "offers",
      title: `${snapshot.pending} offer${snapshot.pending === 1 ? "" : "s"} pending`,
      detail: "Generate employment packets before start dates slip.",
      tone: "watch",
      href: "/people",
    });
  } else if (snapshot.probation > 0) {
    insights.push({
      id: "probation",
      title: `${snapshot.probation} on probation`,
      detail: "Watch trial end dates — promotions and amendments usually follow.",
      tone: "watch",
      href: "/people",
    });
  }

  if (snapshot.monthDelta < 0) {
    insights.push({
      id: "volume",
      title: "Generation volume softer than last month",
      detail: `${Math.abs(snapshot.monthDelta)} fewer documents so far — check whether hiring or client pipeline slowed.`,
      tone: "watch",
      href: "/generate",
    });
  } else if (snapshot.completionRate >= 70 && snapshot.attentionCount === 0) {
    insights.push({
      id: "healthy",
      title: "Pipeline looks healthy",
      detail: `${snapshot.completionRate}% finalized overall with nothing currently blocked.`,
      tone: "ok",
      href: "/documents",
    });
  }

  if (snapshot.prospects > 0 && insights.length < 4) {
    insights.push({
      id: "prospects",
      title: `${snapshot.prospects} client prospect${snapshot.prospects === 1 ? "" : "s"}`,
      detail: "Service or lead-gen packs can convert active pipeline.",
      tone: "ok",
      href: "/companies",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "quiet",
      title: "Quiet board",
      detail: "No blocked agreements or expiring links. Generate when the next hire or client deal is ready.",
      tone: "ok",
      href: "/generate",
    });
  }

  const urgent = insights.filter((item) => item.tone === "urgent").length;
  return {
    source: "rules",
    headline:
      urgent > 0
        ? "Priority work is sitting in the queue"
        : snapshot.attentionCount === 0
          ? "Workspace is clear enough to plan ahead"
          : "Operational pulse for Amplify",
    insights: insights.slice(0, 4),
  };
}
