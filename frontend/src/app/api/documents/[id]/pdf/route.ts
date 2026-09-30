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
    // PDF rendering unavailable on this deployment: fall back to the browser print view.
    if (res.status === 503 || (res.ok && !contentType.includes("application/pdf"))) {
      return NextResponse.redirect(new URL(`/api/documents/${encodeURIComponent(id)}/print`, request.url));
    }
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return NextResponse.json({ error: data?.error ?? "PDF unavailable" }, { status: res.status });
  }
  const bytes = await res.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
