import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/api";

function apiBase() {
  return (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/$/,
    "",
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const res = await fetch(`${apiBase()}/documents/${id}/pdf`, {
    headers: token
      ? { Authorization: `Bearer ${token}`, Cookie: `${SESSION_COOKIE}=${token}` }
      : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "PDF unavailable" }, { status: res.status });
  }
  const bytes = await res.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="${id}.pdf"`,
    },
  });
}
