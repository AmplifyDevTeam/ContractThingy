import { NextResponse } from "next/server";
import { apiBase } from "@/lib/api-base";

/** Public: signed copy for the recipient (only once the agreement is finalized). */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const res = await fetch(`${apiBase()}/sign/${encodeURIComponent(token)}/pdf`, { cache: "no-store" });
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return NextResponse.json({ error: data?.error ?? "Signed copy unavailable" }, { status: res.status });
  }
  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType || "application/pdf",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? "inline",
      "Cache-Control": "private, no-store",
      ...(contentType.includes("text/html")
        ? { "Content-Security-Policy": "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'" }
        : {}),
    },
  });
}
