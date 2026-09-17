import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentLiveSync } from "@/components/documents/document-live-sync";
import { DocumentThemePicker } from "@/components/documents/document-theme-picker";
import { SigningLinkPanel } from "@/components/documents/signing-panel";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { themeById } from "@/lib/branding/themes";
import { apiGet } from "@/lib/api";
import type {
  AuditEvent,
  ContractDocument,
  DocumentRelationship,
  DocumentVersion,
  SigningRequest,
} from "@/lib/types";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("documents.read");
  const { id } = await params;
  let data: {
    document: ContractDocument;
    version: DocumentVersion | null;
    relationships: DocumentRelationship[];
    audits: AuditEvent[];
    signing: SigningRequest[];
    relatedDocs: ContractDocument[];
    html: string;
    aiThemeEnabled: boolean;
  };
  try {
    data = await apiGet(`/documents/${id}`);
  } catch {
    notFound();
  }
  const { document, version, relationships, audits, signing, relatedDocs, html, aiThemeEnabled } = data;
  const activeSigning = signing
    .filter((item) => item.status !== "revoked")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const canEditTheme = hasPermission(session.role, "documents.edit");

  return (
    <div>
      <DocumentLiveSync
        documentId={document.id}
        status={document.status}
        signingStatus={activeSigning?.status ?? null}
        lastActivityAt={document.lastActivityAt ?? document.updatedAt}
      />
      <PageHeader
        back={{ href: "/documents", label: "Documents" }}
        kicker={document.readableId}
        title={document.name}
        description={`${document.partyName} · template ${document.templateId} locked to version ${document.templateVersionId}`}
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <a href={`/api/documents/${document.id}/pdf`}>Download PDF</a>
            </Button>
            <StatusBadge status={document.status} />
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          <iframe
            title="Document"
            className="min-h-[80vh] w-full rounded-md border border-border bg-muted"
            srcDoc={html}
          />
          <section className="rounded-md border border-border bg-card px-5 py-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-[12px] font-medium text-muted-foreground">Audit</h3>
              <p className="font-mono text-[11px] text-muted-foreground">{audits.length} events</p>
            </div>
            {audits.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No activity recorded for this document yet.</p>
            ) : (
              <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                {audits
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="grid gap-1 border-b border-border/70 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-start sm:gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium">{event.type.replaceAll("_", " ")}</div>
                        <div className="mt-0.5 text-[13px] text-muted-foreground">{event.summary}</div>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground sm:text-right">
                        {format(new Date(event.timestamp), "d MMM yyyy HH:mm")}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
        <aside className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
          <Inspector title="Snapshot">
            <p>Created {format(new Date(document.createdAt), "d MMM yyyy HH:mm")}</p>
            <p>Template version: {version?.snapshot.templateVersion}</p>
            <p>Clause versions: {version?.snapshot.clauseVersionIds.length ?? 0}</p>
            {document.sha256 ? (
              <p className="break-all font-mono text-[11px] text-muted-foreground">SHA-256 {document.sha256}</p>
            ) : null}
            {document.personId ? (
              <p>
                Party profile:{" "}
                <Link className="text-primary" href={`/people/${document.personId}`}>
                  {document.partyName}
                </Link>
              </p>
            ) : null}
            {document.companyId ? (
              <p>
                Client profile:{" "}
                <Link className="text-primary" href={`/companies/${document.companyId}`}>
                  {document.partyName}
                </Link>
              </p>
            ) : null}
          </Inspector>
          <Inspector title="Relationships">
            {relationships.length === 0 ? <p className="text-muted-foreground">No related documents.</p> : null}
            {relationships.map((rel) => {
              const otherId = rel.fromDocumentId === id ? rel.toDocumentId : rel.fromDocumentId;
              const other = relatedDocs.find((item) => item.id === otherId);
              return (
                <div key={rel.id}>
                  <div className="text-[11px] text-muted-foreground">{rel.type.replaceAll("_", " ")}</div>
                  <Link href={`/documents/${otherId}`} className="text-primary">
                    {other?.readableId ?? otherId}
                  </Link>
                  <div className="text-muted-foreground">{other?.name}</div>
                </div>
              );
            })}
          </Inspector>
          <Inspector title="PDF design">
            {canEditTheme ? (
              <DocumentThemePicker
                documentId={document.id}
                themeId={document.themeId}
                locked={document.status === "VOIDED"}
                aiEnabled={aiThemeEnabled}
              />
            ) : (
              <p className="text-muted-foreground">
                {themeById(document.themeId)?.name ?? document.themeId}
              </p>
            )}
          </Inspector>
          <Inspector title="Signing">
            {signing.length === 0 ? <p className="text-muted-foreground">Not sent yet.</p> : null}
            {signing
              .filter((item) => item.status !== "revoked")
              .map((item) => (
                <div key={item.id} className="space-y-1">
                  <div>{item.recipientName}</div>
                  <div className="text-muted-foreground">{item.recipientEmail}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className="text-muted-foreground">
                      expires {format(new Date(item.expiresAt), "d MMM yyyy")}
                    </span>
                  </div>
                  {item.recipientSignedAt ? (
                    <p className="text-[12px] text-muted-foreground">
                      Recipient signed {format(new Date(item.recipientSignedAt), "d MMM yyyy HH:mm")}
                    </p>
                  ) : null}
                </div>
              ))}
            <SigningLinkPanel
              documentId={document.id}
              status={document.status}
              recipientEmail={signing.find((item) => item.status !== "revoked")?.recipientEmail}
            />
          </Inspector>
          <div className="border-t border-border px-5 py-5">
            <DocumentActions document={document} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Inspector({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border px-5 py-5 first:border-t-0">
      <h3 className="mb-3 text-[12px] font-medium text-muted-foreground">{title}</h3>
      <div className="space-y-2 text-[13px]">{children}</div>
    </section>
  );
}
