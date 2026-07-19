import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public list of site names for the login dropdown (no secrets). */
export async function GET() {
  const sites = await prisma.site.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    success: true,
    sites: sites.map((s) => s.name),
  });
}
