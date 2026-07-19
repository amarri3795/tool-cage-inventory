import { prisma } from "@/lib/prisma";
import { getAdminSettings } from "@/lib/settings";

export type HealthIssue = {
  id: string;
  label: string;
  detail?: string;
};

export type HealthCheckResult = {
  id: string;
  label: string;
  description: string;
  ok: boolean;
  count: number;
  issues: HealthIssue[];
};

export type SystemHealthReport = {
  checked_at: string;
  checks: HealthCheckResult[];
  summary: {
    total_checks: number;
    passing: number;
    failing: number;
    total_issues: number;
  };
};

function statusSet(allowed: string[]): Set<string> {
  return new Set(allowed.map((s) => s.trim().toLowerCase()));
}

export async function runSystemHealthChecks(): Promise<SystemHealthReport> {
  const settings = await getAdminSettings();
  const allowedStatuses = statusSet(settings.allowed_tool_statuses);

  const [tools, toolTxns, materials] = await Promise.all([
    prisma.tool.findMany({
      select: {
        id: true,
        tool_id: true,
        name: true,
        status: true,
        location: true,
        auto_status: true,
      },
    }),
    prisma.toolTransaction.findMany({
      select: {
        id: true,
        transaction_id: true,
        badge_id: true,
        tool_id: true,
        tool_name: true,
        action: true,
        occurred_at: true,
        purpose: true,
      },
    }),
    prisma.material.findMany({
      select: {
        id: true,
        material_id: true,
        name: true,
        current_qty: true,
        min_qty: true,
        status: true,
      },
    }),
  ]);

  // 1. Duplicate tool IDs (case-insensitive / trimmed collisions)
  const idBuckets = new Map<string, typeof tools>();
  for (const tool of tools) {
    const key = tool.tool_id.trim().toUpperCase();
    const bucket = idBuckets.get(key) ?? [];
    bucket.push(tool);
    idBuckets.set(key, bucket);
  }
  const duplicateIssues: HealthIssue[] = [];
  for (const [key, bucket] of idBuckets) {
    if (bucket.length > 1) {
      duplicateIssues.push({
        id: key,
        label: key,
        detail: `${bucket.length} rows share tool ID`,
      });
    }
  }

  // 2. Blank required tool fields
  const blankFieldIssues: HealthIssue[] = tools
    .filter(
      (t) =>
        !t.tool_id.trim() ||
        !t.name.trim() ||
        !t.status.trim(),
    )
    .map((t) => ({
      id: String(t.id),
      label: t.tool_id || `(row ${t.id})`,
      detail: [
        !t.tool_id.trim() && "tool_id",
        !t.name.trim() && "name",
        !t.status.trim() && "status",
      ]
        .filter(Boolean)
        .join(", "),
    }));

  // 3. Invalid statuses
  const invalidStatusIssues: HealthIssue[] = tools
    .filter((t) => {
      if (!t.status.trim()) return false;
      if (allowedStatuses.size === 0) return false;
      return !allowedStatuses.has(t.status.trim().toLowerCase());
    })
    .map((t) => ({
      id: t.tool_id,
      label: t.tool_id,
      detail: `status "${t.status}" not in allowed list`,
    }));

  // 4. Missing transaction fields
  const missingTxnIssues: HealthIssue[] = toolTxns
    .filter(
      (tx) =>
        !tx.badge_id.trim() ||
        !tx.tool_id.trim() ||
        !tx.action.trim() ||
        !tx.occurred_at ||
        (settings.require_purpose && !(tx.purpose ?? "").trim()),
    )
    .map((tx) => ({
      id: tx.transaction_id,
      label: tx.transaction_id,
      detail: [
        !tx.badge_id.trim() && "badge_id",
        !tx.tool_id.trim() && "tool_id",
        !tx.action.trim() && "action",
        !tx.occurred_at && "occurred_at",
        settings.require_purpose &&
          !(tx.purpose ?? "").trim() &&
          "purpose",
      ]
        .filter(Boolean)
        .join(", "),
    }));

  // 5. Tool name mismatches (txn name vs inventory name)
  const toolNameById = new Map(
    tools.map((t) => [t.tool_id.toUpperCase(), t.name.trim()]),
  );
  const mismatchIssues: HealthIssue[] = toolTxns
    .filter((tx) => {
      const expected = toolNameById.get(tx.tool_id.toUpperCase());
      if (!expected || !tx.tool_name?.trim()) return false;
      return tx.tool_name.trim().toLowerCase() !== expected.toLowerCase();
    })
    .map((tx) => ({
      id: tx.transaction_id,
      label: tx.transaction_id,
      detail: `txn "${tx.tool_name}" ≠ inventory "${toolNameById.get(tx.tool_id.toUpperCase())}"`,
    }));

  // 6. Low stock materials
  const lowStockIssues: HealthIssue[] = materials
    .filter((m) => m.current_qty <= m.min_qty)
    .map((m) => ({
      id: m.material_id,
      label: m.name,
      detail: `${m.current_qty} ≤ min ${m.min_qty}`,
    }));

  // 7. Missing tools
  const missingToolIssues: HealthIssue[] = tools
    .filter((t) => {
      const s = t.status.trim().toLowerCase();
      const auto = (t.auto_status ?? "").trim().toLowerCase();
      return s === "missing" || auto === "missing";
    })
    .map((t) => ({
      id: t.tool_id,
      label: t.name,
      detail: `status=${t.status}${t.auto_status ? `, auto=${t.auto_status}` : ""}`,
    }));

  const checks: HealthCheckResult[] = [
    {
      id: "duplicate_tool_ids",
      label: "Duplicate tool IDs",
      description: "Case-insensitive collisions on tool_id",
      ok: duplicateIssues.length === 0,
      count: duplicateIssues.length,
      issues: duplicateIssues.slice(0, 50),
    },
    {
      id: "blank_required_fields",
      label: "Blank required tool fields",
      description: "Tools missing tool_id, name, or status",
      ok: blankFieldIssues.length === 0,
      count: blankFieldIssues.length,
      issues: blankFieldIssues.slice(0, 50),
    },
    {
      id: "invalid_statuses",
      label: "Invalid statuses",
      description: "Tool status not in allowed_tool_statuses",
      ok: invalidStatusIssues.length === 0,
      count: invalidStatusIssues.length,
      issues: invalidStatusIssues.slice(0, 50),
    },
    {
      id: "missing_transaction_fields",
      label: "Missing transaction fields",
      description:
        "Tool transactions missing badge, tool, action, time, or purpose (when required)",
      ok: missingTxnIssues.length === 0,
      count: missingTxnIssues.length,
      issues: missingTxnIssues.slice(0, 50),
    },
    {
      id: "tool_name_mismatches",
      label: "Tool name mismatches",
      description: "Transaction tool_name differs from inventory name",
      ok: mismatchIssues.length === 0,
      count: mismatchIssues.length,
      issues: mismatchIssues.slice(0, 50),
    },
    {
      id: "low_stock_materials",
      label: "Low stock materials",
      description: "current_qty ≤ min_qty",
      ok: lowStockIssues.length === 0,
      count: lowStockIssues.length,
      issues: lowStockIssues.slice(0, 50),
    },
    {
      id: "missing_tools",
      label: "Missing tools",
      description: "Status or auto_status is Missing",
      ok: missingToolIssues.length === 0,
      count: missingToolIssues.length,
      issues: missingToolIssues.slice(0, 50),
    },
  ];

  const failing = checks.filter((c) => !c.ok).length;
  const total_issues = checks.reduce((sum, c) => sum + c.count, 0);

  return {
    checked_at: new Date().toISOString(),
    checks,
    summary: {
      total_checks: checks.length,
      passing: checks.length - failing,
      failing,
      total_issues,
    },
  };
}
