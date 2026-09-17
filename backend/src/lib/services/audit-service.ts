import type { AuditEvent, AuditEventType } from "@/lib/types";
import type { DataStore } from "@/lib/data/store";
import type { SessionUser } from "@/lib/auth/session";
import { newId, nowIso } from "@/lib/ids";

export async function writeAudit(
  store: DataStore,
  args: {
    type: AuditEventType;
    actor?: SessionUser | null;
    entityType: string;
    entityId: string;
    summary: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  },
): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: newId("aud"),
    type: args.type,
    timestamp: nowIso(),
    actorUserId: args.actor?.userId,
    actorEmail: args.actor?.email,
    actorName: args.actor?.displayName,
    entityType: args.entityType,
    entityId: args.entityId,
    summary: args.summary,
    metadata: args.metadata ?? {},
    ipAddress: args.ipAddress,
  };
  await store.setDoc("auditEvents", event);
  return event;
}
