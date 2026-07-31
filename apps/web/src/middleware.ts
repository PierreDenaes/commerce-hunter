import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/scans",
  "/businesses",
  "/prospects",
  "/settings",
];

const AUTH_PAGES = ["/login", "/register"];

// Garde UX uniquement : la présence du cookie refresh_token (httpOnly, path "/")
// ne prouve pas sa validité — l'API reste l'autorité, l'intercepteur 401 de
// l'api-client gère l'expiration réelle.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("refresh_token");

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + "/"),
  );
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/scans/:path*",
    "/businesses/:path*",
    "/prospects/:path*",
    "/settings/:path*",
    "/dashboard",
    "/scans",
    "/businesses",
    "/prospects",
    "/settings",
    "/login",
    "/register",
  ],
};
