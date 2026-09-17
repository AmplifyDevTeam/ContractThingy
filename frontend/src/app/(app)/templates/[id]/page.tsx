import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile } from "@/components/bento";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { Template, TemplateVersion } from "@/lib/types";

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("templates.read");
  const { id } = await params;
  let payload: { template: Template; versions: TemplateVersion[] };
  try {
    payload = await apiGet(`/templates/${id}`);
  } catch {
    notFound();
  }
  const { template, versions } = payload;
  const current = versions.find((item) => item.id === template.currentVersionId);
  const sections = current?.sections.slice().sort((a, b) => a.order - b.order) ?? [];

  return (
    <div>
      <PageHeader
        back={{ href: "/templates", label: "Templates" }}
        index="06"
        kicker={template.category}
        title={template.name}
        description={template.description}
      />

      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Template" span={2} rowSpan={2}>
          <p className="font-display mt-4 text-[2.5rem] leading-none tracking-tight">{template.name}</p>
          <p className="mt-4 max-w-[48ch] text-sm text-muted-foreground">
            Current version v{template.currentVersion} is immutable once documents reference it. Creating a new version is required for wording changes.
          </p>
          <MetaList
            rows={[
              ["Category", template.category],
              ["Status", template.status],
              ["Versions", versions.length],
              ["Sections", sections.length],
            ]}
          />
        </Tile>
        <Tile kicker="Current version">
          <Stat value={`v${template.currentVersion}`} size="md" />
        </Tile>
        <Tile kicker="Sections">
          <Stat value={sections.length} size="md" />
        </Tile>
      </Bento>

      <div className="mt-3">
        <Bento>
          <Tile kicker="Section map" span={3}>
            <ol className="mt-2">
              {sections.map((section) => (
                <li key={section.id} className="border-b border-border py-4 last:border-b-0">
                  <div className="flex gap-3">
                    <span className="font-mono text-[11px] text-primary">{String(section.order).padStart(2, "0")}</span>
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="mt-1 text-[13px] text-muted-foreground">{section.clauseIds.join(", ")}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Tile>
        </Bento>
      </div>
    </div>
  );
}
