import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  EmployeeSummary,
  ItemKind,
  ItemSummary,
  MaterialSummary,
  ToolSummary,
} from "@/lib/scan-types";

export type {
  EmployeeSummary,
  ItemKind,
  ItemSummary,
  MaterialSummary,
  ToolSummary,
} from "@/lib/scan-types";

export {
  MATERIAL_ACTIONS,
  MATERIAL_STATUS,
  TOOL_ACTIONS,
  TOOL_STATUS,
} from "@/lib/scan-types";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function normalizeBadgeInput(input: string): string {
  return input.trim();
}

/** Resolve employee by badge_id, or exact raw_badge_data match (within site). */
export async function findEmployeeByBadge(
  badgeInput: string,
  siteId: number,
  db: DbClient = prisma,
): Promise<EmployeeSummary | null> {
  const raw = normalizeBadgeInput(badgeInput);
  if (!raw) return null;

  const byBadgeId = await db.employee.findUnique({
    where: { site_id_badge_id: { site_id: siteId, badge_id: raw } },
  });
  if (byBadgeId) return toEmployeeSummary(byBadgeId);

  // Excel raw badges often end with %NNNN — try extracted numeric badge.
  const percentMatch = raw.match(/%(\d+)\s*$/);
  if (percentMatch) {
    const byExtracted = await db.employee.findUnique({
      where: {
        site_id_badge_id: { site_id: siteId, badge_id: percentMatch[1] },
      },
    });
    if (byExtracted) return toEmployeeSummary(byExtracted);
  }

  const byRaw = await db.employee.findFirst({
    where: { site_id: siteId, raw_badge_data: raw },
  });
  return byRaw ? toEmployeeSummary(byRaw) : null;
}

function toEmployeeSummary(employee: {
  id: number;
  badge_id: string;
  raw_badge_data: string;
  name: string;
  job_title: string | null;
}): EmployeeSummary {
  return {
    id: employee.id,
    badge_id: employee.badge_id,
    raw_badge_data: employee.raw_badge_data,
    name: employee.name,
    job_title: employee.job_title,
  };
}

/** Normalize tool codes: accept `TL-001`, `tl-001`, or raw `001`. */
export function normalizeToolId(input: string): string {
  const raw = input.trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("TL-")) return raw;
  if (/^\d+$/.test(raw)) {
    return `TL-${raw.padStart(3, "0")}`;
  }
  return raw;
}

export function toolIdCandidates(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const upper = trimmed.toUpperCase();
  const normalized = normalizeToolId(trimmed);
  const candidates = new Set<string>([trimmed, upper, normalized]);
  if (!upper.startsWith("TL-") && /^\d+$/.test(upper)) {
    candidates.add(`TL-${upper}`);
    candidates.add(`TL-${upper.padStart(3, "0")}`);
  }
  return [...candidates];
}

export async function findToolByCode(
  toolInput: string,
  siteId: number,
  db: DbClient = prisma,
) {
  const candidates = toolIdCandidates(toolInput);
  if (candidates.length === 0) return null;

  for (const code of candidates) {
    const tool = await db.tool.findUnique({
      where: { site_id_tool_id: { site_id: siteId, tool_id: code } },
    });
    if (tool) return tool;
  }

  const tools = await db.tool.findMany({ where: { site_id: siteId } });
  const upperCandidates = new Set(candidates.map((c) => c.toUpperCase()));
  return tools.find((t) => upperCandidates.has(t.tool_id.toUpperCase())) ?? null;
}

export function parseItemId(input: string): {
  kind: ItemKind | null;
  code: string;
} {
  const code = input.trim().toUpperCase();
  if (code.startsWith("TL-")) return { kind: "tool", code };
  if (code.startsWith("MAT-")) return { kind: "material", code };
  if (/^\d+$/.test(code)) return { kind: "tool", code: normalizeToolId(code) };
  return { kind: null, code };
}

/** Normalize material codes: accept `MAT-001`, `mat-001`, or raw `001`. */
export function normalizeMaterialId(input: string): string {
  const raw = input.trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("MAT-")) return raw;
  if (/^\d+$/.test(raw)) {
    return `MAT-${raw.padStart(3, "0")}`;
  }
  return raw;
}

export function materialIdCandidates(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const upper = trimmed.toUpperCase();
  const normalized = normalizeMaterialId(trimmed);
  const candidates = new Set<string>([trimmed, upper, normalized]);
  if (!upper.startsWith("MAT-") && /^\d+$/.test(upper)) {
    candidates.add(`MAT-${upper}`);
    candidates.add(`MAT-${upper.padStart(3, "0")}`);
  }
  return [...candidates];
}

export async function findMaterialByCode(
  materialInput: string,
  siteId: number,
  db: DbClient = prisma,
) {
  const candidates = materialIdCandidates(materialInput);
  if (candidates.length === 0) return null;

  for (const code of candidates) {
    const material = await db.material.findUnique({
      where: { site_id_material_id: { site_id: siteId, material_id: code } },
    });
    if (material) return material;
  }

  const materials = await db.material.findMany({ where: { site_id: siteId } });
  const upperCandidates = new Set(candidates.map((c) => c.toUpperCase()));
  return (
    materials.find((m) => upperCandidates.has(m.material_id.toUpperCase())) ??
    null
  );
}

export async function findItemByPrefixedId(
  itemInput: string,
  siteId: number,
): Promise<ItemSummary | null> {
  const { kind, code } = parseItemId(itemInput);
  if (!kind || !code) return null;

  if (kind === "tool") {
    const tool = await findToolByCode(itemInput, siteId);
    return tool ? toToolSummary(tool) : null;
  }

  const material = await findMaterialByCode(itemInput, siteId);
  return material ? toMaterialSummary(material) : null;
}

export function toToolSummary(tool: {
  id: number;
  tool_id: string;
  name: string;
  category: string | null;
  location: string | null;
  status: string;
  condition: string | null;
  notes: string | null;
  last_checked_out_by: string | null;
  checkout_time: Date | null;
}): ToolSummary {
  return {
    kind: "tool",
    id: tool.id,
    tool_id: tool.tool_id,
    name: tool.name,
    category: tool.category,
    location: tool.location,
    status: tool.status,
    condition: tool.condition,
    notes: tool.notes,
    last_checked_out_by: tool.last_checked_out_by,
    checkout_time: tool.checkout_time?.toISOString() ?? null,
  };
}

/** Alias used by API routes for JSON payloads. */
export const toToolSummarySafe = toToolSummary;

export function toMaterialSummary(material: {
  id: number;
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
}): MaterialSummary {
  return {
    kind: "material",
    id: material.id,
    material_id: material.material_id,
    name: material.name,
    category: material.category,
    unit: material.unit,
    location: material.location,
    current_qty: material.current_qty,
    min_qty: material.min_qty,
    status: material.status,
    last_taken_by: material.last_taken_by,
    notes: material.notes,
  };
}

/** Alias used by API routes for JSON payloads. */
export const toMaterialSummarySafe = toMaterialSummary;

export function isToolAvailable(status: string): boolean {
  return status.trim().toLowerCase() === "available";
}

export function isToolCheckedOut(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === "checked out" || s === "checked_out" || s === "checkedout";
}

export function isToolMissing(status: string): boolean {
  return status.trim().toLowerCase() === "missing";
}

export async function nextToolTxnCode(db: DbClient = prisma): Promise<string> {
  const latest = await db.toolTransaction.findFirst({
    orderBy: { id: "desc" },
    select: { transaction_id: true },
  });
  let next = 1;
  if (latest?.transaction_id) {
    const match = latest.transaction_id.match(/(\d+)\s*$/);
    if (match) next = Number.parseInt(match[1], 10) + 1;
  }
  return `TXN-${String(next).padStart(4, "0")}`;
}

export async function nextMaterialTxnCode(
  db: DbClient = prisma,
): Promise<string> {
  const latest = await db.materialTransaction.findFirst({
    orderBy: { id: "desc" },
    select: { transaction_id: true },
  });
  let next = 1;
  if (latest?.transaction_id) {
    const match = latest.transaction_id.match(/(\d+)\s*$/);
    if (match) next = Number.parseInt(match[1], 10) + 1;
  }
  return `MTXN-${String(next).padStart(4, "0")}`;
}

/** Extract badge + tool identifiers from flexible JSON request bodies. */
export function parseScanToolBody(body: unknown): {
  badgeInput: string;
  toolInput: string;
  purpose: string | null;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return {
      badgeInput: "",
      toolInput: "",
      purpose: null,
      error: "Request body must be a JSON object",
    };
  }

  const data = body as Record<string, unknown>;
  const badgeRaw =
    data.badge ??
    data.badgeId ??
    data.badge_id ??
    data.raw ??
    data.raw_badge_data ??
    data.rawBadgeData ??
    "";
  const toolRaw =
    data.toolId ??
    data.tool_id ??
    data.toolNumber ??
    data.tool_number ??
    data.tool ??
    "";
  const purposeRaw = data.purpose ?? data.notes ?? data.qtyPurpose ?? null;

  const badgeInput =
    typeof badgeRaw === "string" || typeof badgeRaw === "number"
      ? String(badgeRaw).trim()
      : "";
  const toolInput =
    typeof toolRaw === "string" || typeof toolRaw === "number"
      ? String(toolRaw).trim()
      : "";
  const purpose =
    purposeRaw === null || purposeRaw === undefined
      ? null
      : String(purposeRaw).trim() || null;

  if (!badgeInput) {
    return {
      badgeInput,
      toolInput,
      purpose,
      error: "badge is required (badgeId, badge_id, raw, or badge)",
    };
  }
  if (!toolInput) {
    return {
      badgeInput,
      toolInput,
      purpose,
      error: "tool id is required (toolId, tool_id, or tool)",
    };
  }

  return { badgeInput, toolInput, purpose, error: null };
}

/** Extract badge + material + quantity from flexible JSON request bodies. */
export function parseScanMaterialTakeBody(body: unknown): {
  badgeInput: string;
  materialInput: string;
  quantity: number;
  error: string | null;
} {
  if (!body || typeof body !== "object") {
    return {
      badgeInput: "",
      materialInput: "",
      quantity: 0,
      error: "Request body must be a JSON object",
    };
  }

  const data = body as Record<string, unknown>;
  const badgeRaw =
    data.badge ??
    data.badgeId ??
    data.badge_id ??
    data.raw ??
    data.raw_badge_data ??
    data.rawBadgeData ??
    "";
  const materialRaw =
    data.materialId ??
    data.material_id ??
    data.materialNumber ??
    data.material_number ??
    data.material ??
    "";
  const quantityRaw = data.quantity ?? data.qty ?? data.qty_taken ?? null;

  const badgeInput =
    typeof badgeRaw === "string" || typeof badgeRaw === "number"
      ? String(badgeRaw).trim()
      : "";
  const materialInput =
    typeof materialRaw === "string" || typeof materialRaw === "number"
      ? String(materialRaw).trim()
      : "";

  let quantity = Number.NaN;
  if (typeof quantityRaw === "number") {
    quantity = quantityRaw;
  } else if (typeof quantityRaw === "string" && quantityRaw.trim()) {
    quantity = Number(quantityRaw.trim());
  }

  if (!badgeInput) {
    return {
      badgeInput,
      materialInput,
      quantity: 0,
      error: "badge is required (badgeId, badge_id, raw, or badge)",
    };
  }
  if (!materialInput) {
    return {
      badgeInput,
      materialInput,
      quantity: 0,
      error: "material id is required (materialId, material_id, or material)",
    };
  }
  if (!Number.isFinite(quantity)) {
    return {
      badgeInput,
      materialInput,
      quantity: 0,
      error: "quantity is required (quantity or qty)",
    };
  }
  if (quantity <= 0) {
    return {
      badgeInput,
      materialInput,
      quantity,
      error: "quantity must be greater than 0",
    };
  }

  return { badgeInput, materialInput, quantity, error: null };
}
