import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/automation/audit";
import { prisma } from "@/lib/prisma";
import {
  TOOL_ACTIONS,
  TOOL_STATUS,
  findEmployeeByBadge,
  findToolByCode,
  isToolAvailable,
  nextToolTxnCode,
  parseScanToolBody,
  toToolSummarySafe,
} from "@/lib/scan";

export async function POST(request: Request) {
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

  const employee = await findEmployeeByBadge(parsed.badgeInput);
  if (!employee) {
    return NextResponse.json(
      { success: false, error: "Badge not found" },
      { status: 404 },
    );
  }

  const tool = await findToolByCode(parsed.toolInput);
  if (!tool) {
    return NextResponse.json(
      { success: false, error: "Tool not found" },
      { status: 404 },
    );
  }

  if (isToolAvailable(tool.status)) {
    return NextResponse.json(
      {
        success: false,
        error: `Tool ${tool.tool_id} is already available`,
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
          transaction_id,
          occurred_at: now,
          badge_id: employee.badge_id,
          employee_id: employee.id,
          employee_name: employee.name,
          tool_id: tool.tool_id,
          tool_name: tool.name,
          action: TOOL_ACTIONS.CHECK_IN,
          purpose: parsed.purpose,
        },
      });

      const updatedTool = await tx.tool.update({
        where: { tool_id: tool.tool_id },
        data: {
          status: TOOL_STATUS.AVAILABLE,
          // Keep last_checked_out_by for history (Excel behavior).
          checkout_time: null,
          auto_status: null,
          overdue_since: null,
        },
      });

      await writeAuditLog(
        {
          entityType: "tool",
          entityId: tool.tool_id,
          action: "Tool Check-In",
          details: `Checked in by ${employee.name} (${employee.badge_id})${parsed.purpose ? `; purpose: ${parsed.purpose}` : ""}`,
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
        action: TOOL_ACTIONS.CHECK_IN,
        message: `Checked in ${result.tool.name} (${result.tool.tool_id})`,
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
    const message = err instanceof Error ? err.message : "Check-in failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
