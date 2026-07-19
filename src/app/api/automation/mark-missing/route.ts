import { NextResponse } from "next/server";
import { markMissingTools } from "@/lib/automation/markMissingTools";

export async function POST(request: Request) {
  try {
    let user = "Automation";
    try {
      const body = (await request.json()) as { user?: string };
      if (body?.user?.trim()) user = body.user.trim();
    } catch {
      // empty body is fine
    }

    const result = await markMissingTools({ user });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Mark-missing automation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
