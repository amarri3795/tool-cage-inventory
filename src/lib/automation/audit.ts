import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type AuditEntityType =
  | "tool"
  | "material"
  | "setting"
  | "system"
  | "automation";

export type WriteAuditLogInput = {
  /** Logical entity kind (stored in notes when not a tool). */
  entityType?: AuditEntityType;
  /** Primary entity id (tool_id, material_id, setting key, etc.). */
  entityId?: string | null;
  /** Maps to AuditLog.change_type */
  action: string;
  /** Maps to AuditLog.notes (extra context appended). */
  details?: string | null;
  /** Maps to AuditLog.changed_by */
  user?: string | null;
  /** Explicit tool_id override; defaults to entityId when entityType is tool. */
  toolId?: string | null;
  occurredAt?: Date;
};

export async function nextAuditId(db: DbClient = prisma): Promise<string> {
  const latest = await db.auditLog.findFirst({
    orderBy: { id: "desc" },
    select: { audit_id: true },
  });
  let next = 1;
  if (latest?.audit_id) {
    const match = latest.audit_id.match(/(\d+)\s*$/);
    if (match) next = Number.parseInt(match[1], 10) + 1;
  }
  return `AUD-${String(next).padStart(3, "0")}`;
}

/**
 * Consistent audit_log writer.
 * Schema fields: changed_by, tool_id, change_type, notes.
 * entityType / entityId are encoded into notes for non-tool entities.
 */
export async function writeAuditLog(
  input: WriteAuditLogInput,
  db: DbClient = prisma,
) {
  const occurredAt = input.occurredAt ?? new Date();
  const entityType = input.entityType ?? "system";
  const entityId = input.entityId?.trim() || null;

  const toolId =
    input.toolId !== undefined
      ? input.toolId
      : entityType === "tool"
        ? entityId
        : null;

  const noteParts: string[] = [];
  if (entityType !== "tool" || !toolId) {
    noteParts.push(`[${entityType}${entityId ? `:${entityId}` : ""}]`);
  }
  if (input.details?.trim()) {
    noteParts.push(input.details.trim());
  }

  const audit_id = await nextAuditId(db);

  return db.auditLog.create({
    data: {
      audit_id,
      occurred_at: occurredAt,
      changed_by: input.user?.trim() || "System",
      tool_id: toolId,
      change_type: input.action,
      notes: noteParts.length > 0 ? noteParts.join(" ") : null,
    },
  });
}

export async function writeUpdateLog(
  description: string,
  updatedBy: string | null = "System",
  db: DbClient = prisma,
) {
  const latest = await db.updateLog.findFirst({
    orderBy: { update_number: "desc" },
    select: { update_number: true },
  });
  const update_number = (latest?.update_number ?? 0) + 1;

  return db.updateLog.create({
    data: {
      update_number,
      event_date: new Date(),
      description,
      updated_by: updatedBy,
    },
  });
}
