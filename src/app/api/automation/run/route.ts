import { NextResponse } from "next/server";
import { runAllAutomation } from "@/lib/automation";

export async function POST(request: Request) {
  try {
    let user = "Automation";
    let forceAlerts = false;
    let includeWeeklyReports = false;
    let siteId: number | undefined;
    try {
      const body = (await request.json()) as {
        user?: string;
        forceAlerts?: boolean;
        includeWeeklyReports?: boolean;
        siteId?: number;
      };
      if (body?.user?.trim()) user = body.user.trim();
      if (body?.forceAlerts === true) forceAlerts = true;
      if (body?.includeWeeklyReports === true) includeWeeklyReports = true;
      if (typeof body?.siteId === "number" && Number.isFinite(body.siteId)) {
        siteId = body.siteId;
      }
    } catch {
      // empty body is fine
    }

    const result = await runAllAutomation({
      user,
      forceAlerts,
      includeWeeklyReports,
      siteId,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Automation run failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
