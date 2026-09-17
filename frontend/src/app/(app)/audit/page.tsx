import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Bento, Stat, Tile } from "@/components/bento";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { AuditEvent } from "@/lib/types";

export default async function AuditPage() {
  await requirePermission("audit.read");
  const { events: raw } = await apiGet<{ events: AuditEvent[] }>("/audit");
  const events = [...raw].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = events.filter((item) => item.timestamp.startsWith(today)).length;

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Security"
        title="Audit log"
        description="Append-only history. Normal users cannot edit or delete these records."
      />
      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Trail" span={2} rowSpan={2}>
          <div className="mt-4">
            {events.map((event) => (
              <div key={event.id} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-t border-border py-3 first:border-t">
                <div className="font-mono text-[11px] text-muted-foreground">
                  {format(new Date(event.timestamp), "d MMM HH:mm")}
                </div>
                <div>
                  <div className="text-[15px] font-medium">{event.type.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    {event.actorName ?? "system"} · {event.summary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Tile>
        <Tile kicker="Today">
          <Stat value={todayCount} hint="Events recorded since midnight" />
        </Tile>
        <Tile kicker="Total">
          <Stat value={events.length} hint="Append-only. Nothing here can be edited." />
        </Tile>
      </Bento>
    </div>
  );
}
