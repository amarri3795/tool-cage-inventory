import { prisma } from "@/lib/prisma";
import { TOOL_STATUS, isToolCheckedOut } from "@/lib/scan";
import { writeAuditLog, writeUpdateLog } from "@/lib/automation/audit";
import {
  ensureAutomationSettings,
  getSettingNumber,
} from "@/lib/automation/settings";

export type MarkMissingResult = {
  missingAfterHours: number;
  cutoff: string;
  scanned: number;
  marked: number;
  tools: Array<{
    tool_id: string;
    name: string;
    checkout_time: string | null;
    last_checked_out_by: string | null;
  }>;
};

/**
 * Mark tools as Missing when they have been Checked Out longer than
 * `missing_after_hours` (from settings).
 */
export async function markMissingTools(options?: {
  user?: string;
  writeUpdateLogEntry?: boolean;
}): Promise<MarkMissingResult> {
  await ensureAutomationSettings();

  const missingAfterHours = await getSettingNumber("missing_after_hours", 2);
  const hours = Math.max(0, missingAfterHours);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const user = options?.user ?? "Automation";

  const candidates = await prisma.tool.findMany({
    where: {
      checkout_time: { not: null, lte: cutoff },
    },
  });

  const overdue = candidates.filter((t) => isToolCheckedOut(t.status));
  const markedTools: MarkMissingResult["tools"] = [];

  for (const tool of overdue) {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.tool.update({
        where: { tool_id: tool.tool_id },
        data: {
          status: TOOL_STATUS.MISSING,
          auto_status: "MISSING",
          overdue_since: tool.overdue_since ?? tool.checkout_time ?? now,
        },
      });

      await writeAuditLog(
        {
          entityType: "tool",
          entityId: tool.tool_id,
          action: "Marked Missing",
          details: `Auto-marked Missing after ${hours}h (checked out since ${tool.checkout_time?.toISOString() ?? "unknown"}; last user: ${tool.last_checked_out_by ?? "unknown"})`,
          user,
          toolId: tool.tool_id,
          occurredAt: now,
        },
        tx,
      );
    });

    markedTools.push({
      tool_id: tool.tool_id,
      name: tool.name,
      checkout_time: tool.checkout_time?.toISOString() ?? null,
      last_checked_out_by: tool.last_checked_out_by,
    });
  }

  if (markedTools.length > 0 && options?.writeUpdateLogEntry !== false) {
    await writeUpdateLog(
      `Automation marked ${markedTools.length} tool(s) Missing after ${hours}h: ${markedTools.map((t) => t.tool_id).join(", ")}`,
      user,
    );
  }

  return {
    missingAfterHours: hours,
    cutoff: cutoff.toISOString(),
    scanned: overdue.length,
    marked: markedTools.length,
    tools: markedTools,
  };
}
