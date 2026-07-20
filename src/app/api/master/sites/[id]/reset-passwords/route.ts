import { NextResponse } from "next/server";
import { hashPassword, requireMasterAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST body: { resetSitePassword?: string; resetSiteAdminPassword?: string } */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireMasterAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { id: idRaw } = await context.params;
  const siteId = Number(idRaw);
  if (!Number.isFinite(siteId)) {
    return NextResponse.json(
      { success: false, error: "Invalid site id." },
      { status: 400 },
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

  const sitePassword = String(body.resetSitePassword ?? "").trim();
  const adminPassword = String(body.resetSiteAdminPassword ?? "").trim();
  if (!sitePassword && !adminPassword) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide resetSitePassword and/or resetSiteAdminPassword.",
      },
      { status: 400 },
    );
  }

  const data: {
    password_hash?: string;
    site_admin_password_hash?: string;
  } = {};
  if (sitePassword) {
    if (sitePassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Site password must be at least 8 characters." },
        { status: 400 },
      );
    }
    data.password_hash = await hashPassword(sitePassword);
  }
  if (adminPassword) {
    if (adminPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Site admin password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }
    data.site_admin_password_hash = await hashPassword(adminPassword);
  }

  await prisma.site.update({ where: { id: siteId }, data });
  return NextResponse.json({ success: true });
}
