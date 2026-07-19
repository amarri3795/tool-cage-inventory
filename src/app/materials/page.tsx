import { prisma } from "@/lib/prisma";
import { MaterialsTable } from "./materials-table";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    orderBy: { material_id: "asc" },
  });

  const rows = materials.map((material) => ({
    id: material.id,
    material_id: material.material_id,
    name: material.name,
    category: material.category,
    unit: material.unit,
    location: material.location,
    current_qty: material.current_qty,
    min_qty: material.min_qty,
    status: material.status,
    last_taken_by: material.last_taken_by,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Materials</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search and manage material inventory.
        </p>
      </div>
      <MaterialsTable rows={rows} />
    </div>
  );
}
