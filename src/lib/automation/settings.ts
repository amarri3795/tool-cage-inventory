import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/automation/audit";

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Known automation / admin settings with sensible defaults. */
export const AUTOMATION_SETTING_DEFAULTS: Record<
  string,
  { value: string; notes: string }
> = {
  missing_after_hours: {
    value: "2",
    notes:
      "If Status is Checked Out and Checkout Time older than this many hours, mark Missing",
  },
  low_stock_alerts_enabled: {
    value: "true",
    notes: "Enable low stock alert automation",
  },
  low_stock_email_to: {
    value: "",
    notes: "Primary recipient for low stock alerts",
  },
  alert_email_recipient: {
    value: "",
    notes: "Alias for low_stock_email_to (preferred if both set)",
  },
  alert_frequency_hours: {
    value: "24",
    notes: "Minimum hours between repeated low-stock alerts per material",
  },
  reset_email_flag_when_ok: {
    value: "true",
    notes: "Clear low_stock_email_sent when material returns to OK",
  },
};

export async function getSettingValue(
  key: string,
  fallback = "",
  db: DbClient = prisma,
): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  if (row) return row.value;
  const def = AUTOMATION_SETTING_DEFAULTS[key];
  return def?.value ?? fallback;
}

export async function getSettingBool(
  key: string,
  fallback = false,
  db: DbClient = prisma,
): Promise<boolean> {
  const raw = (await getSettingValue(key, String(fallback), db))
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "on"].includes(raw)) return true;
  if (["false", "0", "no", "off"].includes(raw)) return false;
  return fallback;
}

export async function getSettingNumber(
  key: string,
  fallback: number,
  db: DbClient = prisma,
): Promise<number> {
  const raw = await getSettingValue(key, String(fallback), db);
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Prefer alert_email_recipient, then low_stock_email_to. */
export async function getAlertEmailRecipient(
  db: DbClient = prisma,
): Promise<string> {
  const preferred = (await getSettingValue("alert_email_recipient", "", db)).trim();
  if (preferred) return preferred;
  return (await getSettingValue("low_stock_email_to", "", db)).trim();
}

/**
 * Ensure automation-related settings exist in the DB (idempotent upsert).
 */
export async function ensureAutomationSettings(
  db: DbClient = prisma,
): Promise<void> {
  for (const [key, meta] of Object.entries(AUTOMATION_SETTING_DEFAULTS)) {
    const existing = await db.setting.findUnique({ where: { key } });
    if (!existing) {
      await db.setting.create({
        data: { key, value: meta.value, notes: meta.notes },
      });
    }
  }
}

export async function upsertSetting(
  key: string,
  value: string,
  options?: {
    notes?: string | null;
    user?: string | null;
    writeAudit?: boolean;
    db?: DbClient;
  },
) {
  const db = options?.db ?? prisma;
  const previous = await db.setting.findUnique({ where: { key } });
  const row = await db.setting.upsert({
    where: { key },
    create: {
      key,
      value,
      notes: options?.notes ?? AUTOMATION_SETTING_DEFAULTS[key]?.notes ?? null,
    },
    update: {
      value,
      ...(options?.notes !== undefined ? { notes: options.notes } : {}),
    },
  });

  if (options?.writeAudit !== false) {
    await writeAuditLog(
      {
        entityType: "setting",
        entityId: key,
        action: previous ? "Setting Updated" : "Setting Created",
        details: previous
          ? `Changed "${key}" from "${previous.value}" to "${value}"`
          : `Created "${key}" = "${value}"`,
        user: options?.user ?? "Admin",
      },
      db,
    );
  }

  return row;
}
