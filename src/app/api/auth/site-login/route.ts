import { NextResponse } from "next/server";
import {
  findSiteByName,
  normalizeSiteName,
  setSessionCookie,
  verifyMasterAdmin,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function isConfigError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("SESSION_SECRET") ||
      err.message.includes("environment"))
  );
}

/**
 * Site login OR master-admin bypass.
 * Body: { siteName, sitePassword, rememberMe? }
 * If siteName+sitePassword match MASTER_ADMIN_ID + master password → admin session.
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const siteName = String(body.siteName ?? body.adminId ?? "").trim();
    const sitePassword = String(body.sitePassword ?? body.password ?? "");
    const rememberMe = Boolean(body.rememberMe);

    if (!siteName || !sitePassword) {
      return NextResponse.json(
        { success: false, error: "Site name and password are required." },
        { status: 400 },
      );
    }

    // Master admin override — skip site flow entirely
    if (await verifyMasterAdmin(siteName, sitePassword)) {
      await setSessionCookie(
        { role: "master_admin", adminId: siteName.trim() },
        rememberMe,
      );
      return NextResponse.json({
        success: true,
        role: "master_admin",
        redirectTo: "/admin",
      });
    }

    const name = normalizeSiteName(siteName);
    const site = await findSiteByName(name);
    if (!site) {
      return NextResponse.json(
        { success: false, error: "Invalid site name or password." },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(sitePassword, site.password_hash);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Invalid site name or password." },
        { status: 401 },
      );
    }

    await setSessionCookie(
      { role: "site", siteId: site.id, siteName: site.name },
      rememberMe,
    );

    return NextResponse.json({
      success: true,
      role: "site",
      siteId: site.id,
      siteName: site.name,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    console.error("site-login error:", err);
    if (isConfigError(err)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Server misconfigured: SESSION_SECRET is missing on Vercel. Add it under Environment Variables and redeploy.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Login failed due to a server error." },
      { status: 500 },
    );
  }
}
