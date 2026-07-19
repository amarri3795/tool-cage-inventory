import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { updateAdminSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Lock manual inventory edits (allow_manual_inventory_edits = false). */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const settings = await updateAdminSettings(
    { allow_manual_inventory_edits: false },
    { user: `Admin:${auth.badgeId}` },
  );

  return NextResponse.json({
    success: true,
    message: "Manual inventory edits locked",
    allow_manual_inventory_edits: settings.allow_manual_inventory_edits,
    by: auth.badgeId,
  });
}
