import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runSystemHealthChecks } from "@/lib/admin-health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const health = await runSystemHealthChecks();
  return NextResponse.json({ success: true, health });
}
