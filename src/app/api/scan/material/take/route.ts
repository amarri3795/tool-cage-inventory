import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/automation/audit";
import { prisma } from "@/lib/prisma";
import {
  MATERIAL_ACTIONS,
  MATERIAL_STATUS,
  findEmployeeByBadge,
  findMaterialByCode,
  nextMaterialTxnCode,
  parseScanMaterialTakeBody,
  toMaterialSummarySafe,
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

  const parsed = parseScanMaterialTakeBody(body);
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

  const material = await findMaterialByCode(parsed.materialInput);
  if (!material) {
    return NextResponse.json(
      { success: false, error: "Material not found" },
      { status: 404 },
    );
  }

  if (parsed.quantity > material.current_qty) {
    return NextResponse.json(
      {
        success: false,
        error: `Quantity ${parsed.quantity} exceeds available stock (${material.current_qty})`,
        material: toMaterialSummarySafe(material),
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const qty = parsed.quantity;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.material.findUnique({
        where: { material_id: material.material_id },
      });
      if (!locked) {
        throw new Error("Material not found");
      }
      if (qty > locked.current_qty) {
        throw Object.assign(
          new Error(
            `Quantity ${qty} exceeds available stock (${locked.current_qty})`,
          ),
          { code: "INSUFFICIENT_QTY", material: locked },
        );
      }

      const remaining = locked.current_qty - qty;
      const status =
        remaining <= locked.min_qty
          ? MATERIAL_STATUS.LOW_STOCK
          : MATERIAL_STATUS.OK;

      const transaction_id = await nextMaterialTxnCode(tx);
      const transaction = await tx.materialTransaction.create({
        data: {
          transaction_id,
          occurred_at: now,
          badge_id: employee.badge_id,
          employee_id: employee.id,
          employee_name: employee.name,
          material_id: locked.material_id,
          material_name: locked.name,
          qty_taken: qty,
          unit: locked.unit,
          remaining_qty: remaining,
        },
      });

      const updatedMaterial = await tx.material.update({
        where: { material_id: locked.material_id },
        data: {
          current_qty: remaining,
          last_taken_by: employee.name,
          status,
        },
      });

      await writeAuditLog(
        {
          entityType: "material",
          entityId: locked.material_id,
          action: "Material Take",
          details: `Took ${qty} ${locked.unit ?? "unit(s)"} by ${employee.name} (${employee.badge_id}); remaining ${remaining}; status ${status}`,
          user: employee.name,
          occurredAt: now,
        },
        tx,
      );

      return { transaction, material: updatedMaterial };
    });

    return NextResponse.json(
      {
        success: true,
        action: MATERIAL_ACTIONS.ISSUE,
        message: `Took ${qty} of ${result.material.name} (${result.material.material_id})`,
        employee: {
          id: employee.id,
          badge_id: employee.badge_id,
          name: employee.name,
        },
        material: toMaterialSummarySafe(result.material),
        transaction: {
          id: result.transaction.id,
          transaction_id: result.transaction.transaction_id,
          qty_taken: result.transaction.qty_taken,
          remaining_qty: result.transaction.remaining_qty,
          occurred_at: result.transaction.occurred_at.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: string }).code
        : undefined;

    if (code === "INSUFFICIENT_QTY") {
      const lockedMaterial =
        err && typeof err === "object" && "material" in err
          ? (err as { material: typeof material }).material
          : material;
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "Insufficient quantity",
          material: toMaterialSummarySafe(lockedMaterial),
        },
        { status: 409 },
      );
    }

    const message =
      err instanceof Error ? err.message : "Material take failed";
    if (message === "Material not found") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
