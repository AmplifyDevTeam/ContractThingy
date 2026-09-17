import { PageHeader } from "@/components/page-header";
import { Bento, Tile } from "@/components/bento";
import { PersonForm } from "@/components/people/person-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewPersonPage() {
  await requirePermission("people.write");
  return (
    <div>
      <PageHeader
        back={{ href: "/people", label: "People" }}
        kicker="Directory"
        title="New person"
        description="Create an employee, contractor, intern, or other individual."
      />
      <Bento>
        <Tile kicker="Profile" span={2}>
          <div className="mt-5">
            <PersonForm />
          </div>
        </Tile>
        <Tile kicker="Note">
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            People stay editable after creation. When someone leaves, update employment status instead of deleting the record — history and agreements stay linked.
          </p>
        </Tile>
      </Bento>
    </div>
  );
}
