import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/automation/audit";
import { prisma } from "@/lib/prisma";
import {
  TOOL_ACTIONS,
  TOOL_STATUS,
  findEmployeeByBadge,
  findToolByCode,
  isToolCheckedOut,
  isToolMissing,
  nextToolTxnCode,
  parseScanToolBody,
  toToolSummarySafe,
} from "@/lib/scan";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "site" || session.siteId == null) {
    return NextResponse.json(
      { success: false, error: "Site login required." },
      { status: 401 },
    );
  }
  const siteId = session.siteId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = parseScanToolBody(body);
  if (parsed.error) {
    return NextResponse.json(
      { success: false, error: parsed.error },
      { status: 400 },
    );
  }

  const employee = await findEmployeeByBadge(parsed.badgeInput, siteId);
  if (!employee) {
    return NextResponse.json(
      { success: false, error: "Badge not found" },
      { status: 404 },
    );
  }

  const tool = await findToolByCode(parsed.toolInput, siteId);
  if (!tool) {
    return NextResponse.json(
      { success: false, error: "Tool not found" },
      { status: 404 },
    );
  }

  if (isToolMissing(tool.status)) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot check out missing tool ${tool.tool_id}`,
        tool: toToolSummarySafe(tool),
      },
      { status: 409 },
    );
  }

  if (isToolCheckedOut(tool.status)) {
    return NextResponse.json(
      {
        success: false,
        error: `Tool ${tool.tool_id} is already checked out`,
        tool: toToolSummarySafe(tool),
      },
      { status: 409 },
    );
  }

  if (tool.status.trim().toLowerCase() !== TOOL_STATUS.AVAILABLE.toLowerCase()) {
    return NextResponse.json(
      {
        success: false,
        error: `Tool ${tool.tool_id} cannot be checked out from status "${tool.status}"`,
        tool: toToolSummarySafe(tool),
      },
      { status: 409 },
    );
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transaction_id = await nextToolTxnCode(tx);
      const transaction = await tx.toolTransaction.create({
        data: {
          site_id: siteId,
          transaction_id,
          occurred_at: now,
          badge_id: employee.badge_id,
          employee_id: employee.id,
          employee_name: employee.name,
          tool_id: tool.tool_id,
          tool_name: tool.name,
          action: TOOL_ACTIONS.CHECK_OUT,
          purpose: parsed.purpose,
        },
      });

      const updatedTool = await tx.tool.update({
        where: { id: tool.id },
        data: {
          status: TOOL_STATUS.CHECKED_OUT,
          last_checked_out_by: employee.name,
          checkout_time: now,
          auto_status: null,
          overdue_since: null,
        },
      });

      await writeAuditLog(
        {
          entityType: "tool",
          entityId: tool.tool_id,
          action: "Tool Check-Out",
          details: `Checked out by ${employee.name} (${employee.badge_id})${parsed.purpose ? `; purpose: ${parsed.purpose}` : ""}`,
          user: employee.name,
          toolId: tool.tool_id,
          occurredAt: now,
        },
        tx,
      );

      return { transaction, tool: updatedTool };
    });

    return NextResponse.json(
      {
        success: true,
        action: TOOL_ACTIONS.CHECK_OUT,
        message: `Checked out ${result.tool.name} (${result.tool.tool_id})`,
        employee: {
          id: employee.id,
          badge_id: employee.badge_id,
          name: employee.name,
        },
        tool: toToolSummarySafe(result.tool),
        transaction: {
          id: result.transaction.id,
          transaction_id: result.transaction.transaction_id,
          action: result.transaction.action,
          occurred_at: result.transaction.occurred_at.toISOString(),
          purpose: result.transaction.purpose,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check-out failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
