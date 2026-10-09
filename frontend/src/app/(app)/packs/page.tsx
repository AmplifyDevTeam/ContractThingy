import { PageHeader } from "@/components/page-header";
import { Bento, Stat, Tile } from "@/components/bento";
import { CreatePackDialog } from "@/components/library/create-pack-dialog";
import { PackEditor } from "@/components/library/pack-editor";
import { can, requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { DocumentPack, Template } from "@/lib/types";

export default async function PacksPage() {
  const session = await requirePermission("packs.read");
  const canWrite = can(session, "packs.write");
  const { packs, templates } = await apiGet<{ packs: DocumentPack[]; templates: Template[] }>("/packs");

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Library"
        title="Document packs"
        description="Preset bundles of approved templates. Individual documents can be deselected before generation."
        actions={canWrite ? <CreatePackDialog templates={templates} /> : undefined}
      />
      <Bento>
        {packs.map((pack, index) => (
          <Tile
            key={pack.id}
            kicker={`Pack ${String(index + 1).padStart(2, "0")}`}
            span={index === 0 ? 2 : 1}
            rowSpan={index === 0 ? 2 : 1}
          >
            {canWrite ? (
              <PackEditor pack={pack} templates={templates} />
            ) : (
              <>
                <p className="font-display mt-4 text-[2rem] leading-tight tracking-tight">{pack.name}</p>
                <p className="mt-3 max-w-[44ch] text-sm text-muted-foreground">{pack.description}</p>
                <ul className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                  {pack.templateIds.map((id) => (
                    <li key={id}>{templates.find((item) => item.id === id)?.name ?? id}</li>
                  ))}
                </ul>
              </>
            )}
          </Tile>
        ))}
        <Tile kicker="Coverage">
          <Stat value={packs.length} label="Packs" hint={`${templates.length} templates available to bundle`} />
        </Tile>
      </Bento>
    </div>
  );
}
