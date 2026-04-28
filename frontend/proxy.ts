import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

type JwtPayload = {
  exp?: number;
  email?: string;
  sub?: string;
};

const protectedRoutes = [
  "/home",
  "/dashboard",
  "/profile",
  "/team",
  "/submissions",
  "/admin",
];

const authRoutes = ["/auth"];

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    const json = atob(paddedBase64);

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);

  return payload.exp <= currentTime;
}

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthRoute(pathname: string) {
  return authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isLoggedIn = Boolean(token && !isTokenExpired(token));

  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/home/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/team/:path*",
    "/submissions/:path*",
    "/admin/:path*",
  ],
};