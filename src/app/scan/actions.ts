"use server";

import { writeAuditLog } from "@/lib/automation/audit";
import { prisma } from "@/lib/prisma";
import {
  findEmployeeByBadge,
  findItemByPrefixedId,
  findMaterialByCode,
  findToolByCode,
  isToolAvailable,
  isToolCheckedOut,
  isToolMissing,
  MATERIAL_ACTIONS,
  nextMaterialTxnCode,
  nextToolTxnCode,
  TOOL_ACTIONS,
  TOOL_STATUS,
  type EmployeeSummary,
  type ItemSummary,
} from "@/lib/scan";
import { requireSiteScanSession } from "@/lib/site-context";
import {
  getSitePreset,
  scanFeaturesForPreset,
} from "@/lib/site-presets";

export type LookupEmployeeResult =
  | { ok: true; employee: EmployeeSummary }
  | { ok: false; error: string };

export type LookupItemResult =
  | { ok: true; item: ItemSummary }
  | { ok: false; error: string };

export type SubmitScanResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function lookupEmployeeAction(
  badgeInput: string,
): Promise<LookupEmployeeResult> {
  const { siteId } = await requireSiteScanSession();
  const trimmed = badgeInput.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a badge ID." };
  }

  const employee = await findEmployeeByBadge(trimmed, siteId);
  if (!employee) {
    return {
      ok: false,
      error: `No employee found for badge "${trimmed}".`,
    };
  }

  return { ok: true, employee };
}

export async function lookupItemAction(
  itemInput: string,
): Promise<LookupItemResult> {
  const { siteId } = await requireSiteScanSession();
  const trimmed = itemInput.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a tool or material ID." };
  }

  const upper = trimmed.toUpperCase();
  const features = scanFeaturesForPreset(await getSitePreset(siteId));

  if (!upper.startsWith("TL-") && !upper.startsWith("MAT-")) {
    return {
      ok: false,
      error: features.allowToolCheckout
        ? 'ID must start with "TL-" (tool) or "MAT-" (material).'
        : 'ID must start with "MAT-" (material / stock).',
    };
  }

  if (upper.startsWith("TL-") && !features.allowToolCheckout) {
    return {
      ok: false,
      error:
        "Equipment check-out is not enabled for this site preset. Scan a MAT- stock ID instead.",
    };
  }

  if (upper.startsWith("MAT-") && !features.allowMaterialTake) {
    return {
      ok: false,
      error: "Material takes are not enabled for this site preset.",
    };
  }

  const item = await findItemByPrefixedId(trimmed, siteId);
  if (!item) {
    const kind = upper.startsWith("TL-") ? "tool" : "material";
    return {
      ok: false,
      error: `No ${kind} found for "${trimmed.toUpperCase()}".`,
    };
  }

  return { ok: true, item };
}

export async function submitScanAction(input: {
  badgeInput: string;
  itemInput: string;
  action: string;
  qtyPurpose: string;
}): Promise<SubmitScanResult> {
  const { siteId } = await requireSiteScanSession();
  const badgeInput = input.badgeInput.trim();
  const itemInput = input.itemInput.trim();
  const action = input.action.trim();
  const qtyPurpose = input.qtyPurpose.trim();

  if (!badgeInput) return { ok: false, error: "Badge ID is required." };
  if (!itemInput) return { ok: false, error: "Tool or Material ID is required." };
  if (!action) return { ok: false, error: "Select an action." };

  const employee = await findEmployeeByBadge(badgeInput, siteId);
  if (!employee) {
    return { ok: false, error: `No employee found for badge "${badgeInput}".` };
  }

  const item = await findItemByPrefixedId(itemInput, siteId);
  if (!item) {
    return {
      ok: false,
      error: `No tool or material found for "${itemInput}".`,
    };
  }

  const features = scanFeaturesForPreset(await getSitePreset(siteId));
  if (item.kind === "tool" && !features.allowToolCheckout) {
    return {
      ok: false,
      error:
        "Equipment check-out is not enabled for this site preset. Use a MAT- stock ID.",
    };
  }
  if (item.kind === "material" && !features.allowMaterialTake) {
    return {
      ok: false,
      error: "Material takes are not enabled for this site preset.",
    };
  }

  if (item.kind === "tool") {
    return submitToolScan({
      siteId,
      employee,
      toolCode: item.tool_id,
      action,
      purpose: qtyPurpose,
    });
  }

  return submitMaterialScan({
    siteId,
    employee,
    materialCode: item.material_id,
    action,
    qtyPurpose,
  });
}

async function submitToolScan(args: {
  siteId: number;
  employee: EmployeeSummary;
  toolCode: string;
  action: string;
  purpose: string;
}): Promise<SubmitScanResult> {
  const { siteId, employee, toolCode, action, purpose } = args;
  const now = new Date();

  try {
    if (action === TOOL_ACTIONS.CHECK_OUT) {
      await prisma.$transaction(async (tx) => {
        const tool = await findToolByCode(toolCode, siteId, tx);
        if (!tool) throw new Error("Tool not found.");
        if (isToolMissing(tool.status)) {
          throw new Error("Cannot check out a missing tool.");
        }
        if (isToolCheckedOut(tool.status)) {
          throw new Error("Tool is already checked out.");
        }
        if (!isToolAvailable(tool.status)) {
          throw new Error(
            `Tool status "${tool.status}" does not allow check-out.`,
          );
        }

        const transaction_id = await nextToolTxnCode(tx);
        await tx.toolTransaction.create({
          data: {
            site_id: siteId,
            transaction_id,
            occurred_at: now,
            tool_id: tool.tool_id,
            employee_id: employee.id,
            badge_id: employee.badge_id,
            employee_name: employee.name,
            tool_name: tool.name,
            action: TOOL_ACTIONS.CHECK_OUT,
            purpose: purpose || null,
          },
        });

        await tx.tool.update({
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
            details: `Checked out by ${employee.name} (${employee.badge_id})${purpose ? `; purpose: ${purpose}` : ""}`,
            user: employee.name,
            toolId: tool.tool_id,
            occurredAt: now,
          },
          tx,
        );
      });

      return { ok: true, message: "Tool checked out successfully." };
    }

    if (action === TOOL_ACTIONS.CHECK_IN) {
      await prisma.$transaction(async (tx) => {
        const tool = await findToolByCode(toolCode, siteId, tx);
        if (!tool) throw new Error("Tool not found.");
        if (isToolAvailable(tool.status)) {
          throw new Error("Tool is already available (cannot check in).");
        }
        if (!isToolCheckedOut(tool.status) && !isToolMissing(tool.status)) {
          throw new Error(
            `Tool status "${tool.status}" does not allow check-in.`,
          );
        }

        const transaction_id = await nextToolTxnCode(tx);
        await tx.toolTransaction.create({
          data: {
            site_id: siteId,
            transaction_id,
            occurred_at: now,
            tool_id: tool.tool_id,
            employee_id: employee.id,
            badge_id: employee.badge_id,
            employee_name: employee.name,
            tool_name: tool.name,
            action: TOOL_ACTIONS.CHECK_IN,
            purpose: purpose || null,
          },
        });

        await tx.tool.update({
          where: { id: tool.id },
          data: {
            status: TOOL_STATUS.AVAILABLE,
            last_checked_out_by: null,
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
            details: `Checked in by ${employee.name} (${employee.badge_id})${purpose ? `; purpose: ${purpose}` : ""}`,
            user: employee.name,
            toolId: tool.tool_id,
            occurredAt: now,
          },
          tx,
        );
      });

      return { ok: true, message: "Tool checked in successfully." };
    }

    return {
      ok: false,
      error: `Unknown tool action "${action}". Use Checked Out or Checked In.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Tool scan failed.",
    };
  }
}

async function submitMaterialScan(args: {
  siteId: number;
  employee: EmployeeSummary;
  materialCode: string;
  action: string;
  qtyPurpose: string;
}): Promise<SubmitScanResult> {
  const { siteId, employee, materialCode, action, qtyPurpose } = args;
  const qty = Number(qtyPurpose);
  const now = new Date();

  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      ok: false,
      error: "Enter a positive quantity for materials.",
    };
  }

  try {
    if (action === MATERIAL_ACTIONS.ISSUE) {
      await prisma.$transaction(async (tx) => {
        const material = await findMaterialByCode(materialCode, siteId, tx);
        if (!material) throw new Error("Material not found.");
        if (material.current_qty < qty) {
          throw new Error(
            `Insufficient quantity (available: ${material.current_qty}).`,
          );
        }

        const remaining = material.current_qty - qty;
        const transaction_id = await nextMaterialTxnCode(tx);

        await tx.materialTransaction.create({
          data: {
            site_id: siteId,
            transaction_id,
            occurred_at: now,
            material_id: material.material_id,
            employee_id: employee.id,
            badge_id: employee.badge_id,
            employee_name: employee.name,
            material_name: material.name,
            qty_taken: qty,
            unit: material.unit,
            remaining_qty: remaining,
          },
        });

        await tx.material.update({
          where: { id: material.id },
          data: {
            current_qty: remaining,
            last_taken_by: employee.name,
            status: remaining <= material.min_qty ? "Low Stock" : "OK",
          },
        });

        await writeAuditLog(
          {
            entityType: "material",
            entityId: material.material_id,
            action: "Material Take",
            details: `Took ${qty} ${material.unit ?? "unit(s)"} by ${employee.name} (${employee.badge_id}); remaining ${remaining}`,
            user: employee.name,
            occurredAt: now,
          },
          tx,
        );
      });

      return { ok: true, message: `Issued ${qty} unit(s) of material.` };
    }

    if (action === MATERIAL_ACTIONS.RECEIVE) {
      await prisma.$transaction(async (tx) => {
        const material = await findMaterialByCode(materialCode, siteId, tx);
        if (!material) throw new Error("Material not found.");

        const remaining = material.current_qty + qty;
        const transaction_id = await nextMaterialTxnCode(tx);

        await tx.materialTransaction.create({
          data: {
            site_id: siteId,
            transaction_id,
            occurred_at: now,
            material_id: material.material_id,
            employee_id: employee.id,
            badge_id: employee.badge_id,
            employee_name: employee.name,
            material_name: material.name,
            qty_taken: qty,
            unit: material.unit,
            remaining_qty: remaining,
          },
        });

        await tx.material.update({
          where: { id: material.id },
          data: {
            current_qty: remaining,
            status: remaining <= material.min_qty ? "Low Stock" : "OK",
          },
        });

        await writeAuditLog(
          {
            entityType: "material",
            entityId: material.material_id,
            action: "Material Receive",
            details: `Received ${qty} ${material.unit ?? "unit(s)"} by ${employee.name} (${employee.badge_id}); remaining ${remaining}`,
            user: employee.name,
            occurredAt: now,
          },
          tx,
        );
      });

      return { ok: true, message: `Received ${qty} unit(s) of material.` };
    }

    return {
      ok: false,
      error: `Unknown material action "${action}". Use Issue or Receive.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Material scan failed.",
    };
  }
}
