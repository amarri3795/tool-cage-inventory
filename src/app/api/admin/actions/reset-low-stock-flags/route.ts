import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { resetLowStockEmailFlags } from "@/lib/automation/lowStockAlerts";

export const dynamic = "force-dynamic";

/** Admin Control Center — "Reset low stock email flags" button. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await resetLowStockEmailFlags({
      user: `Admin:${auth.badgeId}`,
    });

    return NextResponse.json({
      ...result,
      success: true,
      message: `Reset low stock email flags on ${result.reset} material(s)`,
      by: auth.badgeId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Reset low stock flags failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
