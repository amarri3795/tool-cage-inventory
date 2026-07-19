import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { updateAdminSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Unlock manual inventory edits (allow_manual_inventory_edits = true). */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const settings = await updateAdminSettings(
    { allow_manual_inventory_edits: true },
    { user: `Admin:${auth.badgeId}` },
  );

  return NextResponse.json({
    success: true,
    message: "Manual inventory edits unlocked",
    allow_manual_inventory_edits: settings.allow_manual_inventory_edits,
    by: auth.badgeId,
  });
}
