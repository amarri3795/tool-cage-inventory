import { NextResponse } from "next/server";
import { runAllAutomation } from "@/lib/automation";

export async function POST(request: Request) {
  try {
    let user = "Automation";
    let forceAlerts = false;
    try {
      const body = (await request.json()) as {
        user?: string;
        forceAlerts?: boolean;
      };
      if (body?.user?.trim()) user = body.user.trim();
      if (body?.forceAlerts === true) forceAlerts = true;
    } catch {
      // empty body is fine
    }

    const result = await runAllAutomation({ user, forceAlerts });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Automation run failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
