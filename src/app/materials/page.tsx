import { prisma } from "@/lib/prisma";
import { requireSiteAdminSession } from "@/lib/site-context";
import { MaterialsTable, type MaterialRow } from "./materials-table";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const { siteId } = await requireSiteAdminSession();
  const materials = await prisma.material.findMany({
    where: { site_id: siteId },
    orderBy: { material_id: "asc" },
  });

  const rows: MaterialRow[] = materials.map((m) => ({
    id: m.id,
    material_id: m.material_id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    location: m.location,
    current_qty: m.current_qty,
    min_qty: m.min_qty,
    status: m.status,
    last_taken_by: m.last_taken_by,
  }));

  return <MaterialsTable rows={rows} />;
}
