import { NextResponse } from "next/server";
import {
  hashPassword,
  normalizeSiteName,
  setSessionCookie,
  verifyMasterAdmin,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  serializeSiteLabels,
  UI_LABELS_SETTING_KEY,
} from "@/lib/site-labels";
import {
  defaultLabelsForPreset,
  isSitePresetId,
  type SitePresetId,
} from "@/lib/site-presets";

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
  const presetRaw = body.preset;

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

  if (!isSitePresetId(presetRaw)) {
    return NextResponse.json(
      {
        success: false,
        error: "Select an operation preset for this site.",
      },
      { status: 400 },
    );
  }
  const preset: SitePresetId = presetRaw;

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
  const adminPlain =
    process.env.DEFAULT_SITE_ADMIN_PASSWORD?.trim() || sitePassword;
  const site_admin_password_hash = await hashPassword(adminPlain);
  const labels = defaultLabelsForPreset(preset);

  const site = await prisma.$transaction(async (tx) => {
    const created = await tx.site.create({
      data: {
        name,
        password_hash,
        site_admin_password_hash,
        contact_email: contactEmail,
        preset,
      },
    });
    await tx.setting.create({
      data: {
        site_id: created.id,
        key: UI_LABELS_SETTING_KEY,
        value: serializeSiteLabels(labels),
      },
    });
    return created;
  });

  await setSessionCookie(
    { role: "site_member", siteId: site.id, siteName: site.name },
    rememberMe,
  );

  return NextResponse.json({
    success: true,
    role: "site_member",
    siteId: site.id,
    siteName: site.name,
    preset,
    redirectTo: "/dashboard",
  });
}
