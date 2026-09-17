import { IndexRow, PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile } from "@/components/bento";
import { StatusBadge } from "@/components/status-badge";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { ContractDocument, SigningRequest } from "@/lib/types";

export default async function SignaturesPage() {
  await requirePermission("signing.manage");
  const { requests, documents } = await apiGet<{ requests: SigningRequest[]; documents: ContractDocument[] }>("/signatures");
  const open = requests.filter((item) => !["completed", "revoked", "expired"].includes(item.status));
  const expiring = requests.filter((item) => {
    const remaining = new Date(item.expiresAt).getTime() - Date.now();
    return item.status !== "revoked" && item.status !== "completed" && remaining > 0 && remaining < 3 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        kicker="Workflow"
        title="Signatures"
        description="Secure signing links, expiry, and countersignature queue. Tokens are random and are never document IDs."
      />
      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Queue" span={2} rowSpan={2}>
          <div className="mt-2">
            {requests.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No signing requests yet. Approve a document and send it for signature.</p>
            ) : null}
            {requests.map((request, index) => {
              const document = documents.find((item) => item.id === request.documentId);
              return (
                <IndexRow
                  key={request.id}
                  href={`/documents/${request.documentId}`}
                  n={String(index + 1).padStart(2, "0")}
                  title={document?.name ?? request.documentId}
                  meta={`${request.recipientName} · ${request.recipientEmail}`}
                  trailing={<StatusBadge status={request.status} />}
                />
              );
            })}
          </div>
        </Tile>
        <Tile kicker="Open">
          <Stat value={open.length} hint={`${requests.length} requests in total`} />
        </Tile>
        <Tile kicker="Expiring">
          <Stat value={expiring} label="Within 3 days" />
          <MetaList
            rows={[
              ["Completed", requests.filter((item) => item.status === "completed").length],
              ["Revoked", requests.filter((item) => item.status === "revoked").length],
            ]}
          />
        </Tile>
      </Bento>
    </div>
  );
}
