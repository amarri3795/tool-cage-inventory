import { NextResponse } from "next/server";
import {
  getSession,
  setSessionCookie,
  verifySiteAdminPassword,
} from "@/lib/auth";
import { isSiteScopedRole } from "@/lib/site-access";

export const dynamic = "force-dynamic";

/** Elevate site_member → site_admin when admin password matches. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isSiteScopedRole(session.role) || session.siteId == null) {
    return NextResponse.json(
      { success: false, error: "Sign in with the site password first." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const adminPassword = String(body.adminPassword ?? "");
  const rememberMe = Boolean(body.rememberMe);
  if (!adminPassword) {
    return NextResponse.json(
      { success: false, error: "Site admin password is required." },
      { status: 400 },
    );
  }

  const ok = await verifySiteAdminPassword(session.siteId, adminPassword);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Invalid site admin password." },
      { status: 401 },
    );
  }

  await setSessionCookie(
    {
      role: "site_admin",
      siteId: session.siteId,
      siteName: session.siteName ?? "",
    },
    rememberMe,
  );

  return NextResponse.json({
    success: true,
    role: "site_admin",
    redirectTo: "/dashboard",
  });
}
