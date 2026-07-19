import { prisma } from "@/lib/prisma";
import { MATERIAL_STATUS } from "@/lib/scan";
import { writeAuditLog, writeUpdateLog } from "@/lib/automation/audit";
import {
  ensureAutomationSettings,
  getAlertEmailRecipient,
  getSettingBool,
  getSettingNumber,
} from "@/lib/automation/settings";

export type LowStockAlertItem = {
  material_id: string;
  name: string;
  current_qty: number;
  min_qty: number;
  status: string;
  action: "alerted" | "skipped_frequency" | "skipped_already_sent" | "reset_ok";
  recipient: string | null;
  simulated: boolean;
};

export type LowStockAlertsResult = {
  enabled: boolean;
  recipient: string;
  frequencyHours: number;
  resetWhenOk: boolean;
  lowStockCount: number;
  alerted: number;
  skipped: number;
  reset: number;
  items: LowStockAlertItem[];
  message: string;
};

function isLowStock(material: {
  current_qty: number;
  min_qty: number;
  status: string;
}): boolean {
  if (material.current_qty <= material.min_qty) return true;
  return material.status.trim().toLowerCase() === "low stock";
}

function hoursElapsed(since: Date | null | undefined, now: Date): number {
  if (!since) return Number.POSITIVE_INFINITY;
  return (now.getTime() - since.getTime()) / (1000 * 60 * 60);
}

/**
 * Scan materials for low stock, simulate/send alerts with frequency gating,
 * and optionally reset alert flags when stock returns to OK.
 *
 * Email is simulated (console + audit_log) unless SMTP_HOST is configured —
 * even then this MVP only simulates; set SMTP later to plug in a real sender.
 */
export async function runLowStockAlerts(options?: {
  user?: string;
  force?: boolean;
}): Promise<LowStockAlertsResult> {
  await ensureAutomationSettings();

  const enabled = await getSettingBool("low_stock_alerts_enabled", true);
  const recipient = await getAlertEmailRecipient();
  const frequencyHours = Math.max(
    0,
    await getSettingNumber("alert_frequency_hours", 24),
  );
  const resetWhenOk = await getSettingBool("reset_email_flag_when_ok", true);
  const user = options?.user ?? "Automation";
  const now = new Date();
  const items: LowStockAlertItem[] = [];

  if (!enabled && !options?.force) {
    return {
      enabled: false,
      recipient,
      frequencyHours,
      resetWhenOk,
      lowStockCount: 0,
      alerted: 0,
      skipped: 0,
      reset: 0,
      items: [],
      message: "Low stock alerts are disabled (low_stock_alerts_enabled=false).",
    };
  }

  const materials = await prisma.material.findMany({
    orderBy: { material_id: "asc" },
  });

  let alerted = 0;
  let skipped = 0;
  let reset = 0;

  for (const material of materials) {
    const low = isLowStock(material);

    if (!low) {
      if (
        resetWhenOk &&
        (material.low_stock_email_sent || material.low_stock_email_date)
      ) {
        await prisma.material.update({
          where: { id: material.id },
          data: {
            status: MATERIAL_STATUS.OK,
            low_stock_email_sent: false,
            low_stock_email_date: null,
            low_stock_email_to: null,
          },
        });
        await writeAuditLog({
          entityType: "material",
          entityId: material.material_id,
          action: "Low Stock Flag Reset",
          details: `Reset alert flag — stock OK (${material.current_qty} > ${material.min_qty})`,
          user,
          occurredAt: now,
        });
        items.push({
          material_id: material.material_id,
          name: material.name,
          current_qty: material.current_qty,
          min_qty: material.min_qty,
          status: MATERIAL_STATUS.OK,
          action: "reset_ok",
          recipient: null,
          simulated: false,
        });
        reset += 1;
      }
      continue;
    }

    // Ensure status reflects low stock.
    if (material.status.trim().toLowerCase() !== "low stock") {
      await prisma.material.update({
        where: { id: material.id },
        data: { status: MATERIAL_STATUS.LOW_STOCK },
      });
    }

    const elapsed = hoursElapsed(material.low_stock_email_date, now);
    const withinWindow =
      material.low_stock_email_sent &&
      elapsed < frequencyHours &&
      !options?.force;

    if (withinWindow) {
      items.push({
        material_id: material.material_id,
        name: material.name,
        current_qty: material.current_qty,
        min_qty: material.min_qty,
        status: MATERIAL_STATUS.LOW_STOCK,
        action: "skipped_frequency",
        recipient: material.low_stock_email_to,
        simulated: false,
      });
      skipped += 1;
      continue;
    }

    const to = recipient || "unset@local";
    const subject = `[Tool Cage] Low stock: ${material.name} (${material.material_id})`;
    const body = [
      `Material ${material.material_id} (${material.name}) is low stock.`,
      `Current qty: ${material.current_qty} ${material.unit ?? ""}`.trim(),
      `Min qty: ${material.min_qty}`,
      `Location: ${material.location ?? "n/a"}`,
      `Simulated alert to: ${to}`,
    ].join("\n");

    // Simulate send (no SMTP required).
    console.info("[low-stock-alert:simulated]", {
      to,
      subject,
      material_id: material.material_id,
      current_qty: material.current_qty,
      min_qty: material.min_qty,
    });

    await prisma.$transaction(async (tx) => {
      await tx.material.update({
        where: { id: material.id },
        data: {
          status: MATERIAL_STATUS.LOW_STOCK,
          low_stock_email_sent: true,
          low_stock_email_date: now,
          low_stock_email_to: to,
        },
      });

      await writeAuditLog(
        {
          entityType: "material",
          entityId: material.material_id,
          action: "Low Stock Alert Simulated",
          details: `${subject} — ${body.replace(/\n/g, " | ")}`,
          user,
          occurredAt: now,
        },
        tx,
      );
    });

    items.push({
      material_id: material.material_id,
      name: material.name,
      current_qty: material.current_qty,
      min_qty: material.min_qty,
      status: MATERIAL_STATUS.LOW_STOCK,
      action: "alerted",
      recipient: to,
      simulated: true,
    });
    alerted += 1;
  }

  if (alerted > 0) {
    await writeUpdateLog(
      `Low stock alerts simulated for ${alerted} material(s) → ${recipient || "(no recipient)"}`,
      user,
    );
  }

  const lowStockCount = items.filter(
    (i) => i.action === "alerted" || i.action.startsWith("skipped"),
  ).length;

  return {
    enabled: true,
    recipient,
    frequencyHours,
    resetWhenOk,
    lowStockCount,
    alerted,
    skipped,
    reset,
    items,
    message: `Alerted ${alerted}, skipped ${skipped}, reset ${reset} (frequency ${frequencyHours}h).`,
  };
}

/** Clear low_stock_email_* flags on all materials (Admin Action). */
export async function resetLowStockEmailFlags(options?: {
  user?: string;
}): Promise<{ reset: number }> {
  const user = options?.user ?? "Admin";
  const result = await prisma.material.updateMany({
    where: {
      OR: [
        { low_stock_email_sent: true },
        { low_stock_email_date: { not: null } },
        { low_stock_email_to: { not: null } },
      ],
    },
    data: {
      low_stock_email_sent: false,
      low_stock_email_date: null,
      low_stock_email_to: null,
    },
  });

  await writeAuditLog({
    entityType: "automation",
    entityId: "low_stock_flags",
    action: "Reset Low Stock Email Flags",
    details: `Cleared alert flags on ${result.count} material(s)`,
    user,
  });

  return { reset: result.count };
}
