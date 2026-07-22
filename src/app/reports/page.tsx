import { prisma } from "@/lib/prisma";
import { requireSiteAdminSession } from "@/lib/site-context";
import { getSiteLabels } from "@/lib/site-labels";
import type { InventoryReportSummary } from "@/lib/automation/generateInventoryReports";
import {
  ReportsPanel,
  type ReportListItem,
} from "./reports-panel";

export const dynamic = "force-dynamic";

function asSummary(raw: unknown): InventoryReportSummary {
  const s = raw as Partial<InventoryReportSummary> | null;
  return {
    siteName: s?.siteName ?? "",
    tools: {
      total: s?.tools?.total ?? 0,
      available: s?.tools?.available ?? 0,
      checkedOut: s?.tools?.checkedOut ?? 0,
      missing: s?.tools?.missing ?? 0,
      other: s?.tools?.other ?? 0,
    },
    materials: {
      total: s?.materials?.total ?? 0,
      lowStock: s?.materials?.lowStock ?? 0,
    },
    transactions: {
      toolCount: s?.transactions?.toolCount ?? 0,
      materialCount: s?.transactions?.materialCount ?? 0,
    },
    generatedAt: s?.generatedAt ?? new Date().toISOString(),
    emailSimulatedTo: s?.emailSimulatedTo ?? null,
  };
}

export default async function ReportsPage() {
  const { siteId } = await requireSiteAdminSession();
  const [reports, labels] = await Promise.all([
    prisma.report.findMany({
      where: { site_id: siteId },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
    getSiteLabels(siteId),
  ]);

  const rows: ReportListItem[] = reports.map((r) => ({
    id: r.id,
    type: r.type,
    period_start: r.period_start.toISOString(),
    period_end: r.period_end.toISOString(),
    created_at: r.created_at.toISOString(),
    summary: asSummary(r.summary),
  }));

  return (
    <ReportsPanel siteId={siteId} rows={rows} title={labels.reports} />
  );
}
