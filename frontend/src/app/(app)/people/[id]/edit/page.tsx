import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Bento, Tile } from "@/components/bento";
import { PersonForm } from "@/components/people/person-form";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { Person } from "@/lib/types";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("people.write");
  const { id } = await params;
  let person: Person;
  try {
    person = (await apiGet<{ person: Person }>(`/people/${id}`)).person;
  } catch {
    notFound();
  }

  return (
    <div>
      <PageHeader
        back={{ href: `/people/${id}`, label: person.fullLegalName }}
        kicker={person.employeeId || person.type}
        title={`Edit ${person.fullLegalName}`}
        description="Update role, compensation, or status — including when someone leaves."
      />
      <Bento>
        <Tile kicker="Profile" span={2}>
          <div className="mt-5">
            <PersonForm person={person} />
          </div>
        </Tile>
        <Tile kicker="Leaving">
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Set status to resigned or terminated when someone leaves. Keep the person record so past agreements and knowledge links stay intact.
          </p>
        </Tile>
      </Bento>
    </div>
  );
}
