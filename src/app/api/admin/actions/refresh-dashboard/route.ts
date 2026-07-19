import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Revalidate dashboard (and related inventory pages). */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  revalidatePath("/dashboard");
  revalidatePath("/tools");
  revalidatePath("/materials");
  revalidatePath("/scan");
  revalidatePath("/admin");

  return NextResponse.json({
    success: true,
    message: "Dashboard and inventory pages revalidated",
    paths: ["/dashboard", "/tools", "/materials", "/scan", "/admin"],
    by: auth.badgeId,
  });
}
