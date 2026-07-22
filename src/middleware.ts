import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  pathnameRequiresSiteAdmin,
} from "@/lib/site-access";
import type { SessionRole } from "@/lib/auth";

const SESSION_COOKIE = "tci_session";

const PUBLIC_PATHS = [
  "/",
  "/signup",
  "/admin/login",
  "/reset-password",
  "/api/auth/site-login",
  "/api/auth/signup",
  "/api/auth/admin-login",
  "/api/auth/site-admin-login",
  "/api/auth/password-reset/request",
  "/api/auth/sites",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/cron/automation",
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/preview")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

function normalizeRole(raw: unknown): SessionRole | null {
  if (raw === "master_admin" || raw === "site_admin" || raw === "site_member") {
    return raw;
  }
  if (raw === "site") return "site_member";
  return null;
}

async function readSession(
  request: NextRequest,
): Promise<{ role: SessionRole; siteId?: number } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    const role = normalizeRole(payload.role);
    if (!role) return null;
    if (role === "master_admin") return { role };
    const siteId =
      typeof payload.siteId === "number"
        ? payload.siteId
        : Number(payload.siteId);
    if (!Number.isFinite(siteId)) return null;
    return { role, siteId };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    if (pathname === "/" || pathname === "/signup" || pathname === "/admin/login") {
      const session = await readSession(request);
      if (session?.role === "master_admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (
        session &&
        (session.role === "site_member" || session.role === "site_admin") &&
        pathname !== "/signup"
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  const session = await readSession(request);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }
    const login = new URL("/", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/api/master")) &&
    session.role !== "master_admin"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Master admin required." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    (pathname.startsWith("/api/admin") || pathname.startsWith("/admin")) &&
    session.role !== "master_admin"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Master admin required." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    pathnameRequiresSiteAdmin(pathname) &&
    session.role === "site_member"
  ) {
    if (pathname.startsWith("/api/site-settings")) {
      return NextResponse.json(
        { success: false, error: "Site admin access required." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    pathname.startsWith("/api/site-settings") &&
    session.role !== "master_admin" &&
    session.role !== "site_admin"
  ) {
    return NextResponse.json(
      { success: false, error: "Site admin access required." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
