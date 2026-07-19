import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminSettings,
  getSettingRows,
  updateAdminSettings,
  type SettingsUpdateInput,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const [settings, rows] = await Promise.all([
    getAdminSettings(),
    getSettingRows(),
  ]);

  return NextResponse.json({
    success: true,
    settings,
    rows,
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Expected settings object" },
      { status: 400 },
    );
  }

  const input = body as SettingsUpdateInput;
  const settings = await updateAdminSettings(input, {
    user: `Admin:${auth.badgeId}`,
  });

  return NextResponse.json({
    success: true,
    settings,
    updated_by: auth.badgeId,
  });
}
