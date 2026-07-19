"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSiteSession } from "@/lib/site-context";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

export type ToolActionState = {
  error?: string;
};

export async function createTool(
  _prev: ToolActionState,
  formData: FormData,
): Promise<ToolActionState> {
  const { siteId } = await requireSiteSession();
  const tool_id = str(formData, "tool_id");
  const name = str(formData, "name");

  if (!tool_id || !name) {
    return { error: "Tool ID and name are required." };
  }

  const existing = await prisma.tool.findUnique({
    where: { site_id_tool_id: { site_id: siteId, tool_id } },
  });
  if (existing) {
    return { error: `Tool ID "${tool_id}" already exists.` };
  }

  await prisma.tool.create({
    data: {
      site_id: siteId,
      tool_id,
      name,
      category: optional(formData, "category"),
      location: optional(formData, "location"),
      status: str(formData, "status") || "Available",
      condition: optional(formData, "condition") ?? "Good",
      notes: optional(formData, "notes"),
    },
  });

  revalidatePath("/tools");
  revalidatePath("/dashboard");
  redirect("/tools");
}

export async function updateTool(
  id: number,
  _prev: ToolActionState,
  formData: FormData,
): Promise<ToolActionState> {
  const { siteId } = await requireSiteSession();
  const tool_id = str(formData, "tool_id");
  const name = str(formData, "name");

  if (!tool_id || !name) {
    return { error: "Tool ID and name are required." };
  }

  const owned = await prisma.tool.findFirst({
    where: { id, site_id: siteId },
  });
  if (!owned) {
    return { error: "Tool not found." };
  }

  const conflict = await prisma.tool.findFirst({
    where: { site_id: siteId, tool_id, NOT: { id } },
  });
  if (conflict) {
    return { error: `Tool ID "${tool_id}" already exists.` };
  }

  try {
    await prisma.tool.update({
      where: { id },
      data: {
        tool_id,
        name,
        category: optional(formData, "category"),
        location: optional(formData, "location"),
        status: str(formData, "status") || "Available",
        condition: optional(formData, "condition") ?? "Good",
        notes: optional(formData, "notes"),
      },
    });
  } catch {
    return { error: "Tool not found or could not be updated." };
  }

  revalidatePath("/tools");
  revalidatePath("/dashboard");
  redirect("/tools");
}
