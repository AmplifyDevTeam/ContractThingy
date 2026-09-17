import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile, TileLink } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { CompanyRecord, ContractDocument, SourceDocument } from "@/lib/types";
import { readSourceAnalysis, TYPE_LABELS } from "@/lib/knowledge/library";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("companies.read");
  const { id } = await params;
  let payload: { company: CompanyRecord; documents: ContractDocument[]; sources: SourceDocument[] };
  try {
    payload = await apiGet(`/companies/${id}`);
  } catch {
    notFound();
  }
  const { company, documents, sources } = payload;
  const open = documents.filter((item) => !["FINALIZED", "VOIDED", "EXPIRED"].includes(item.status)).length;

  return (
    <div>
      <PageHeader
        back={{ href: "/companies", label: "Clients" }}
        index="05"
        kicker={company.companyType}
        title={company.legalName}
        description={`${company.primaryContact} · ${company.email}`}
        actions={
          <Button asChild>
            <Link href="/generate">Generate document</Link>
          </Button>
        }
      />

      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Client" span={2} rowSpan={2} action={<TileLink href="/generate">Generate</TileLink>}>
          <p className="font-display mt-4 text-[2.5rem] leading-none tracking-tight">{company.legalName}</p>
          <p className="mt-3 text-sm text-muted-foreground">{company.displayName !== company.legalName ? company.displayName : company.primaryContact}</p>
          <MetaList
            rows={[
              ["Primary contact", company.primaryContact],
              ["Email", company.email],
              ["Jurisdiction", company.jurisdiction || "—"],
              ["Status", company.relationshipStatus.replaceAll("_", " ")],
              ["Type", company.companyType.replaceAll("_", " ")],
            ]}
          />
        </Tile>
        <Tile kicker="Agreements">
          <Stat value={documents.length} size="md" hint={`${open} open`} />
        </Tile>
        <Tile kicker="Source PDFs">
          <Stat value={sources.length} size="md" />
        </Tile>
      </Bento>

      {sources.length > 0 ? (
        <div className="mt-3">
          <Bento>
            <Tile kicker="Source agreements" span={3}>
              <div className="mt-2">
                {sources.map((source, index) => {
                  const analysis = readSourceAnalysis(source);
                  return (
                    <div key={source.id} className="border-b border-border py-4 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <span className="font-mono text-[11px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <div className="font-medium">{analysis?.title ?? TYPE_LABELS[source.detectedType ?? ""] ?? source.fileName}</div>
                            <div className="text-[13px] text-muted-foreground">
                              {format(new Date(source.uploadedAt), "d MMM yyyy")}
                              {analysis?.monthlyFee ? ` · ${analysis.monthlyFee}` : ""}
                            </div>
                            {analysis?.summary ? (
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
                            ) : null}
                          </div>
                        </div>
                        <a href={`/api/knowledge/${source.id}/pdf`} className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
                          Open PDF
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Tile>
          </Bento>
        </div>
      ) : null}

      <div className="mt-3">
        <Bento>
          <Tile kicker="Contract history" span={3} action={<TileLink href="/generate">New</TileLink>}>
            <div className="mt-2">
              {documents.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No documents yet for this client.</p> : null}
              {documents.map((doc, index) => (
                <IndexRow
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  n={String(index + 1).padStart(2, "0")}
                  title={doc.name}
                  meta={`${doc.readableId} · ${format(new Date(doc.createdAt), "d MMM yyyy")}`}
                  trailing={<StatusBadge status={doc.status} />}
                />
              ))}
            </div>
          </Tile>
        </Bento>
      </div>
    </div>
  );
}
