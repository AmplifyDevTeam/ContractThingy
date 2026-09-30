import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/api";
import { apiBase } from "@/lib/api-base";

/** Print-ready HTML of the exact stored agreement (browser "Save as PDF" fallback). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const res = await fetch(`${apiBase()}/documents/${encodeURIComponent(id)}/print`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return NextResponse.json({ error: data?.error ?? "Document unavailable" }, { status: res.status });
  }
  return new NextResponse(await res.text(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      // The agreement HTML is data, never script.
      "Content-Security-Policy": "default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    },
  });
}
