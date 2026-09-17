import Link from "next/link";
import { format } from "date-fns";
import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile, TileLink } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { ContractDocument } from "@/lib/types";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePermission("documents.read");
  const { q, status } = await searchParams;
  const { documents: all } = await apiGet<{ documents: ContractDocument[] }>("/documents");
  let documents = all;
  if (q) {
    const needle = q.toLowerCase();
    documents = documents.filter((item) =>
      [item.readableId, item.name, item.partyName, item.documentType].join(" ").toLowerCase().includes(needle),
    );
  }
  if (status) documents = documents.filter((item) => item.status === status);
  documents.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));

  const finalized = all.filter((item) => item.status === "FINALIZED").length;
  const open = all.filter((item) => ["SENT", "VIEWED", "PARTIALLY_SIGNED"].includes(item.status)).length;
  const employment = all.filter((item) => item.family === "EMPLOYMENT").length;
  const client = all.filter((item) => item.family === "CLIENT").length;

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Library"
        title="Documents"
        description="Search generated agreements. Core search is deterministic and does not require AI."
        actions={
          <Button asChild>
            <Link href="/generate">Generate</Link>
          </Button>
        }
      />
      <Bento className="md:grid-rows-[auto_auto]">
        <Tile
          kicker="Catalogue"
          span={2}
          rowSpan={2}
          action={<TileLink href="/generate">New</TileLink>}
        >
          <form className="mt-5 flex flex-wrap gap-2">
            <Input name="q" placeholder="Search ID, party, type…" defaultValue={q} className="max-w-sm" />
            <Input name="status" placeholder="Status" defaultValue={status} className="w-36" />
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
          <div className="mt-2">
            {documents.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No documents match.</p>
            ) : null}
            {documents.map((doc, index) => (
              <IndexRow
                key={doc.id}
                href={`/documents/${doc.id}`}
                n={String(index + 1).padStart(2, "0")}
                title={doc.name}
                meta={`${doc.readableId} · ${doc.partyName} · ${doc.documentType.replaceAll("_", " ")} · ${format(new Date(doc.lastActivityAt), "d MMM yyyy")}`}
                trailing={<StatusBadge status={doc.status} />}
              />
            ))}
          </div>
        </Tile>
        <Tile kicker="Finalized">
          <Stat value={finalized} hint={`${all.length} total`} />
        </Tile>
        <Tile kicker="Open signatures">
          <Stat value={open} />
          <MetaList
            rows={[
              ["Employment", employment],
              ["Client", client],
            ]}
          />
        </Tile>
      </Bento>
    </div>
  );
}
