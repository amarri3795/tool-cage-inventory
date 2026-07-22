import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  DEFAULT_SITE_LABELS,
  getSiteLabels,
} from "@/lib/site-labels";

export const dynamic = "force-dynamic";

/** Current session's site labels (defaults for master / unauthenticated). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({
      success: true,
      labels: DEFAULT_SITE_LABELS,
    });
  }

  const siteId =
    session.role === "site_member" || session.role === "site_admin"
      ? session.siteId
      : null;

  const labels = await getSiteLabels(siteId);
  return NextResponse.json({ success: true, labels });
}
