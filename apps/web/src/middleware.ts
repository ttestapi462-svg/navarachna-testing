import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("navarachna_session")?.value;
  const { pathname } = request.nextUrl;

  // 1. If accessing /login:
  if (pathname === "/login") {
    // If accessing with an explicit reason (e.g. superseded, terminated, expired),
    // strip the session cookie on response headers and allow /login to render!
    if (request.nextUrl.searchParams.has("reason")) {
      const response = NextResponse.next();
      response.cookies.delete("navarachna_session");
      return response;
    }

    if (sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 2. If accessing protected routes (root / or /dashboard) without session cookie, redirect to /login
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
