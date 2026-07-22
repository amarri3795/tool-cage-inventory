import type { SiteLabels } from "@/lib/site-labels";
import { DEFAULT_SITE_LABELS } from "@/lib/site-labels";
import { prisma } from "@/lib/prisma";

export const SITE_PRESET_IDS = [
  "checkout",
  "inventory",
  "full",
  "consumables",
] as const;

export type SitePresetId = (typeof SITE_PRESET_IDS)[number];

export type DashboardFeatures = {
  showCheckoutStats: boolean;
  showCheckedOutSection: boolean;
  showMissingSection: boolean;
  showLowStock: boolean;
  showOnHandStats: boolean;
  showRecentTakes: boolean;
  showStockTable: boolean;
};

export type ScanFeatures = {
  allowToolCheckout: boolean;
  allowMaterialTake: boolean;
};

export type SitePresetMeta = {
  id: SitePresetId;
  title: string;
  description: string;
};

export const SITE_PRESETS: SitePresetMeta[] = [
  {
    id: "checkout",
    title: "Equipment check-out",
    description:
      "Shared tools and gear — track who has what, check-out / check-in, and missing items.",
  },
  {
    id: "inventory",
    title: "Inventory tracker",
    description:
      "Stock rooms and warehouses — on-hand quantity, low stock, and stock moves. No check-out UI.",
  },
  {
    id: "full",
    title: "Full plant ops",
    description:
      "Both equipment check-out and inventory stock levels on one dashboard.",
  },
  {
    id: "consumables",
    title: "Consumables",
    description:
      "Parts and supplies — quantity on hand, low stock, and takes. Equipment check-out hidden.",
  },
];

export function isSitePresetId(value: unknown): value is SitePresetId {
  return (
    typeof value === "string" &&
    (SITE_PRESET_IDS as readonly string[]).includes(value)
  );
}

export function parseSitePreset(value: unknown): SitePresetId {
  return isSitePresetId(value) ? value : "checkout";
}

export function defaultLabelsForPreset(preset: SitePresetId): SiteLabels {
  switch (preset) {
    case "inventory":
      return {
        ...DEFAULT_SITE_LABELS,
        tools: "Items",
        toolSingular: "Item",
        toolId: "Item ID",
        materials: "Stock",
        materialSingular: "SKU",
        materialId: "SKU",
        scan: "Stock scan",
        dashboard: "Inventory",
        dashboardSubtitle: "On-hand quantity and low-stock overview for your site.",
      };
    case "consumables":
      return {
        ...DEFAULT_SITE_LABELS,
        tools: "Assets",
        toolSingular: "Asset",
        toolId: "Asset ID",
        materials: "Consumables",
        materialSingular: "Consumable",
        materialId: "Part ID",
        scan: "Issue / receive",
        dashboard: "Consumables",
        dashboardSubtitle: "Supply levels and recent takes for your site.",
      };
    case "full":
      return {
        ...DEFAULT_SITE_LABELS,
        dashboard: "Operations",
        dashboardSubtitle:
          "Check-out status and inventory levels for your site.",
      };
    case "checkout":
    default:
      return {
        ...DEFAULT_SITE_LABELS,
        dashboard: "Check-out",
        dashboardSubtitle:
          "Equipment availability, check-outs, and missing items for your site.",
      };
  }
}

export function dashboardFeaturesForPreset(
  preset: SitePresetId,
): DashboardFeatures {
  switch (preset) {
    case "inventory":
    case "consumables":
      return {
        showCheckoutStats: false,
        showCheckedOutSection: false,
        showMissingSection: false,
        showLowStock: true,
        showOnHandStats: true,
        showRecentTakes: true,
        showStockTable: true,
      };
    case "full":
      return {
        showCheckoutStats: true,
        showCheckedOutSection: true,
        showMissingSection: true,
        showLowStock: true,
        showOnHandStats: false,
        showRecentTakes: false,
        showStockTable: false,
      };
    case "checkout":
    default:
      return {
        showCheckoutStats: true,
        showCheckedOutSection: true,
        showMissingSection: true,
        showLowStock: false,
        showOnHandStats: false,
        showRecentTakes: false,
        showStockTable: false,
      };
  }
}

export function scanFeaturesForPreset(preset: SitePresetId): ScanFeatures {
  switch (preset) {
    case "inventory":
    case "consumables":
      return { allowToolCheckout: false, allowMaterialTake: true };
    case "full":
      return { allowToolCheckout: true, allowMaterialTake: true };
    case "checkout":
    default:
      return { allowToolCheckout: true, allowMaterialTake: true };
  }
}

export async function getSitePreset(
  siteId: number | null | undefined,
): Promise<SitePresetId> {
  if (siteId == null) return "checkout";
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { preset: true },
  });
  return parseSitePreset(site?.preset);
}
