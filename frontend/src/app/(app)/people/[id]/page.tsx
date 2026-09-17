import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile, TileLink } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission, redactPerson } from "@/lib/auth/permissions";
import { apiGet } from "@/lib/api";
import type { ContractDocument, DocumentRelationship, Person, SourceDocument } from "@/lib/types";
import { readSourceAnalysis, TYPE_LABELS } from "@/lib/knowledge/library";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("people.read");
  const { id } = await params;
  let payload: { person: Person; documents: ContractDocument[]; sources: SourceDocument[] };
  try {
    payload = await apiGet(`/people/${id}`);
  } catch {
    notFound();
  }
  const person = redactPerson(payload.person, session.role);
  const documents = [...payload.documents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sources = payload.sources;
  const related: DocumentRelationship[] = [];

  return (
    <div>
      <PageHeader
        back={{ href: "/people", label: "People" }}
        index="04"
        kicker={person.employeeId || person.type}
        title={person.fullLegalName}
        description={`${person.currentJobTitle || "No current role"} · ${person.department || "Unassigned"}`}
        actions={
          <div className="flex items-center gap-2">
            {hasPermission(session.role, "people.write") ? (
              <Button asChild variant="outline">
                <Link href={`/people/${id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/generate`}>Generate document</Link>
            </Button>
          </div>
        }
      />

      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Identity" span={2} rowSpan={2} action={<TileLink href={`/people/${id}/edit`}>Edit</TileLink>}>
          <p className="font-display mt-4 text-[2.5rem] leading-none tracking-tight">{person.fullLegalName}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {person.email}
            {person.phone ? ` · ${person.phone}` : ""}
          </p>
          <MetaList
            rows={[
              ["Type", person.type],
              ["Employee ID", person.employeeId || "—"],
              ["Department", person.department || "—"],
              ["Manager", person.reportingManager || "—"],
              ["Start date", person.employmentStartDate ? format(new Date(person.employmentStartDate), "d MMM yyyy") : "—"],
            ]}
          />
        </Tile>
        <Tile kicker="Current role">
          <Stat value={person.currentJobTitle || "—"} size="md" />
        </Tile>
        <Tile kicker="Compensation">
          <Stat
            value={`${person.salaryCurrency} ${person.currentSalary.toLocaleString()}`}
            size="md"
            hint={person.employmentStatus.replaceAll("_", " ")}
          />
        </Tile>
      </Bento>

      {sources.length > 0 ? (
        <div className="mt-3">
          <Bento>
            <Tile kicker="Source agreements" span={3} action={<span className="font-mono text-[11px] text-muted-foreground">{String(sources.length).padStart(2, "0")}</span>}>
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
                              {analysis?.role ? ` · ${analysis.role}` : ""}
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
          <Tile kicker="Employment history" span={2} action={<TileLink href="/generate">Generate</TileLink>}>
            <div className="mt-2">
              {documents.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No generated documents yet.</p> : null}
              {documents.map((doc, index) => (
                <IndexRow
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  n={String(index + 1).padStart(2, "0")}
                  title={doc.name}
                  meta={`${doc.documentType.replaceAll("_", " ")} · ${format(new Date(doc.createdAt), "d MMM yyyy")}`}
                  trailing={<StatusBadge status={doc.status} />}
                />
              ))}
            </div>
          </Tile>
          <Tile kicker="Relationships">
            {related.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No linked documents.</p> : null}
            <div className="mt-4 space-y-3">
              {related.map((rel) => {
                const from = documents.find((doc) => doc.id === rel.fromDocumentId);
                const to = documents.find((doc) => doc.id === rel.toDocumentId);
                return (
                  <div key={rel.id} className="text-sm">
                    <div>{from?.readableId ?? rel.fromDocumentId}</div>
                    <div className="py-1 font-mono text-[11px] text-primary uppercase">{rel.type.replaceAll("_", " ")}</div>
                    <div>{to?.readableId ?? rel.toDocumentId}</div>
                  </div>
                );
              })}
            </div>
          </Tile>
        </Bento>
      </div>
    </div>
  );
}
