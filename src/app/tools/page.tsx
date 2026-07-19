import { prisma } from "@/lib/prisma";
import { ToolsTable } from "./tools-table";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const tools = await prisma.tool.findMany({
    orderBy: { tool_id: "asc" },
  });

  const rows = tools.map((tool) => ({
    id: tool.id,
    tool_id: tool.tool_id,
    name: tool.name,
    category: tool.category,
    location: tool.location,
    status: tool.status,
    condition: tool.condition,
    last_checked_out_by: tool.last_checked_out_by,
    checkout_time: tool.checkout_time?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search and manage tool inventory.
        </p>
      </div>
      <ToolsTable rows={rows} />
    </div>
  );
}
