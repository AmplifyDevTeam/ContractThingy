import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Bento, MetaList, Stat, Tile } from "@/components/bento";
import { Button } from "@/components/ui/button";
import { diffLines, htmlToText } from "@/lib/diff";
import { requirePermission } from "@/lib/auth/session";
import { apiGet } from "@/lib/api";
import type { ContractDocument, DocumentVersion } from "@/lib/types";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string; right?: string }>;
}) {
  await requirePermission("documents.read");
  const { left, right } = await searchParams;
  const { documents } = await apiGet<{ documents: ContractDocument[] }>("/compare");
  let leftDoc: ContractDocument | null = null;
  let rightDoc: ContractDocument | null = null;
  let leftVersion: DocumentVersion | null = null;
  let rightVersion: DocumentVersion | null = null;
  if (left && right) {
    const versions = await apiGet<{
      leftDoc: ContractDocument;
      rightDoc: ContractDocument;
      leftVersion: DocumentVersion | null;
      rightVersion: DocumentVersion | null;
    }>(`/compare/versions?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`);
    leftDoc = versions.leftDoc;
    rightDoc = versions.rightDoc;
    leftVersion = versions.leftVersion;
    rightVersion = versions.rightVersion;
  }
  const chunks =
    leftVersion && rightVersion
      ? diffLines(htmlToText(leftVersion.snapshot.renderedHtml), htmlToText(rightVersion.snapshot.renderedHtml))
      : [];
  const added = chunks.filter((chunk) => chunk.type === "added").length;
  const removed = chunks.filter((chunk) => chunk.type === "removed").length;

  return (
    <div>
      <PageHeader
        back={{ href: "/documents", label: "Documents" }}
        kicker="Review"
        title="Compare documents"
        description="Deterministic visual diff. AI is not required."
      />

      <Bento className="md:grid-rows-[auto_auto]">
        <Tile kicker="Select pair" span={2} rowSpan={2}>
          <form className="mt-5 grid gap-3">
            <select
              name="left"
              defaultValue={left}
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Left document</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.readableId} — {doc.name}
                </option>
              ))}
            </select>
            <select
              name="right"
              defaultValue={right}
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Right document</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.readableId} — {doc.name}
                </option>
              ))}
            </select>
            <Button className="w-fit" type="submit">
              Compare
            </Button>
          </form>
          {leftDoc && rightDoc ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {leftDoc.readableId} ({format(new Date(leftDoc.createdAt), "d MMM yyyy")}) vs {rightDoc.readableId} (
              {format(new Date(rightDoc.createdAt), "d MMM yyyy")})
            </p>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Pick two generated agreements to see line-level changes.</p>
          )}
        </Tile>
        <Tile kicker="Added lines">
          <Stat value={added} size="md" />
        </Tile>
        <Tile kicker="Removed lines">
          <Stat value={removed} size="md" />
          <MetaList rows={[["Unchanged", chunks.filter((chunk) => chunk.type === "equal").length]]} />
        </Tile>
      </Bento>

      <div className="mt-3">
        <Bento>
          <Tile kicker="Diff" span={3} pad={false}>
            <div className="max-h-[70vh] space-y-1 overflow-auto p-6 font-mono text-xs leading-6">
              {chunks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No diff yet.</p>
              ) : (
                chunks.map((chunk, index) => (
                  <div
                    key={`${chunk.type}-${index}`}
                    className={
                      chunk.type === "added"
                        ? "bg-primary/10 text-primary"
                        : chunk.type === "removed"
                          ? "bg-destructive/10 text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {chunk.type === "added" ? "+ " : chunk.type === "removed" ? "- " : "  "}
                    {chunk.value}
                  </div>
                ))
              )}
            </div>
          </Tile>
        </Bento>
      </div>
    </div>
  );
}
