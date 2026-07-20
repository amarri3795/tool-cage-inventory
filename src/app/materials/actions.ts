"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSiteAdminSession } from "@/lib/site-context";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

function parseNumber(formData: FormData, key: string, fallback = 0): number {
  const raw = str(formData, key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export type MaterialActionState = {
  error?: string;
};

export async function createMaterial(
  _prev: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const { siteId } = await requireSiteAdminSession();
  const material_id = str(formData, "material_id");
  const name = str(formData, "name");

  if (!material_id || !name) {
    return { error: "Material ID and name are required." };
  }

  const existing = await prisma.material.findUnique({
    where: { site_id_material_id: { site_id: siteId, material_id } },
  });
  if (existing) {
    return { error: `Material ID "${material_id}" already exists.` };
  }

  const current_qty = parseNumber(formData, "current_qty", 0);
  const min_qty = parseNumber(formData, "min_qty", 0);
  const status =
    str(formData, "status") || (current_qty <= min_qty ? "Low" : "OK");

  await prisma.material.create({
    data: {
      site_id: siteId,
      material_id,
      name,
      category: optional(formData, "category"),
      unit: optional(formData, "unit"),
      location: optional(formData, "location"),
      current_qty,
      min_qty,
      status,
      notes: optional(formData, "notes"),
    },
  });

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  redirect("/materials");
}

export async function updateMaterial(
  id: number,
  _prev: MaterialActionState,
  formData: FormData,
): Promise<MaterialActionState> {
  const { siteId } = await requireSiteAdminSession();
  const material_id = str(formData, "material_id");
  const name = str(formData, "name");

  if (!material_id || !name) {
    return { error: "Material ID and name are required." };
  }

  const owned = await prisma.material.findFirst({
    where: { id, site_id: siteId },
  });
  if (!owned) {
    return { error: "Material not found." };
  }

  const conflict = await prisma.material.findFirst({
    where: { site_id: siteId, material_id, NOT: { id } },
  });
  if (conflict) {
    return { error: `Material ID "${material_id}" already exists.` };
  }

  const current_qty = parseNumber(formData, "current_qty", 0);
  const min_qty = parseNumber(formData, "min_qty", 0);
  const status =
    str(formData, "status") || (current_qty <= min_qty ? "Low" : "OK");

  try {
    await prisma.material.update({
      where: { id },
      data: {
        material_id,
        name,
        category: optional(formData, "category"),
        unit: optional(formData, "unit"),
        location: optional(formData, "location"),
        current_qty,
        min_qty,
        status,
        notes: optional(formData, "notes"),
      },
    });
  } catch {
    return { error: "Material not found or could not be updated." };
  }

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  redirect("/materials");
}
