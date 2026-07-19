import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { markMissingTools } from "@/lib/automation/markMissingTools";

export const dynamic = "force-dynamic";

/** Admin Control Center — mark overdue checked-out tools as Missing. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await markMissingTools({
      user: `Admin:${auth.badgeId}`,
    });

    return NextResponse.json({
      ...result,
      success: true,
      message: `Marked ${result.marked} tool(s) Missing (scanned ${result.scanned}; threshold ${result.missingAfterHours}h)`,
      by: auth.badgeId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Mark-missing action failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
