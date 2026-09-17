import { format } from "date-fns";
import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, Stat, Tile } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { Clause, Template, TemplateVersion } from "@/lib/types";

export default async function ClausesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("clauses.read");
  const { q } = await searchParams;
  const { clauses: all, templates, templateVersions: versions } = await apiGet<{
    clauses: Clause[];
    templates: Template[];
    templateVersions: TemplateVersion[];
  }>("/clauses");
  let clauses = all;
  if (q) {
    const needle = q.toLowerCase();
    clauses = clauses.filter((item) => `${item.title} ${item.category} ${item.tags.join(" ")}`.toLowerCase().includes(needle));
  }
  const approved = all.filter((item) => item.status === "approved").length;
  const optional = all.filter((item) => item.status === "optional").length;

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Library"
        title="Clause library"
        description="Approved legal wording lives here. AI can recommend clauses but cannot change this text without a new approved version."
      />
      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Wording" span={2} rowSpan={2}>
          <form className="mt-5">
            <Input name="q" defaultValue={q} placeholder="Search clauses" className="max-w-sm" />
          </form>
          <div className="mt-2">
            {clauses.map((clause, index) => {
              const used = templates.filter((template) => {
                const version = versions.find((item) => item.id === template.currentVersionId);
                return version?.sections.some((section) => section.clauseIds.includes(clause.id));
              });
              return (
                <IndexRow
                  key={clause.id}
                  href={`/clauses/${clause.id}`}
                  n={String(index + 1).padStart(2, "0")}
                  title={clause.title}
                  meta={`${clause.category} · v${clause.currentVersion} · ${used.length} templates · ${format(new Date(clause.updatedAt), "d MMM yyyy")}`}
                  trailing={<StatusBadge status={clause.status} />}
                />
              );
            })}
          </div>
        </Tile>
        <Tile kicker="Approved">
          <Stat value={approved} hint={`${all.length} in the library`} />
        </Tile>
        <Tile kicker="Optional">
          <Stat value={optional} hint="Toggled per agreement" />
        </Tile>
      </Bento>
    </div>
  );
}
