import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { listSitesWithMetrics } from "@/lib/master-sites";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMasterAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }
  const sites = await listSitesWithMetrics();
  return NextResponse.json({ success: true, sites });
}
