import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, verifyAuthToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // The login page must stay public; otherwise the redirect to login loops back through this middleware.
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(adminCookieName)?.value;
  const session = token ? await verifyAuthToken(token) : null;
  if (session?.role === "admin") return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/settle"],
};
