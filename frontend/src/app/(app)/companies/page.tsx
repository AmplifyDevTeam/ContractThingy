import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { CompanyRecord } from "@/lib/types";

export default async function CompaniesPage() {
  await requirePermission("companies.read");
  const { companies } = await apiGet<{ companies: CompanyRecord[] }>("/companies");
  const active = companies.filter((item) => item.relationshipStatus === "active").length;
  const prospects = companies.filter((item) => item.relationshipStatus === "prospect").length;

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Directory"
        title="Clients"
        description="Client companies and their complete contract history."
      />
      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Directory" span={2} rowSpan={2}>
          <div className="mt-2">
            {companies.map((company, index) => (
              <IndexRow
                key={company.id}
                href={`/companies/${company.id}`}
                n={String(index + 1).padStart(2, "0")}
                title={company.legalName}
                meta={`${company.primaryContact} · ${company.jurisdiction || "No jurisdiction"}`}
                trailing={<StatusBadge status={company.relationshipStatus} />}
              />
            ))}
          </div>
        </Tile>
        <Tile kicker="Active">
          <Stat value={active} hint={`${companies.length} total`} />
        </Tile>
        <Tile kicker="Pipeline">
          <Stat value={prospects} label="Prospects" />
          <MetaList
            rows={[
              ["Paused", companies.filter((item) => item.relationshipStatus === "paused").length],
              ["Churned", companies.filter((item) => item.relationshipStatus === "churned").length],
            ]}
          />
        </Tile>
      </Bento>
    </div>
  );
}
