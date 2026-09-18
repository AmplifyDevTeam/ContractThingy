import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, Stat, Tile, TileLink } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { ContractDocument } from "@/lib/types";

export default async function ApprovalsPage() {
  await requirePermission("documents.approve");
  const { documents: waiting, cleared } = await apiGet<{
    documents: ContractDocument[];
    cleared: number;
  }>("/approvals");
  const approvedCount = cleared ?? 0;

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Workflow"
        title="Approvals"
        description="Templates can require manager approval before a document is sent for signature."
      />
      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Waiting" span={2} rowSpan={2} action={<TileLink href="/documents">Documents</TileLink>}>
          <div className="mt-2">
            {waiting.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Nothing is waiting for approval.</p>
            ) : null}
            {waiting.map((doc, index) => (
              <IndexRow
                key={doc.id}
                href={`/documents/${doc.id}`}
                n={String(index + 1).padStart(2, "0")}
                title={doc.name}
                meta={`${doc.readableId} · ${doc.partyName}`}
                trailing={<StatusBadge status={doc.status} />}
              />
            ))}
          </div>
        </Tile>
        <Tile kicker="In queue">
          <Stat value={waiting.length} hint="Review required before send" />
        </Tile>
        <Tile kicker="Cleared">
          <Stat value={approvedCount} hint="Approved or already finalized" />
        </Tile>
      </Bento>
    </div>
  );
}
