import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/automation/audit";

/**
 * Setting key mapping (Excel Admin Center → web / seed keys)
 *
 * | Excel / conceptual label              | DB key                         |
 * |---------------------------------------|--------------------------------|
 * | Missing after hours                   | missing_after_hours            |
 * | Default location                      | default_location               |
 * | Allowed tool statuses                 | allowed_tool_statuses          |
 * | Allowed actions                       | allowed_actions                |
 * | Allowed conditions                    | allowed_conditions             |
 * | Require purpose/reason                | require_purpose                |
 * | Admin badge IDs                       | admin_badge_ids                |
 * | Material manager badge IDs            | material_manager_badge_ids     |
 * | Role permissions                      | role_permissions               |
 * | Low stock alerts enabled              | low_stock_alerts_enabled       |
 * | Alert email recipient                 | low_stock_email_to             |
 * | Alert frequency hours                 | alert_frequency_hours          |
 * | Reset alert flag when material OK     | reset_email_flag_when_ok       |
 * | Allow manual inventory edits (lock)   | allow_manual_inventory_edits   |
 *
 * List values may be comma-separated (legacy Excel seed) or JSON string arrays.
 */

export const SETTING_KEYS = {
  missingAfterHours: "missing_after_hours",
  defaultLocation: "default_location",
  allowedToolStatuses: "allowed_tool_statuses",
  allowedActions: "allowed_actions",
  allowedConditions: "allowed_conditions",
  requirePurpose: "require_purpose",
  adminBadgeIds: "admin_badge_ids",
  materialManagerBadgeIds: "material_manager_badge_ids",
  rolePermissions: "role_permissions",
  lowStockAlertsEnabled: "low_stock_alerts_enabled",
  lowStockEmailTo: "low_stock_email_to",
  alertFrequencyHours: "alert_frequency_hours",
  resetEmailFlagWhenOk: "reset_email_flag_when_ok",
  allowManualInventoryEdits: "allow_manual_inventory_edits",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    "settings",
    "health",
    "actions",
    "inventory_lock",
    "audit_export",
    "scan",
    "view_dashboard",
  ],
  material_manager: [
    "materials_adjust",
    "low_stock_view",
    "scan",
    "view_dashboard",
  ],
  user: ["scan", "view_dashboard"],
} as const;

/** Defaults used when a key is missing from the DB (e.g. pre-existing seed). */
export const SETTING_DEFAULTS: Record<SettingKey, string> = {
  [SETTING_KEYS.missingAfterHours]: "2",
  [SETTING_KEYS.defaultLocation]: "Project Cage",
  [SETTING_KEYS.allowedToolStatuses]: '["Available","Checked Out","Missing"]',
  [SETTING_KEYS.allowedActions]: '["Checked Out","Checked In"]',
  [SETTING_KEYS.allowedConditions]: '["Good","Fair","Needs Repair"]',
  [SETTING_KEYS.requirePurpose]: "true",
  [SETTING_KEYS.adminBadgeIds]: '["6279"]',
  [SETTING_KEYS.materialManagerBadgeIds]: '["1022"]',
  [SETTING_KEYS.rolePermissions]: JSON.stringify(DEFAULT_ROLE_PERMISSIONS),
  [SETTING_KEYS.lowStockAlertsEnabled]: "true",
  [SETTING_KEYS.lowStockEmailTo]: "",
  [SETTING_KEYS.alertFrequencyHours]: "24",
  [SETTING_KEYS.resetEmailFlagWhenOk]: "true",
  [SETTING_KEYS.allowManualInventoryEdits]: "false",
};

export type AdminSettings = {
  missing_after_hours: number;
  default_location: string;
  allowed_tool_statuses: string[];
  allowed_actions: string[];
  allowed_conditions: string[];
  require_purpose: boolean;
  admin_badge_ids: string[];
  material_manager_badge_ids: string[];
  role_permissions: Record<string, string[]>;
  low_stock_alerts_enabled: boolean;
  low_stock_email_to: string;
  alert_frequency_hours: number;
  reset_email_flag_when_ok: boolean;
  allow_manual_inventory_edits: boolean;
};

export type SettingRow = {
  key: string;
  value: string;
  notes: string | null;
  updated_at: string;
};

export function parseListValue(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // fall through to CSV
    }
  }
  return trimmed
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeListValue(items: string[]): string {
  return JSON.stringify(items.map((s) => s.trim()).filter(Boolean));
}

export function parseBool(raw: string, fallback = false): boolean {
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(v)) return true;
  if (["false", "0", "no", "n", "off"].includes(v)) return false;
  return fallback;
}

export function parseNumber(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function parseRolePermissions(raw: string): Record<string, string[]> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string[]> = {};
      for (const [role, perms] of Object.entries(parsed)) {
        out[role] = Array.isArray(perms)
          ? perms.map((p) => String(p))
          : [];
      }
      return out;
    }
  } catch {
    // ignore
  }
  return {
    ...DEFAULT_ROLE_PERMISSIONS,
  } as unknown as Record<string, string[]>;
}

export async function getSettingMap(): Promise<Map<string, string>> {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    if (!map.has(key)) map.set(key, value);
  }
  return map;
}

export async function ensureAdminSettingDefaults(): Promise<void> {
  for (const [key, value] of Object.entries(SETTING_DEFAULTS) as [
    SettingKey,
    string,
  ][]) {
    await prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value,
        notes: key === SETTING_KEYS.allowedToolStatuses
          ? "Allowed tool inventory statuses"
          : key === SETTING_KEYS.rolePermissions
            ? "JSON map of role → permission list"
            : null,
      },
      update: {},
    });
  }
}

export async function getAdminSettings(): Promise<AdminSettings> {
  await ensureAdminSettingDefaults();
  const map = await getSettingMap();

  return {
    missing_after_hours: parseNumber(
      map.get(SETTING_KEYS.missingAfterHours) ?? "2",
      2,
    ),
    default_location: map.get(SETTING_KEYS.defaultLocation) ?? "Project Cage",
    allowed_tool_statuses: parseListValue(
      map.get(SETTING_KEYS.allowedToolStatuses) ?? "",
    ),
    allowed_actions: parseListValue(
      map.get(SETTING_KEYS.allowedActions) ?? "",
    ),
    allowed_conditions: parseListValue(
      map.get(SETTING_KEYS.allowedConditions) ?? "",
    ),
    require_purpose: parseBool(
      map.get(SETTING_KEYS.requirePurpose) ?? "true",
      true,
    ),
    admin_badge_ids: parseListValue(
      map.get(SETTING_KEYS.adminBadgeIds) ?? "",
    ),
    material_manager_badge_ids: parseListValue(
      map.get(SETTING_KEYS.materialManagerBadgeIds) ?? "",
    ),
    role_permissions: parseRolePermissions(
      map.get(SETTING_KEYS.rolePermissions) ??
        JSON.stringify(DEFAULT_ROLE_PERMISSIONS),
    ),
    low_stock_alerts_enabled: parseBool(
      map.get(SETTING_KEYS.lowStockAlertsEnabled) ?? "true",
      true,
    ),
    low_stock_email_to: map.get(SETTING_KEYS.lowStockEmailTo) ?? "",
    alert_frequency_hours: parseNumber(
      map.get(SETTING_KEYS.alertFrequencyHours) ?? "24",
      24,
    ),
    reset_email_flag_when_ok: parseBool(
      map.get(SETTING_KEYS.resetEmailFlagWhenOk) ?? "true",
      true,
    ),
    allow_manual_inventory_edits: parseBool(
      map.get(SETTING_KEYS.allowManualInventoryEdits) ?? "false",
      false,
    ),
  };
}

export async function getSettingRows(): Promise<SettingRow[]> {
  await ensureAdminSettingDefaults();
  const rows = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    notes: r.notes,
    updated_at: r.updated_at.toISOString(),
  }));
}

export type SettingsUpdateInput = Partial<{
  missing_after_hours: number | string;
  default_location: string;
  allowed_tool_statuses: string[] | string;
  allowed_actions: string[] | string;
  allowed_conditions: string[] | string;
  require_purpose: boolean | string;
  admin_badge_ids: string[] | string;
  material_manager_badge_ids: string[] | string;
  role_permissions: Record<string, string[]> | string;
  low_stock_alerts_enabled: boolean | string;
  low_stock_email_to: string;
  alert_frequency_hours: number | string;
  reset_email_flag_when_ok: boolean | string;
  allow_manual_inventory_edits: boolean | string;
}>;

function toBoolString(value: boolean | string): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return parseBool(String(value)) ? "true" : "false";
}

function toListString(value: string[] | string): string {
  if (Array.isArray(value)) return serializeListValue(value);
  const asList = parseListValue(value);
  return serializeListValue(asList);
}

export async function updateAdminSettings(
  input: SettingsUpdateInput,
  options?: { user?: string | null },
): Promise<AdminSettings> {
  const writes: Array<{ key: SettingKey; value: string }> = [];

  if (input.missing_after_hours !== undefined) {
    writes.push({
      key: SETTING_KEYS.missingAfterHours,
      value: String(Number(input.missing_after_hours) || 0),
    });
  }
  if (input.default_location !== undefined) {
    writes.push({
      key: SETTING_KEYS.defaultLocation,
      value: String(input.default_location).trim(),
    });
  }
  if (input.allowed_tool_statuses !== undefined) {
    writes.push({
      key: SETTING_KEYS.allowedToolStatuses,
      value: toListString(input.allowed_tool_statuses),
    });
  }
  if (input.allowed_actions !== undefined) {
    writes.push({
      key: SETTING_KEYS.allowedActions,
      value: toListString(input.allowed_actions),
    });
  }
  if (input.allowed_conditions !== undefined) {
    writes.push({
      key: SETTING_KEYS.allowedConditions,
      value: toListString(input.allowed_conditions),
    });
  }
  if (input.require_purpose !== undefined) {
    writes.push({
      key: SETTING_KEYS.requirePurpose,
      value: toBoolString(input.require_purpose),
    });
  }
  if (input.admin_badge_ids !== undefined) {
    writes.push({
      key: SETTING_KEYS.adminBadgeIds,
      value: toListString(input.admin_badge_ids),
    });
  }
  if (input.material_manager_badge_ids !== undefined) {
    writes.push({
      key: SETTING_KEYS.materialManagerBadgeIds,
      value: toListString(input.material_manager_badge_ids),
    });
  }
  if (input.role_permissions !== undefined) {
    const value =
      typeof input.role_permissions === "string"
        ? input.role_permissions
        : JSON.stringify(input.role_permissions);
    writes.push({ key: SETTING_KEYS.rolePermissions, value });
  }
  if (input.low_stock_alerts_enabled !== undefined) {
    writes.push({
      key: SETTING_KEYS.lowStockAlertsEnabled,
      value: toBoolString(input.low_stock_alerts_enabled),
    });
  }
  if (input.low_stock_email_to !== undefined) {
    writes.push({
      key: SETTING_KEYS.lowStockEmailTo,
      value: String(input.low_stock_email_to).trim(),
    });
  }
  if (input.alert_frequency_hours !== undefined) {
    writes.push({
      key: SETTING_KEYS.alertFrequencyHours,
      value: String(Number(input.alert_frequency_hours) || 0),
    });
  }
  if (input.reset_email_flag_when_ok !== undefined) {
    writes.push({
      key: SETTING_KEYS.resetEmailFlagWhenOk,
      value: toBoolString(input.reset_email_flag_when_ok),
    });
  }
  if (input.allow_manual_inventory_edits !== undefined) {
    writes.push({
      key: SETTING_KEYS.allowManualInventoryEdits,
      value: toBoolString(input.allow_manual_inventory_edits),
    });
  }

  for (const write of writes) {
    const previous = await prisma.setting.findUnique({
      where: { key: write.key },
    });
    await prisma.setting.upsert({
      where: { key: write.key },
      create: { key: write.key, value: write.value },
      update: { value: write.value },
    });

    if (!previous || previous.value !== write.value) {
      await writeAuditLog({
        entityType: "setting",
        entityId: write.key,
        action: previous ? "Setting Updated" : "Setting Created",
        details: previous
          ? `Changed "${write.key}" from "${previous.value}" to "${write.value}"`
          : `Created "${write.key}" = "${write.value}"`,
        user: options?.user ?? "Admin",
      });
    }
  }

  return getAdminSettings();
}
