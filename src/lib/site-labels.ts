import { prisma } from "@/lib/prisma";

export const UI_LABELS_SETTING_KEY = "ui_labels";

export type SiteLabels = {
  tools: string;
  toolSingular: string;
  toolId: string;
  materials: string;
  materialSingular: string;
  materialId: string;
  employees: string;
  employeeSingular: string;
  transactions: string;
  reports: string;
  scan: string;
  dashboard: string;
  dashboardSubtitle: string;
};

export const DEFAULT_SITE_LABELS: SiteLabels = {
  tools: "Tools",
  toolSingular: "Tool",
  toolId: "Tool ID",
  materials: "Materials",
  materialSingular: "Material",
  materialId: "Material ID",
  employees: "Employees",
  employeeSingular: "Employee",
  transactions: "Transactions",
  reports: "Reports",
  scan: "Scan",
  dashboard: "Dashboard",
  dashboardSubtitle: "Inventory overview for your site.",
};

function asNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function parseSiteLabels(raw: unknown): SiteLabels {
  let parsed: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      const json = JSON.parse(raw) as unknown;
      if (json && typeof json === "object" && !Array.isArray(json)) {
        parsed = json as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    parsed = raw as Record<string, unknown>;
  }

  return {
    tools: asNonEmptyString(parsed.tools, DEFAULT_SITE_LABELS.tools),
    toolSingular: asNonEmptyString(
      parsed.toolSingular,
      DEFAULT_SITE_LABELS.toolSingular,
    ),
    toolId: asNonEmptyString(parsed.toolId, DEFAULT_SITE_LABELS.toolId),
    materials: asNonEmptyString(parsed.materials, DEFAULT_SITE_LABELS.materials),
    materialSingular: asNonEmptyString(
      parsed.materialSingular,
      DEFAULT_SITE_LABELS.materialSingular,
    ),
    materialId: asNonEmptyString(
      parsed.materialId,
      DEFAULT_SITE_LABELS.materialId,
    ),
    employees: asNonEmptyString(parsed.employees, DEFAULT_SITE_LABELS.employees),
    employeeSingular: asNonEmptyString(
      parsed.employeeSingular,
      DEFAULT_SITE_LABELS.employeeSingular,
    ),
    transactions: asNonEmptyString(
      parsed.transactions,
      DEFAULT_SITE_LABELS.transactions,
    ),
    reports: asNonEmptyString(parsed.reports, DEFAULT_SITE_LABELS.reports),
    scan: asNonEmptyString(parsed.scan, DEFAULT_SITE_LABELS.scan),
    dashboard: asNonEmptyString(parsed.dashboard, DEFAULT_SITE_LABELS.dashboard),
    dashboardSubtitle: asNonEmptyString(
      parsed.dashboardSubtitle,
      DEFAULT_SITE_LABELS.dashboardSubtitle,
    ),
  };
}

export async function getSiteLabels(siteId: number | null | undefined): Promise<SiteLabels> {
  if (siteId == null) return { ...DEFAULT_SITE_LABELS };

  const row = await prisma.setting.findFirst({
    where: { site_id: siteId, key: UI_LABELS_SETTING_KEY },
    select: { value: true },
  });

  return parseSiteLabels(row?.value ?? null);
}

export function serializeSiteLabels(labels: SiteLabels): string {
  return JSON.stringify(labels);
}
