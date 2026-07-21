import { NextResponse } from "next/server";
import {
  generateInventoryReports,
  REPORT_TYPES,
  type ReportType,
} from "@/lib/automation/generateInventoryReports";

function parseTypes(raw: unknown): ReportType[] | undefined {
  if (raw === "weekly" || raw === REPORT_TYPES.WEEKLY) {
    return [REPORT_TYPES.WEEKLY];
  }
  if (raw === "daily" || raw === REPORT_TYPES.DAILY) {
    return [REPORT_TYPES.DAILY];
  }
  if (raw === "all" || raw === "both") {
    return [REPORT_TYPES.DAILY, REPORT_TYPES.WEEKLY];
  }
  if (Array.isArray(raw)) {
    const out: ReportType[] = [];
    for (const item of raw) {
      if (item === REPORT_TYPES.DAILY || item === "daily") {
        out.push(REPORT_TYPES.DAILY);
      } else if (item === REPORT_TYPES.WEEKLY || item === "weekly") {
        out.push(REPORT_TYPES.WEEKLY);
      }
    }
    return out.length ? out : undefined;
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    let user = "Automation";
    let siteId: number | undefined;
    let types: ReportType[] | undefined;
    try {
      const body = (await request.json()) as {
        user?: string;
        siteId?: number;
        type?: string | string[];
        types?: string | string[];
      };
      if (body?.user?.trim()) user = body.user.trim();
      if (typeof body?.siteId === "number" && Number.isFinite(body.siteId)) {
        siteId = body.siteId;
      }
      types = parseTypes(body?.types ?? body?.type);
    } catch {
      // empty body is fine
    }

    const result = await generateInventoryReports({ user, siteId, types });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
