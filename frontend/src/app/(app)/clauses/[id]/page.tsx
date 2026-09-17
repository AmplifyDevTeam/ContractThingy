import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile } from "@/components/bento";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { Clause, ClauseVersion, Template, TemplateVersion } from "@/lib/types";

export default async function ClauseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("clauses.read");
  const { id } = await params;
  let payload: { clause: Clause; versions: ClauseVersion[]; templates: Template[]; templateVersions: TemplateVersion[] };
  try {
    payload = await apiGet(`/clauses/${id}`);
  } catch {
    notFound();
  }
  const { clause, versions, templates, templateVersions } = payload;
  const current = versions.find((item) => item.id === clause.currentVersionId);
  const used = templates.filter((template) =>
    templateVersions
      .find((item) => item.id === template.currentVersionId)
      ?.sections.some((section) => section.clauseIds.includes(id)),
  );

  return (
    <div>
      <PageHeader
        back={{ href: "/clauses", label: "Clauses" }}
        index="07"
        kicker={clause.category}
        title={clause.title}
        description={clause.description}
      />

      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Approved wording" span={2} rowSpan={2} pad={false}>
          <div className="px-6 pt-6">
            <p className="text-[12px] text-muted-foreground">Approved wording</p>
          </div>
          <div
            className="prose max-w-none px-6 py-5 text-sm leading-7 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: current?.legalText ?? "" }}
          />
        </Tile>
        <Tile kicker="Current version">
          <Stat value={`v${clause.currentVersion}`} size="md" />
        </Tile>
        <Tile kicker="Used by">
          <Stat value={used.length} size="md" hint="templates" />
        </Tile>
      </Bento>

      <div className="mt-3">
        <Bento>
          <Tile kicker="Templates" span={2}>
            <ul className="mt-4 space-y-2 text-sm">
              {used.length === 0 ? <li className="text-muted-foreground">Not referenced by a current template.</li> : null}
              {used.map((template) => (
                <li key={template.id}>{template.name}</li>
              ))}
            </ul>
          </Tile>
          <Tile kicker="Version history">
            <MetaList
              rows={versions.map((version) => [
                `v${version.version}`,
                `${version.status} · ${version.changeNotes || "—"}`,
              ])}
            />
          </Tile>
        </Bento>
      </div>
    </div>
  );
}
