import { format } from "date-fns";
import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, Stat, Tile } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { Template } from "@/lib/types";

export default async function TemplatesPage() {
  await requirePermission("templates.read");
  const { templates } = await apiGet<{ templates: Template[] }>("/templates");
  const employment = templates.filter((item) => item.category === "EMPLOYMENT").length;
  const client = templates.filter((item) => item.category === "CLIENT").length;

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Library"
        title="Templates"
        description="Approved templates are versioned. Generating a document always locks the template version used."
      />
      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Approved set" span={2} rowSpan={2}>
          <div className="mt-2">
            {templates.map((template, index) => (
              <IndexRow
                key={template.id}
                href={`/templates/${template.id}`}
                n={String(index + 1).padStart(2, "0")}
                title={template.name}
                meta={`${template.category} · v${template.currentVersion} · ${format(new Date(template.updatedAt), "d MMM yyyy")}`}
                trailing={<StatusBadge status={template.status} />}
              />
            ))}
          </div>
        </Tile>
        <Tile kicker="Employment">
          <Stat value={employment} hint="Family used for staff agreements" />
        </Tile>
        <Tile kicker="Client">
          <Stat value={client} hint="Lead gen, collaboration, media buying" />
        </Tile>
      </Bento>
    </div>
  );
}
