import { NextResponse } from "next/server";
import {
  hashPassword,
  requireSiteAdminOrMaster,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SITE_LABELS,
  parseSiteLabels,
  serializeSiteLabels,
  UI_LABELS_SETTING_KEY,
  type SiteLabels,
} from "@/lib/site-labels";
import {
  defaultLabelsForPreset,
  isSitePresetId,
  parseSitePreset,
  SITE_PRESETS,
  type SitePresetId,
} from "@/lib/site-presets";

export const dynamic = "force-dynamic";

function resolveSiteId(
  sessionSiteId: number | null,
  querySiteId: string | null,
): number | null {
  if (sessionSiteId != null) return sessionSiteId;
  if (!querySiteId) return null;
  const id = Number(querySiteId);
  return Number.isFinite(id) ? id : null;
}

export async function GET(request: Request) {
  const auth = await requireSiteAdminOrMaster();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const url = new URL(request.url);
  const siteId = resolveSiteId(auth.siteId, url.searchParams.get("siteId"));
  if (siteId == null) {
    return NextResponse.json(
      {
        success: false,
        error: "siteId query parameter required for master admin.",
      },
      { status: 400 },
    );
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      name: true,
      contact_email: true,
      preset: true,
    },
  });
  if (!site) {
    return NextResponse.json(
      { success: false, error: "Site not found." },
      { status: 404 },
    );
  }

  const settings = await prisma.setting.findMany({
    where: { site_id: siteId },
    orderBy: { key: "asc" },
  });

  const toolCategories = settings.find((s) => s.key === "tool_categories");
  const dashboardPrefs = settings.find((s) => s.key === "dashboard_preferences");
  const uiLabelsRow = settings.find((s) => s.key === UI_LABELS_SETTING_KEY);

  return NextResponse.json({
    success: true,
    site: {
      ...site,
      preset: parseSitePreset(site.preset),
    },
    presets: SITE_PRESETS,
    toolCategories: toolCategories?.value ?? "[]",
    dashboardPreferences: dashboardPrefs?.value ?? "{}",
    uiLabels: parseSiteLabels(uiLabelsRow?.value ?? null),
  });
}

type PatchBody = {
  siteId?: number;
  displayName?: string;
  contactEmail?: string;
  sitePassword?: string;
  siteAdminPassword?: string;
  toolCategories?: string;
  dashboardPreferences?: string;
  uiLabels?: Partial<SiteLabels>;
  preset?: SitePresetId;
  resetLabelsToPreset?: boolean;
};

export async function PATCH(request: Request) {
  const auth = await requireSiteAdminOrMaster();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const siteId =
    auth.siteId ??
    (body.siteId != null && Number.isFinite(body.siteId) ? body.siteId : null);
  if (siteId == null) {
    return NextResponse.json(
      { success: false, error: "siteId is required." },
      { status: 400 },
    );
  }

  const data: {
    name?: string;
    contact_email?: string;
    password_hash?: string;
    site_admin_password_hash?: string;
    preset?: string;
  } = {};

  if (body.displayName?.trim()) {
    const name = body.displayName.trim().replace(/\s+/g, "");
    const clash = await prisma.site.findFirst({
      where: { name, NOT: { id: siteId } },
    });
    if (clash) {
      return NextResponse.json(
        { success: false, error: "That site name is already in use." },
        { status: 409 },
      );
    }
    data.name = name;
  }
  if (body.contactEmail?.trim()) {
    data.contact_email = body.contactEmail.trim();
  }
  if (body.sitePassword) {
    if (body.sitePassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Site password must be at least 8 characters." },
        { status: 400 },
      );
    }
    data.password_hash = await hashPassword(body.sitePassword);
  }
  if (body.siteAdminPassword) {
    if (body.siteAdminPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Site admin password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }
    data.site_admin_password_hash = await hashPassword(body.siteAdminPassword);
  }

  let presetForLabels: SitePresetId | null = null;
  if (body.preset != null) {
    if (!isSitePresetId(body.preset)) {
      return NextResponse.json(
        { success: false, error: "Invalid operation preset." },
        { status: 400 },
      );
    }
    data.preset = body.preset;
    presetForLabels = body.preset;
  }

  if (Object.keys(data).length) {
    await prisma.site.update({ where: { id: siteId }, data });
  }

  if (body.toolCategories != null) {
    await prisma.setting.upsert({
      where: { site_id_key: { site_id: siteId, key: "tool_categories" } },
      create: {
        site_id: siteId,
        key: "tool_categories",
        value: body.toolCategories,
      },
      update: { value: body.toolCategories },
    });
  }

  if (body.dashboardPreferences != null) {
    await prisma.setting.upsert({
      where: { site_id_key: { site_id: siteId, key: "dashboard_preferences" } },
      create: {
        site_id: siteId,
        key: "dashboard_preferences",
        value: body.dashboardPreferences,
      },
      update: { value: body.dashboardPreferences },
    });
  }

  const shouldResetLabels =
    presetForLabels != null && body.resetLabelsToPreset === true;
  if (shouldResetLabels && presetForLabels) {
    const value = serializeSiteLabels(defaultLabelsForPreset(presetForLabels));
    await prisma.setting.upsert({
      where: {
        site_id_key: { site_id: siteId, key: UI_LABELS_SETTING_KEY },
      },
      create: {
        site_id: siteId,
        key: UI_LABELS_SETTING_KEY,
        value,
      },
      update: { value },
    });
  } else if (body.uiLabels != null) {
    const merged = parseSiteLabels({
      ...DEFAULT_SITE_LABELS,
      ...body.uiLabels,
    });
    const value = serializeSiteLabels(merged);
    await prisma.setting.upsert({
      where: {
        site_id_key: { site_id: siteId, key: UI_LABELS_SETTING_KEY },
      },
      create: {
        site_id: siteId,
        key: UI_LABELS_SETTING_KEY,
        value,
      },
      update: { value },
    });
  }

  return NextResponse.json({ success: true });
}
