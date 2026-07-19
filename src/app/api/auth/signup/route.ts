import { NextResponse } from "next/server";
import {
  hashPassword,
  normalizeSiteName,
  setSessionCookie,
  verifyMasterAdmin,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Register a new plant/site. Master admin credentials on this form bypass → /admin. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const siteName = String(body.siteName ?? "").trim();
  const sitePassword = String(body.sitePassword ?? body.password ?? "");
  const contactEmail = String(body.contactEmail ?? "").trim();
  const rememberMe = Boolean(body.rememberMe);

  // Master admin can enter ID/password in the signup fields to bypass
  if (
    siteName &&
    sitePassword &&
    (await verifyMasterAdmin(siteName, sitePassword))
  ) {
    await setSessionCookie(
      { role: "master_admin", adminId: siteName.trim() },
      rememberMe,
    );
    return NextResponse.json({
      success: true,
      role: "master_admin",
      redirectTo: "/admin",
      bypassedSignup: true,
    });
  }

  if (!siteName || !sitePassword || !contactEmail) {
    return NextResponse.json(
      {
        success: false,
        error: "Site name, password, and contact email are required.",
      },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json(
      { success: false, error: "Enter a valid contact email." },
      { status: 400 },
    );
  }

  if (sitePassword.length < 8) {
    return NextResponse.json(
      { success: false, error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const name = normalizeSiteName(siteName);
  if (name.length < 2) {
    return NextResponse.json(
      { success: false, error: "Site name is too short." },
      { status: 400 },
    );
  }

  const existing = await prisma.site.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "That site name is already registered." },
      { status: 409 },
    );
  }

  const password_hash = await hashPassword(sitePassword);
  const site = await prisma.site.create({
    data: {
      name,
      password_hash,
      contact_email: contactEmail,
    },
  });

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
}
