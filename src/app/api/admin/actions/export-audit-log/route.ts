import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export audit log as CSV (default) or JSON (?format=json). */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  const logs = await prisma.auditLog.findMany({
    orderBy: { occurred_at: "desc" },
  });

  if (format === "json") {
    return NextResponse.json({
      success: true,
      count: logs.length,
      exported_by: auth.badgeId,
      logs,
    });
  }

  const header = [
    "audit_id",
    "occurred_at",
    "changed_by",
    "tool_id",
    "change_type",
    "notes",
  ];
  const lines = [
    header.join(","),
    ...logs.map((row) =>
      [
        row.audit_id,
        row.occurred_at.toISOString(),
        row.changed_by ?? "",
        row.tool_id ?? "",
        row.change_type ?? "",
        row.notes ?? "",
      ]
        .map((c) => csvEscape(String(c)))
        .join(","),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${stamp}.csv"`,
      "X-Exported-By": auth.badgeId,
    },
  });
}
