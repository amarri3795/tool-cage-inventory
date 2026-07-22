import { NextResponse } from "next/server";
import { runAllAutomation } from "@/lib/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Allow local/dev without CRON_SECRET so `curl` still works offline.
    if (process.env.NODE_ENV !== "production") return true;
    return false;
  }
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Optional query fallback for manual testing (never log the secret).
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

/**
 * Vercel Cron entrypoint.
 * Configure in vercel.json; Vercel sends Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  try {
    const now = new Date();
    const isSunday = now.getUTCDay() === 0;
    const result = await runAllAutomation({
      user: "VercelCron",
      includeWeeklyReports: isSunday,
    });
    return NextResponse.json({
      success: true,
      includeWeeklyReports: isSunday,
      ...result,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Cron automation failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/** Same handler for POST (manual / Task Scheduler). */
export async function POST(request: Request) {
  return GET(request);
}
