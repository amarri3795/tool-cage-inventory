"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeBadgeId } from "@/lib/admin-auth";
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

export type EmployeeActionState = {
  error?: string;
};

export async function createEmployee(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const { siteId } = await requireSiteAdminSession();
  const badge_id = normalizeBadgeId(str(formData, "badge_id"));
  const raw_badge_data = str(formData, "raw_badge_data");
  const name = str(formData, "name");

  if (!badge_id || !raw_badge_data || !name) {
    return { error: "Badge ID, raw badge data, and name are required." };
  }

  const existing = await prisma.employee.findUnique({
    where: { site_id_badge_id: { site_id: siteId, badge_id } },
  });
  if (existing) {
    return { error: `Badge ID "${badge_id}" already exists for this site.` };
  }

  try {
    await prisma.employee.create({
      data: {
        site_id: siteId,
        badge_id,
        raw_badge_data,
        name,
        job_title: optional(formData, "job_title"),
      },
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return { error: `Badge ID "${badge_id}" already exists for this site.` };
    }
    return { error: "Could not create employee." };
  }

  revalidatePath("/employees");
  revalidatePath("/dashboard");
  redirect("/employees");
}
