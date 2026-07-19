import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MaterialForm } from "../../material-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMaterialPage({ params }: PageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit material</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Update inventory details for {material.material_id}.
        </p>
      </div>
      <MaterialForm
        mode="edit"
        initial={{
          id: material.id,
          material_id: material.material_id,
          name: material.name,
          category: material.category ?? "",
          unit: material.unit ?? "",
          location: material.location ?? "",
          current_qty: String(material.current_qty),
          min_qty: String(material.min_qty),
          status: material.status,
          notes: material.notes ?? "",
        }}
      />
    </div>
  );
}
