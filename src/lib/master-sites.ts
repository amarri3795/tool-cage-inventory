import { prisma } from "@/lib/prisma";

export async function getSiteUsageMetrics(siteId: number) {
  const [
    employees,
    tools,
    materials,
    tool_transactions,
    material_transactions,
  ] = await Promise.all([
    prisma.employee.count({ where: { site_id: siteId } }),
    prisma.tool.count({ where: { site_id: siteId } }),
    prisma.material.count({ where: { site_id: siteId } }),
    prisma.toolTransaction.count({ where: { site_id: siteId } }),
    prisma.materialTransaction.count({ where: { site_id: siteId } }),
  ]);
  const usageTotal =
    employees + tools + materials + tool_transactions + material_transactions;
  return {
    employees,
    tools,
    materials,
    tool_transactions,
    material_transactions,
    usageTotal,
    storageEstimateBytes: usageTotal * 512,
  };
}

export async function listSitesWithMetrics() {
  const sites = await prisma.site.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      contact_email: true,
      is_disabled: true,
      paywall_enabled: true,
      paywall_price: true,
      billing_cycle: true,
      free_trial_days: true,
      free_trial_preset: true,
      paywall_paid: true,
      created_at: true,
    },
  });

  return Promise.all(
    sites.map(async (site) => ({
      ...site,
      paywall_price: Number(site.paywall_price),
      metrics: await getSiteUsageMetrics(site.id),
    })),
  );
}
