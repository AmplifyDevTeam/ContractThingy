import { format } from "date-fns";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile, TileLink } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import { readSourceAnalysis, TYPE_LABELS } from "@/lib/knowledge/library";
import type { CompanyRecord, KnowledgeFinding, Person, SourceDocument } from "@/lib/types";

function SourceRow({ doc, n }: { doc: SourceDocument; n: string }) {
  const analysis = readSourceAnalysis(doc);
  const title = analysis?.title ?? TYPE_LABELS[doc.detectedType ?? ""] ?? doc.fileName;
  const meta = [
    format(new Date(doc.uploadedAt), "d MMM yyyy"),
    analysis?.monthlyFee,
    analysis?.role,
    analysis?.verticals.length ? analysis.verticals.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">{n}</span>
            <div>
              <div className="font-medium">{title}</div>
              <div className="mt-1 text-[13px] text-muted-foreground">{meta}</div>
              {analysis?.summary ? (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
              ) : null}
              {analysis?.patterns.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.patterns.map((pattern) => (
                    <span key={pattern} className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {pattern}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <a href={`/api/knowledge/${doc.id}/pdf`} className="shrink-0 font-mono text-[11px] text-muted-foreground hover:text-foreground">
          Open PDF
        </a>
      </div>
    </div>
  );
}

export default async function KnowledgePage() {
  await requirePermission("knowledge.read");
  const { sources, findings, companies, people } = await apiGet<{
    sources: SourceDocument[];
    findings: KnowledgeFinding[];
    companies: CompanyRecord[];
    people: Person[];
  }>("/knowledge");

  const companyById = new Map(companies.map((item) => [item.id, item]));
  const personById = new Map(people.map((item) => [item.id, item]));

  const clientGrouped = new Map<string, SourceDocument[]>();
  const peopleGrouped = new Map<string, SourceDocument[]>();
  for (const source of sources) {
    const analysis = readSourceAnalysis(source);
    if (analysis?.personId) {
      const list = peopleGrouped.get(analysis.personId) ?? [];
      list.push(source);
      peopleGrouped.set(analysis.personId, list);
    } else {
      const companyId = analysis?.companyId ?? "unknown";
      const list = clientGrouped.get(companyId) ?? [];
      list.push(source);
      clientGrouped.set(companyId, list);
    }
  }

  const clientRows = [...clientGrouped.entries()].sort((a, b) =>
    (companyById.get(a[0])?.displayName ?? a[0]).localeCompare(companyById.get(b[0])?.displayName ?? b[0]),
  );
  const peopleRows = [...peopleGrouped.entries()].sort((a, b) =>
    (personById.get(a[0])?.fullLegalName ?? a[0]).localeCompare(personById.get(b[0])?.fullLegalName ?? b[0]),
  );

  const employmentFindings = findings.filter((item) => item.category.startsWith("Employment"));
  const clientFindings = findings.filter((item) => !item.category.startsWith("Employment"));
  const approved = findings.filter((item) => item.status === "resolved").length;
  const allFindings = [...employmentFindings, ...clientFindings];

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Layer 1"
        title="Knowledge base"
        description="Historical Amplify employment and client agreements are the source library. Patterns become approved clauses only after legal review — AI never writes the legal wording."
      />

      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Source library" span={2} rowSpan={2} action={<TileLink href="/generate">Use in generate</TileLink>}>
          <Stat value={sources.length} label="PDFs ingested" hint="Paraphrased findings only — full legal text stays in the stored PDF." />
          <MetaList
            rows={[
              ["People covered", peopleRows.length],
              ["Clients covered", clientRows.length],
              ["Employment findings", employmentFindings.length],
              ["Client findings", clientFindings.length],
            ]}
          />
        </Tile>
        <Tile kicker="Approved patterns">
          <Stat value={approved} size="md" />
        </Tile>
        <Tile kicker="Coverage">
          <MetaList
            rows={[
              ["Employment files", peopleRows.reduce((n, [, docs]) => n + docs.length, 0)],
              ["Client files", clientRows.reduce((n, [, docs]) => n + docs.length, 0)],
            ]}
          />
        </Tile>
      </Bento>

      <div className="mt-3">
        <Bento>
          <Tile kicker="Approved patterns" span={3} action={<span className="font-mono text-[11px] text-muted-foreground">{String(allFindings.length).padStart(2, "0")}</span>}>
            <div className="mt-2">
              {allFindings.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No patterns yet.</p> : null}
              {allFindings.map((finding, index) => (
                <div key={finding.id} className="border-b border-border py-4 last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <div className="font-medium">{finding.title}</div>
                        <div className="mt-1 text-[13px] text-muted-foreground">
                          Found in {finding.occurrenceCount} documents · {finding.category}
                          {finding.suggestedClauseId ? ` · ${finding.suggestedClauseId}` : ""}
                        </div>
                        {finding.sampleText ? (
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{finding.sampleText}</p>
                        ) : null}
                      </div>
                    </div>
                    <StatusBadge status={finding.decision ?? finding.status} />
                  </div>
                </div>
              ))}
            </div>
          </Tile>
        </Bento>
      </div>

      <div className="mt-3">
        <Bento>
          <Tile kicker="Employment agreements" span={3} action={<span className="font-mono text-[11px] text-muted-foreground">{String(peopleRows.length).padStart(2, "0")} people</span>}>
            <div className="mt-2 space-y-8">
              {peopleRows.map(([personId, docs]) => {
                const person = personById.get(personId);
                const ordered = [...docs].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
                return (
                  <div key={personId}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                      <div>
                        <Link href={`/people/${personId}`} className="font-medium hover:text-primary">
                          {person?.fullLegalName ?? personId}
                        </Link>
                        <div className="text-[13px] text-muted-foreground">
                          {[person?.currentJobTitle, person?.department].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">{String(docs.length).padStart(2, "0")} files</div>
                    </div>
                    {ordered.map((doc, index) => (
                      <SourceRow key={doc.id} doc={doc} n={String(index + 1).padStart(2, "0")} />
                    ))}
                  </div>
                );
              })}
            </div>
          </Tile>
        </Bento>
      </div>

      <div className="mt-3">
        <Bento>
          <Tile kicker="Client agreements" span={3} action={<span className="font-mono text-[11px] text-muted-foreground">{String(clientRows.length).padStart(2, "0")} clients</span>}>
            <div className="mt-2 space-y-8">
              {clientRows.map(([companyId, docs]) => {
                const company = companyById.get(companyId);
                const ordered = [...docs].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
                return (
                  <div key={companyId}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                      <div>
                        <Link href={`/companies/${companyId}`} className="font-medium hover:text-primary">
                          {company?.legalName ?? companyId}
                        </Link>
                        <div className="text-[13px] text-muted-foreground">
                          {company?.primaryContact}
                          {company?.jurisdiction ? ` · ${company.jurisdiction}` : ""}
                        </div>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">{String(docs.length).padStart(2, "0")} files</div>
                    </div>
                    {ordered.map((doc, index) => (
                      <SourceRow key={doc.id} doc={doc} n={String(index + 1).padStart(2, "0")} />
                    ))}
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
