import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = [/^\/login(?:\?.*)?$/, /^\/sign\//, /^\/api\/sign\//, /^\/_next\//, /^\/favicon/, /^\/.*\.(svg|png|jpg|ico)$/];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }
  const session = request.cookies.get("contractos_session");
  if (!session && pathname !== "/login") {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
