import { prisma } from "@/lib/prisma";
import { requireSiteAdminSession } from "@/lib/site-context";
import { ToolsTable, type ToolRow } from "./tools-table";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const { siteId } = await requireSiteAdminSession();
  const tools = await prisma.tool.findMany({
    where: { site_id: siteId },
    orderBy: { tool_id: "asc" },
  });

  const rows: ToolRow[] = tools.map((t) => ({
    id: t.id,
    tool_id: t.tool_id,
    name: t.name,
    category: t.category,
    location: t.location,
    status: t.status,
    condition: t.condition,
    last_checked_out_by: t.last_checked_out_by,
    checkout_time: t.checkout_time?.toISOString() ?? null,
  }));

  return <ToolsTable rows={rows} />;
}
