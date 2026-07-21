import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, writeUpdateLog } from "@/lib/automation/audit";
import { getAlertEmailRecipient } from "@/lib/automation/settings";

export const REPORT_TYPES = {
  DAILY: "daily_inventory",
  WEEKLY: "weekly_inventory",
} as const;

export type ReportType =
  (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

export type InventoryReportSummary = {
  siteName: string;
  tools: {
    total: number;
    available: number;
    checkedOut: number;
    missing: number;
    other: number;
  };
  materials: {
    total: number;
    lowStock: number;
  };
  transactions: {
    toolCount: number;
    materialCount: number;
  };
  generatedAt: string;
  emailSimulatedTo: string | null;
};

export type GeneratedReportItem = {
  reportId: number;
  siteId: number;
  siteName: string;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  summary: InventoryReportSummary;
};

export type GenerateReportsResult = {
  types: ReportType[];
  generated: number;
  items: GeneratedReportItem[];
  message: string;
};

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

function periodForType(
  type: ReportType,
  now: Date,
): { periodStart: Date; periodEnd: Date } {
  const periodEnd = now;
  if (type === REPORT_TYPES.WEEKLY) {
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { periodStart, periodEnd };
  }
  // daily: calendar UTC day so far (or last 24h if before midnight edge — use start of day)
  return { periodStart: startOfUtcDay(now), periodEnd };
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

async function buildSummaryForSite(options: {
  siteId: number;
  siteName: string;
  periodStart: Date;
  periodEnd: Date;
  recipient: string;
}): Promise<InventoryReportSummary> {
  const { siteId, siteName, periodStart, periodEnd, recipient } = options;

  const [tools, materials, toolTxnCount, materialTxnCount] = await Promise.all([
    prisma.tool.findMany({
      where: { site_id: siteId },
      select: { status: true },
    }),
    prisma.material.findMany({
      where: { site_id: siteId },
      select: { current_qty: true, min_qty: true, status: true },
    }),
    prisma.toolTransaction.count({
      where: {
        site_id: siteId,
        occurred_at: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.materialTransaction.count({
      where: {
        site_id: siteId,
        occurred_at: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  let available = 0;
  let checkedOut = 0;
  let missing = 0;
  let other = 0;
  for (const tool of tools) {
    const s = normalizeStatus(tool.status);
    if (s === "available") available += 1;
    else if (s === "checked out") checkedOut += 1;
    else if (s === "missing") missing += 1;
    else other += 1;
  }

  const lowStock = materials.filter((m) => {
    if (m.current_qty <= m.min_qty) return true;
    return normalizeStatus(m.status) === "low stock";
  }).length;

  return {
    siteName,
    tools: {
      total: tools.length,
      available,
      checkedOut,
      missing,
      other,
    },
    materials: {
      total: materials.length,
      lowStock,
    },
    transactions: {
      toolCount: toolTxnCount,
      materialCount: materialTxnCount,
    },
    generatedAt: new Date().toISOString(),
    emailSimulatedTo: recipient || null,
  };
}

/**
 * Generate daily and/or weekly inventory report rows per site.
 * Email is simulated (console + audit) — same pattern as low-stock alerts.
 */
export async function generateInventoryReports(options?: {
  user?: string;
  /** Limit to one site; default = all sites */
  siteId?: number;
  /** Which report types to generate (default: daily only) */
  types?: ReportType[];
}): Promise<GenerateReportsResult> {
  const user = options?.user ?? "Automation";
  const types = options?.types?.length
    ? options.types
    : [REPORT_TYPES.DAILY];
  const now = new Date();
  const recipient = await getAlertEmailRecipient();

  const sites = await prisma.site.findMany({
    where: options?.siteId != null ? { id: options.siteId } : undefined,
    select: { id: true, name: true, is_disabled: true },
    orderBy: { name: "asc" },
  });

  const items: GeneratedReportItem[] = [];

  for (const site of sites) {
    if (site.is_disabled) continue;

    for (const type of types) {
      const { periodStart, periodEnd } = periodForType(type, now);
      const summary = await buildSummaryForSite({
        siteId: site.id,
        siteName: site.name,
        periodStart,
        periodEnd,
        recipient,
      });

      const row = await prisma.report.create({
        data: {
          site_id: site.id,
          type,
          period_start: periodStart,
          period_end: periodEnd,
          summary: summary as unknown as Prisma.InputJsonValue,
          updated_at: now,
        },
      });

      const subject = `[OpsFlow] ${type === REPORT_TYPES.WEEKLY ? "Weekly" : "Daily"} inventory report — ${site.name}`;
      const body = [
        `Site: ${site.name}`,
        `Type: ${type}`,
        `Period: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`,
        `Tools: ${summary.tools.total} (available ${summary.tools.available}, checked out ${summary.tools.checkedOut}, missing ${summary.tools.missing})`,
        `Materials: ${summary.materials.total} (low stock ${summary.materials.lowStock})`,
        `Txns in period: tools ${summary.transactions.toolCount}, materials ${summary.transactions.materialCount}`,
        `Simulated email to: ${recipient || "unset@local"}`,
      ].join("\n");

      console.info("[inventory-report:simulated]", {
        to: recipient || "unset@local",
        subject,
        reportId: row.id,
        siteId: site.id,
        type,
      });

      await writeAuditLog({
        entityType: "automation",
        entityId: `report:${row.id}`,
        action: "Inventory Report Generated",
        details: `${subject} — ${body.replace(/\n/g, " | ")}`,
        user,
        occurredAt: now,
      });

      items.push({
        reportId: row.id,
        siteId: site.id,
        siteName: site.name,
        type,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        summary,
      });
    }
  }

  if (items.length > 0) {
    await writeUpdateLog(
      `Generated ${items.length} inventory report(s): ${types.join(", ")}`,
      user,
    );
  }

  return {
    types,
    generated: items.length,
    items,
    message: `Generated ${items.length} report(s) (${types.join(", ")}).`,
  };
}
