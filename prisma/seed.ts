import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const DEFAULT_SITE_NAME = "BowlingGreenKY";
const DEFAULT_SITE_EMAIL = "admin@bowlinggreen.local";

const EXCEL_CANDIDATES = [
  path.join(process.env.USERPROFILE ?? "", "Desktop", "Tool Scanning.xlsm"),
  path.join(process.env.USERPROFILE ?? "", "Desktop", "Tool Scanning.xlsx"),
  path.join(process.env.HOME ?? "", "Desktop", "Tool Scanning.xlsm"),
];

/** Excel serial date (days since 1899-12-30) → Date */
function excelSerialToDate(serial: unknown): Date | null {
  if (serial === null || serial === undefined || serial === "") return null;
  const n = typeof serial === "number" ? serial : Number(serial);
  if (!Number.isFinite(n)) {
    const parsed = new Date(String(serial));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  // Excel epoch (with 1900 leap-year bug) ≈ 1899-12-30 UTC
  const ms = Math.round((n - 25569) * 86400 * 1000);
  return new Date(ms);
}

function combineExcelDateTime(dateVal: unknown, timeVal: unknown): Date {
  const base = excelSerialToDate(dateVal) ?? new Date();
  const timeNum =
    typeof timeVal === "number"
      ? timeVal
      : timeVal
        ? Number(timeVal)
        : 0;
  if (Number.isFinite(timeNum) && timeNum > 0 && timeNum < 1.5) {
    return new Date(base.getTime() + Math.round(timeNum * 86400 * 1000));
  }
  return base;
}

function cellStr(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cellNum(row: Record<string, unknown>, key: string, fallback = 0): number {
  const v = row[key];
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBadgeId(raw: string): string {
  const s = raw.trim();
  const m = s.match(/%(\d+)\s*$/);
  if (m) return m[1];
  return s;
}

function normalizeAction(action: string): string {
  const a = action.trim().toLowerCase();
  if (a.includes("out")) return "Checked Out";
  if (a.includes("in")) return "Checked In";
  return action.trim() || "Checked Out";
}

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
}

/** Material Inventory table starts at row 3 with headers — parse with header row. */
function sheetToRowsWithHeader(
  wb: XLSX.WorkBook,
  sheetName: string,
  headerRowIndex: number,
): Record<string, unknown>[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as (string | number | null)[][];
  if (matrix.length <= headerRowIndex) return [];
  const headers = matrix[headerRowIndex].map((h) => String(h ?? "").trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (!line || line.every((c) => c === "" || c === null || c === undefined)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = line[idx] ?? "";
    });
    rows.push(obj);
  }
  return rows;
}

const FILLER_MATERIALS: Array<{
  name: string;
  category: string;
  unit: string;
  current_qty: number;
  min_qty: number;
}> = [
  { name: "Nitrile Gloves (M)", category: "Safety", unit: "Box", current_qty: 12, min_qty: 4 },
  { name: "Nitrile Gloves (L)", category: "Safety", unit: "Box", current_qty: 10, min_qty: 4 },
  { name: "Safety Glasses", category: "Safety", unit: "Each", current_qty: 18, min_qty: 8 },
  { name: "Ear Plugs", category: "Safety", unit: "Box", current_qty: 25, min_qty: 10 },
  { name: "Dust Masks", category: "Safety", unit: "Box", current_qty: 15, min_qty: 6 },
  { name: "Zip Ties (8in)", category: "Consumables", unit: "Bag", current_qty: 40, min_qty: 15 },
  { name: "Zip Ties (14in)", category: "Consumables", unit: "Bag", current_qty: 30, min_qty: 10 },
  { name: "Cable Ties Mounts", category: "Consumables", unit: "Pack", current_qty: 20, min_qty: 8 },
  { name: "Electrical Tape", category: "Consumables", unit: "Roll", current_qty: 22, min_qty: 8 },
  { name: "Duct Tape", category: "Consumables", unit: "Roll", current_qty: 14, min_qty: 5 },
  { name: "Painter's Plastic", category: "Consumables", unit: "Roll", current_qty: 8, min_qty: 3 },
  { name: "Shop Rags", category: "Consumables", unit: "Box", current_qty: 16, min_qty: 6 },
  { name: "WD-40", category: "Consumables", unit: "Can", current_qty: 9, min_qty: 3 },
  { name: "Cutting Oil", category: "Consumables", unit: "Bottle", current_qty: 6, min_qty: 2 },
  { name: "Grease Tubes", category: "Consumables", unit: "Each", current_qty: 11, min_qty: 4 },
  { name: "Sandpaper 80 Grit", category: "Consumables", unit: "Pack", current_qty: 13, min_qty: 5 },
  { name: "Sandpaper 220 Grit", category: "Consumables", unit: "Pack", current_qty: 12, min_qty: 5 },
  { name: "Drill Bits Assorted", category: "Hardware", unit: "Set", current_qty: 7, min_qty: 2 },
  { name: "Hex Key Set", category: "Hardware", unit: "Set", current_qty: 5, min_qty: 2 },
  { name: "Machine Screws M6", category: "Hardware", unit: "Box", current_qty: 28, min_qty: 10 },
  { name: "Washers Assorted", category: "Hardware", unit: "Box", current_qty: 35, min_qty: 12 },
  { name: "Lock Nuts", category: "Hardware", unit: "Box", current_qty: 24, min_qty: 10 },
  { name: "Wire Nuts", category: "Electrical", unit: "Bag", current_qty: 40, min_qty: 15 },
  { name: "14 AWG Wire", category: "Electrical", unit: "Spool", current_qty: 4, min_qty: 2 },
  { name: "Heat Shrink Tubing", category: "Electrical", unit: "Pack", current_qty: 10, min_qty: 3 },
  { name: "Cable Clamps", category: "Electrical", unit: "Pack", current_qty: 18, min_qty: 6 },
  { name: "Marking Paint Orange", category: "Consumables", unit: "Can", current_qty: 8, min_qty: 3 },
  { name: "Chalk Line", category: "Measuring", unit: "Each", current_qty: 3, min_qty: 1 },
  { name: "Utility Blades", category: "Consumables", unit: "Pack", current_qty: 20, min_qty: 8 },
  { name: "Putty Knives", category: "Hand Tools", unit: "Each", current_qty: 6, min_qty: 2 },
  { name: "Caulk Tubes", category: "Consumables", unit: "Each", current_qty: 14, min_qty: 5 },
  { name: "Foam Ear Muffs", category: "Safety", unit: "Each", current_qty: 5, min_qty: 2 },
  { name: "Hi-Vis Vests", category: "Safety", unit: "Each", current_qty: 9, min_qty: 4 },
  { name: "Knee Pads", category: "Safety", unit: "Pair", current_qty: 4, min_qty: 2 },
  { name: "Shop Vacuum Bags", category: "Consumables", unit: "Pack", current_qty: 7, min_qty: 3 },
  { name: "Rivet Assortment", category: "Hardware", unit: "Box", current_qty: 15, min_qty: 5 },
];

const DEFAULT_SETTINGS: Array<{ key: string; value: string; notes?: string }> = [
  {
    key: "low_stock_alerts_enabled",
    value: "true",
    notes: "Power Automate should only send if this is TRUE",
  },
  {
    key: "low_stock_email_to",
    value: "Amarri.Merriweather@voltava.com",
    notes: "Primary recipient for low stock alerts",
  },
  {
    key: "low_stock_email_cc",
    value: "",
    notes: "Optional CC recipient",
  },
  {
    key: "alert_frequency_hours",
    value: "24",
    notes: "Prevents repeated alerts too often",
  },
  {
    key: "reset_email_flag_when_ok",
    value: "true",
    notes: "Allows a future email if item becomes OK, then LOW STOCK again",
  },
  {
    key: "send_from",
    value: "Flow Owner",
    notes: "Usually the Microsoft account that owns the flow",
  },
  {
    key: "material_table_name",
    value: "MaterialInventory",
    notes: "Power Automate source table",
  },
  {
    key: "status_column",
    value: "Status",
    notes: "Alert when this equals LOW STOCK",
  },
  {
    key: "email_sent_column",
    value: "Low Stock Email Sent",
    notes: "Use this to prevent duplicates",
  },
  {
    key: "email_date_column",
    value: "Low Stock Email Date",
    notes: "Timestamp when alert was sent",
  },
  {
    key: "admin_badge_ids",
    value: "6279",
    notes: "Badges allowed to change admin settings",
  },
  {
    key: "material_manager_badge_ids",
    value: "1022",
    notes: "Badges allowed to adjust material inventory",
  },
  {
    key: "require_purpose",
    value: "true",
    notes: "Prevents transactions without accountability",
  },
  {
    key: "allow_manual_inventory_edits",
    value: "false",
    notes: "Use controlled transactions instead of direct edits",
  },
  {
    key: "default_location",
    value: "Project Cage",
    notes: "Default location for new tools/materials",
  },
  {
    key: "manual_adjustment_reason_required",
    value: "true",
    notes: "Every manual change needs a reason",
  },
  {
    key: "count_variance_review_required",
    value: "true",
    notes: "Variance must be reviewed by admin",
  },
  {
    key: "missing_tool_escalation_hours",
    value: "2",
    notes: "Uses overdue setting for missing tool escalation",
  },
  {
    key: "keep_transaction_history",
    value: "true",
    notes: "Do not delete transaction rows",
  },
  {
    key: "missing_after_hours",
    value: "2",
    notes:
      "If Status is Checked Out and Checkout Time older than this many hours, Auto Status becomes MISSING",
  },
  {
    key: "allowed_actions",
    value: '["Checked Out","Checked In"]',
    notes: "Scanner list",
  },
  {
    key: "allowed_conditions",
    value: '["Good","Fair","Needs Repair"]',
    notes: "Condition list",
  },
  {
    key: "allowed_tool_statuses",
    value: '["Available","Checked Out","Missing"]',
    notes: "Allowed tool inventory statuses",
  },
  {
    key: "role_permissions",
    value: JSON.stringify({
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
    }),
    notes: "JSON map of role → permission list",
  },
];

function findWorkbookPath(): string | null {
  for (const p of EXCEL_CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function loadWorkbook(): XLSX.WorkBook | null {
  const wbPath = findWorkbookPath();
  if (!wbPath) {
    console.warn("Excel workbook not found; falling back to generated seed data.");
    return null;
  }
  console.log(`Reading workbook: ${wbPath}`);
  return XLSX.readFile(wbPath, { cellDates: false, bookVBA: false });
}

function buildEmployees(wb: XLSX.WorkBook | null) {
  const fromExcel: Array<{
    badge_id: string;
    raw_badge_data: string;
    name: string;
    job_title: string | null;
  }> = [];

  if (wb) {
    // Header is row 1 (index 0)
    const rows = sheetToRowsWithHeader(wb, "Employee Directory", 0);
    for (const row of rows) {
      const badge = cellStr(row, "Badge ID");
      const raw = cellStr(row, "Raw Emp Data");
      const name = cellStr(row, "Employee Name");
      if (!badge || !name) continue;
      fromExcel.push({
        badge_id: normalizeBadgeId(badge),
        raw_badge_data: raw || `4MT$RECV%${normalizeBadgeId(badge)}`,
        name,
        job_title: cellStr(row, "Job Title") || null,
      });
    }
  }

  const byBadge = new Map(fromExcel.map((e) => [e.badge_id, e]));
  // Ensure exactly 92
  let nextBadge = 9000;
  while (byBadge.size < 92) {
    const badge_id = String(nextBadge++);
    if (byBadge.has(badge_id)) continue;
    byBadge.set(badge_id, {
      badge_id,
      raw_badge_data: `4MT$RECV%${badge_id}`,
      name: `Employee ${badge_id}`,
      job_title: "Associate",
    });
  }

  return Array.from(byBadge.values()).slice(0, 92);
}

function buildTools(wb: XLSX.WorkBook | null) {
  const tools: Array<{
    tool_id: string;
    name: string;
    category: string | null;
    location: string | null;
    status: string;
    last_checked_out_by: string | null;
    condition: string | null;
    notes: string | null;
    checkout_time: Date | null;
    auto_status: string | null;
    overdue_since: Date | null;
  }> = [];

  if (wb) {
    const rows = sheetToRowsWithHeader(wb, "Tool Inventory", 2);
    for (const row of rows) {
      const tool_id = cellStr(row, "Tool ID").toUpperCase();
      if (!tool_id) continue;
      tools.push({
        tool_id,
        name: cellStr(row, "Tool Name") || tool_id,
        category: cellStr(row, "Category") || null,
        location: cellStr(row, "Location") || "Project Cage",
        status: cellStr(row, "Status") || "Available",
        last_checked_out_by: cellStr(row, "Last Checked Out By") || null,
        condition: cellStr(row, "Condition") || "Good",
        notes: cellStr(row, "Notes") || null,
        checkout_time: excelSerialToDate(row["Checkout Time"]),
        auto_status: cellStr(row, "Auto Status") || null,
        overdue_since: excelSerialToDate(row["Overdue Since"]),
      });
    }
  }

  const defaults = [
    "Cordless Drill",
    "Circular Saw",
    "Hammer",
    "Socket Set",
    "Angle Grinder",
    "Tape Measure",
    "Level",
    "Reciprocating Saw",
    "Screwdriver Set",
    "Impact Driver",
    "Hammer Drill",
  ];
  while (tools.length < 11) {
    const n = tools.length + 1;
    tools.push({
      tool_id: `TL-${String(n).padStart(3, "0")}`,
      name: defaults[n - 1] ?? `Tool ${n}`,
      category: n <= 5 || n >= 8 ? "Power Tools" : n <= 4 ? "Hand Tools" : "Measuring",
      location: "Project Cage",
      status: "Available",
      last_checked_out_by: null,
      condition: "Good",
      notes: null,
      checkout_time: null,
      auto_status: "Available",
      overdue_since: null,
    });
  }
  return tools.slice(0, 11);
}

function buildMaterials(wb: XLSX.WorkBook | null) {
  const materials: Array<{
    material_id: string;
    name: string;
    category: string | null;
    unit: string | null;
    location: string | null;
    current_qty: number;
    min_qty: number;
    status: string;
    last_taken_by: string | null;
    notes: string | null;
  }> = [];

  if (wb) {
    const rows = sheetToRowsWithHeader(wb, "Material Inventory", 2);
    for (const row of rows) {
      const material_id = cellStr(row, "Material ID").toUpperCase();
      if (!material_id) continue;
      const current_qty = cellNum(row, "Current Qty");
      const min_qty = cellNum(row, "Min Qty");
      let status = cellStr(row, "Status") || "OK";
      if (current_qty <= min_qty) status = "LOW STOCK";
      materials.push({
        material_id,
        name: cellStr(row, "Material Name") || material_id,
        category: cellStr(row, "Category") || null,
        unit: cellStr(row, "Unit") || null,
        location: cellStr(row, "Location") || "Project Cage",
        current_qty,
        min_qty,
        status,
        last_taken_by: cellStr(row, "Last Taken By") || null,
        notes: cellStr(row, "Notes") || null,
      });
    }
  }

  let idx = 0;
  while (materials.length < 41) {
    const n = materials.length + 1;
    const filler = FILLER_MATERIALS[idx % FILLER_MATERIALS.length];
    idx++;
    const material_id = `MAT-${String(n).padStart(3, "0")}`;
    if (materials.some((m) => m.material_id === material_id)) continue;
    const status = filler.current_qty <= filler.min_qty ? "LOW STOCK" : "OK";
    materials.push({
      material_id,
      name: filler.name,
      category: filler.category,
      unit: filler.unit,
      location: "Project Cage",
      current_qty: filler.current_qty,
      min_qty: filler.min_qty,
      status,
      last_taken_by: null,
      notes: "Generated to complete 41-material inventory (Excel table had blank ID rows)",
    });
  }
  return materials.slice(0, 41);
}

function buildToolTransactions(wb: XLSX.WorkBook | null) {
  if (!wb) return [];
  const rows = sheetToRowsWithHeader(wb, "Tool Transactions", 1);
  return rows
    .map((row) => {
      const transaction_id = cellStr(row, "Transaction ID");
      const tool_id = cellStr(row, "Tool ID").toUpperCase();
      if (!transaction_id || !tool_id) return null;
      return {
        transaction_id,
        occurred_at: combineExcelDateTime(row["Date"], row["Time"]),
        badge_id: normalizeBadgeId(cellStr(row, "Badge ID")),
        employee_name: cellStr(row, "Employee Name") || null,
        tool_id,
        tool_name: cellStr(row, "Tool Name") || null,
        action: normalizeAction(cellStr(row, "Action")),
        purpose: cellStr(row, "Purpose") || null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

function buildMaterialTransactions(wb: XLSX.WorkBook | null) {
  if (!wb) return [];
  const rows = sheetToRowsWithHeader(wb, "Material Transactions", 1);
  return rows
    .map((row) => {
      const transaction_id = cellStr(row, "Transaction ID");
      const material_id = cellStr(row, "Material ID").toUpperCase();
      if (!transaction_id || !material_id) return null;
      return {
        transaction_id,
        occurred_at: combineExcelDateTime(row["Date"], row["Time"]),
        badge_id: normalizeBadgeId(cellStr(row, "Badge ID")),
        employee_name: cellStr(row, "Employee Name") || null,
        material_id,
        material_name: cellStr(row, "Material Name") || null,
        qty_taken: cellNum(row, "Qty Taken"),
        unit: cellStr(row, "Unit") || null,
        remaining_qty: cellNum(row, "Remaining Qty", NaN),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({
      ...r,
      remaining_qty: Number.isFinite(r.remaining_qty) ? r.remaining_qty : null,
    }));
}

function buildUpdateLogs(wb: XLSX.WorkBook | null) {
  if (!wb) return [];
  const rows = sheetToRowsWithHeader(wb, "Updates", 6);
  // Headers may be Update # / Date / Description / Updated By
  return rows
    .map((row) => {
      const numRaw =
        row["Update #"] ?? row["Update#"] ?? Object.values(row)[0];
      const update_number = Number(numRaw);
      if (!Number.isFinite(update_number)) return null;
      const description =
        cellStr(row, "Description") ||
        String(Object.values(row)[2] ?? "").trim();
      if (!description) return null;
      return {
        update_number,
        event_date: excelSerialToDate(row["Date"] ?? Object.values(row)[1]) ?? new Date(),
        description,
        updated_by:
          cellStr(row, "Updated By") ||
          String(Object.values(row)[3] ?? "").trim() ||
          null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .slice(0, 20);
}

type AuditSeedRow = {
  audit_id: string;
  occurred_at: Date;
  changed_by: string | null;
  tool_id: string | null;
  change_type: string | null;
  notes: string | null;
};

const FALLBACK_AUDIT_LOGS: AuditSeedRow[] = [
  {
    audit_id: "AUD-001",
    occurred_at: new Date("2026-06-17T01:00:00.000Z"),
    changed_by: "Amarri",
    tool_id: "TL-001",
    change_type: "Status Change",
    notes: "Corrected status after system error",
  },
  {
    audit_id: "AUD-002",
    occurred_at: new Date("2026-06-17T01:38:20.000Z"),
    changed_by: "System",
    tool_id: "TL-011",
    change_type: "Tool Added",
    notes: "New tool added: Hammer Drill",
  },
];

function buildAuditLogs(wb: XLSX.WorkBook | null): AuditSeedRow[] {
  if (!wb) {
    return FALLBACK_AUDIT_LOGS;
  }
  // Security & Audit sheet has free-form layout; seed known sample rows if present
  const sheet = wb.Sheets["Security & Audit"];
  if (!sheet) return FALLBACK_AUDIT_LOGS;
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as (string | number | null)[][];
  const audits: AuditSeedRow[] = [];
  for (const line of matrix) {
    const audit_id = String(line[8] ?? "").trim();
    if (!audit_id.startsWith("AUD-")) continue;
    audits.push({
      audit_id,
      occurred_at: excelSerialToDate(line[9]) ?? new Date(),
      changed_by: String(line[10] ?? "").trim() || null,
      tool_id: String(line[11] ?? "").trim() || null,
      change_type: String(line[12] ?? "").trim() || null,
      notes: String(line[13] ?? "").trim() || null,
    });
  }
  return audits.length ? audits : FALLBACK_AUDIT_LOGS;
}

async function clearInventory() {
  // FK-safe order (keep sites; password refreshed via upsert)
  await prisma.toolTransaction.deleteMany();
  await prisma.materialTransaction.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.updateLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.material.deleteMany();
  await prisma.employee.deleteMany();
}

async function ensureDefaultSite() {
  const plain =
    process.env.DEFAULT_SITE_PASSWORD?.trim() || "ChangeMeSite1!";
  const adminPlain =
    process.env.DEFAULT_SITE_ADMIN_PASSWORD?.trim() || `${plain}Admin`;
  const password_hash = await bcrypt.hash(plain, 12);
  const site_admin_password_hash = await bcrypt.hash(adminPlain, 12);

  return prisma.site.upsert({
    where: { name: DEFAULT_SITE_NAME },
    create: {
      name: DEFAULT_SITE_NAME,
      password_hash,
      site_admin_password_hash,
      contact_email: DEFAULT_SITE_EMAIL,
      preset: "checkout",
    },
    update: {
      password_hash,
      site_admin_password_hash,
      contact_email: DEFAULT_SITE_EMAIL,
      preset: "checkout",
    },
  });
}

async function main() {
  console.log("Seeding OpsFlow…");
  const wb = loadWorkbook();

  const employees = buildEmployees(wb);
  const tools = buildTools(wb);
  const materials = buildMaterials(wb);
  const toolTx = buildToolTransactions(wb);
  const materialTx = buildMaterialTransactions(wb);
  const updates = buildUpdateLogs(wb);
  const audits = buildAuditLogs(wb);

  if (employees.length !== 92) {
    throw new Error(`Expected 92 employees, got ${employees.length}`);
  }
  if (tools.length !== 11) {
    throw new Error(`Expected 11 tools, got ${tools.length}`);
  }
  if (materials.length !== 41) {
    throw new Error(`Expected 41 materials, got ${materials.length}`);
  }

  const site = await ensureDefaultSite();
  const siteId = site.id;
  console.log(`Using site ${site.name} (id=${siteId})`);

  await clearInventory();

  await prisma.employee.createMany({
    data: employees.map((e) => ({ ...e, site_id: siteId })),
  });
  await prisma.tool.createMany({
    data: tools.map((t) => ({ ...t, site_id: siteId })),
  });
  await prisma.material.createMany({
    data: materials.map((m) => ({ ...m, site_id: siteId })),
  });

  const employeeByBadge = Object.fromEntries(
    (
      await prisma.employee.findMany({
        where: { site_id: siteId },
        select: { id: true, badge_id: true },
      })
    ).map((e) => [e.badge_id, e.id]),
  );

  if (toolTx.length) {
    await prisma.toolTransaction.createMany({
      data: toolTx.map((t) => ({
        site_id: siteId,
        transaction_id: t.transaction_id,
        occurred_at: t.occurred_at,
        badge_id: t.badge_id,
        employee_id: employeeByBadge[t.badge_id] ?? null,
        employee_name: t.employee_name,
        tool_id: t.tool_id,
        tool_name: t.tool_name,
        action: t.action,
        purpose: t.purpose,
      })),
    });
  }

  if (materialTx.length) {
    await prisma.materialTransaction.createMany({
      data: materialTx.map((t) => ({
        site_id: siteId,
        transaction_id: t.transaction_id,
        occurred_at: t.occurred_at,
        badge_id: t.badge_id,
        employee_id: employeeByBadge[t.badge_id] ?? null,
        employee_name: t.employee_name,
        material_id: t.material_id,
        material_name: t.material_name,
        qty_taken: t.qty_taken,
        unit: t.unit,
        remaining_qty: t.remaining_qty,
      })),
    });
  }

  await prisma.setting.createMany({
    data: DEFAULT_SETTINGS.map((s) => ({ ...s, site_id: siteId })),
  });

  if (updates.length) {
    await prisma.updateLog.createMany({
      data: updates.map((u) => ({ ...u, site_id: siteId })),
    });
  }

  if (audits.length) {
    await prisma.auditLog.createMany({
      data: audits.map((a) => ({ ...a, site_id: siteId })),
    });
  }

  const counts = {
    site: site.name,
    employees: await prisma.employee.count({ where: { site_id: siteId } }),
    tools: await prisma.tool.count({ where: { site_id: siteId } }),
    materials: await prisma.material.count({ where: { site_id: siteId } }),
    tool_transactions: await prisma.toolTransaction.count({
      where: { site_id: siteId },
    }),
    material_transactions: await prisma.materialTransaction.count({
      where: { site_id: siteId },
    }),
    settings: await prisma.setting.count({ where: { site_id: siteId } }),
    update_logs: await prisma.updateLog.count({ where: { site_id: siteId } }),
    audit_logs: await prisma.auditLog.count({ where: { site_id: siteId } }),
  };

  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
