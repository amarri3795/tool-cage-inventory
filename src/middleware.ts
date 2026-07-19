import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "tci_session";

const PUBLIC_PATHS = [
  "/",
  "/signup",
  "/admin/login",
  "/api/auth/site-login",
  "/api/auth/signup",
  "/api/auth/admin-login",
  "/api/auth/sites",
  "/api/auth/session",
  "/api/auth/logout",
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

async function readRole(request: NextRequest): Promise<"master_admin" | "site" | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    if (payload.role === "master_admin" || payload.role === "site") {
      return payload.role;
    }
  } catch {
    return null;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    // Logged-in users hitting login pages → send them onward
    if (pathname === "/" || pathname === "/signup" || pathname === "/admin/login") {
      const role = await readRole(request);
      if (role === "master_admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (role === "site" && pathname !== "/signup") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  const role = await readRole(request);

  if (!role) {
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

  // Admin area: master only
  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    role !== "master_admin"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Master admin required." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
