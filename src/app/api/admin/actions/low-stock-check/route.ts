import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runLowStockAlerts } from "@/lib/automation/lowStockAlerts";

export const dynamic = "force-dynamic";

/** Admin Control Center — "Run low stock check" button. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    let force = false;
    try {
      const body = (await request.json()) as { force?: boolean };
      if (body?.force === true) force = true;
    } catch {
      // empty body ok
    }

    const result = await runLowStockAlerts({
      user: `Admin:${auth.badgeId}`,
      force,
    });

    return NextResponse.json({
      ...result,
      success: true,
      message: result.message,
      by: auth.badgeId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Low stock check failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
