import Link from "next/link";
import { PageHeader, IndexRow } from "@/components/page-header";
import { Bento, Stat, Tile } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { redactPerson } from "@/lib/auth/permissions";
import { apiGet } from "@/lib/api";
import type { Person } from "@/lib/types";

export default async function PeoplePage() {
  const session = await requirePermission("people.read");
  const { people: raw } = await apiGet<{ people: Person[] }>("/people");
  const people = raw.map((person) => redactPerson(person, session.role));
  const onStaff = people.filter((item) => ["active", "probation", "on_leave"].includes(item.employmentStatus)).length;
  const left = people.filter((item) => ["resigned", "terminated"].includes(item.employmentStatus)).length;

  return (
    <div>
      <PageHeader
        kicker="Records"
        title="People"
        description="Employees, contractors, and other individuals."
        actions={
          <Button asChild>
            <Link href="/people/new">New person</Link>
          </Button>
        }
      />
      <Bento>
        <Tile kicker="Directory" span={2}>
          <div className="mt-4">
            {people.map((person, index) => (
              <IndexRow
                key={person.id}
                href={`/people/${person.id}`}
                n={String(index + 1).padStart(2, "0")}
                title={person.fullLegalName}
                meta={`${person.type} · ${person.currentJobTitle || "No title"} · ${person.salaryCurrency} ${person.currentSalary.toLocaleString()}`}
                trailing={<StatusBadge status={person.employmentStatus} />}
              />
            ))}
          </div>
        </Tile>
        <Tile kicker="On staff">
          <Stat value={onStaff} hint={`${people.length} in the directory`} />
          <dl className="mt-6 space-y-2 text-sm">
            {[
              ["Probation", people.filter((item) => item.employmentStatus === "probation").length],
              ["Left", left],
              ["Offers pending", people.filter((item) => item.employmentStatus === "offer_pending").length],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Tile>
      </Bento>
    </div>
  );
}
