import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/api";
import { apiBase } from "@/lib/api-base";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const res = await fetch(`${apiBase()}/documents/${encodeURIComponent(id)}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!res.ok || !contentType.includes("application/pdf")) {
    // PDF rendering unavailable: open the print view (Save as PDF in the browser).
    if (res.status === 503 || (res.ok && contentType.includes("text/html"))) {
      return NextResponse.redirect(new URL(`/api/documents/${encodeURIComponent(id)}/print`, request.url));
    }
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return NextResponse.json({ error: data?.error ?? "PDF unavailable" }, { status: res.status });
  }
  const bytes = await res.arrayBuffer();
  const magic = new TextDecoder().decode(bytes.slice(0, 5));
  if (!magic.startsWith("%PDF")) {
    // Never label HTML (or other garbage) as a PDF download — Chrome then fails to open it.
    return NextResponse.redirect(new URL(`/api/documents/${encodeURIComponent(id)}/print`, request.url));
  }
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
