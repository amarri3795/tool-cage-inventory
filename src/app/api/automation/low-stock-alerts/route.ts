import { NextResponse } from "next/server";
import { runLowStockAlerts } from "@/lib/automation/lowStockAlerts";

export async function POST(request: Request) {
  try {
    let user = "Automation";
    let force = false;
    try {
      const body = (await request.json()) as { user?: string; force?: boolean };
      if (body?.user?.trim()) user = body.user.trim();
      if (body?.force === true) force = true;
    } catch {
      // empty body is fine
    }

    const result = await runLowStockAlerts({ user, force });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Low stock alert automation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
