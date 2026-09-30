import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/api";
import { apiBase } from "@/lib/api-base";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const res = await fetch(`${apiBase()}/knowledge/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    const message =
      res.status === 404
        ? "This source PDF has not been uploaded to the workspace yet. Run `npm run upload:sources` from the backend."
        : res.status === 403
          ? "You do not have access to source agreements."
          : data?.error ?? "File unavailable";
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>PDF unavailable</title><body style="font:15px system-ui;padding:40px;max-width:560px"><h1 style="font-size:20px">PDF unavailable</h1><p>${message}</p><p><a href="javascript:history.back()">Go back</a></p></body>`,
      { status: res.status, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  const bytes = await res.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `inline; filename="${id}.pdf"`,
    },
  });
}
