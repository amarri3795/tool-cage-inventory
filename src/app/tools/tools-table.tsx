"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { primaryButtonClassName } from "@/components/form-fields";

export type ToolRow = {
  id: number;
  tool_id: string;
  name: string;
  category: string | null;
  location: string | null;
  status: string;
  condition: string | null;
  last_checked_out_by: string | null;
  checkout_time: string | null;
};

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("available")) return "text-[var(--accent)]";
  if (s.includes("missing")) return "text-[var(--danger)]";
  if (s.includes("checked")) return "text-[var(--warn)]";
  return "";
}

const columns: DataTableColumn<ToolRow>[] = [
  {
    key: "tool_id",
    header: "Tool ID",
    sortValue: (r) => r.tool_id,
    render: (r) => <span className="font-medium">{r.tool_id}</span>,
  },
  {
    key: "name",
    header: "Name",
    sortValue: (r) => r.name,
    render: (r) => r.name,
  },
  {
    key: "category",
    header: "Category",
    sortValue: (r) => r.category,
    render: (r) => r.category ?? "—",
  },
  {
    key: "location",
    header: "Location",
    sortValue: (r) => r.location,
    render: (r) => r.location ?? "—",
  },
  {
    key: "status",
    header: "Status",
    sortValue: (r) => r.status,
    render: (r) => (
      <span className={statusClass(r.status)}>{r.status}</span>
    ),
  },
  {
    key: "condition",
    header: "Condition",
    sortValue: (r) => r.condition,
    render: (r) => r.condition ?? "—",
  },
  {
    key: "last_checked_out_by",
    header: "Last Out By",
    sortValue: (r) => r.last_checked_out_by,
    render: (r) => r.last_checked_out_by ?? "—",
  },
  {
    key: "checkout_time",
    header: "Checkout Time",
    sortValue: (r) => r.checkout_time,
    render: (r) =>
      r.checkout_time ? new Date(r.checkout_time).toLocaleString() : "—",
  },
  {
    key: "actions",
    header: "Actions",
    sortable: false,
    render: (r) => (
      <Link
        href={`/tools/${r.id}/edit`}
        className="text-[var(--accent)] hover:underline"
      >
        Edit
      </Link>
    ),
  },
];

export function ToolsTable({ rows }: { rows: ToolRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      searchPlaceholder="Search tools…"
      emptyMessage="No tools match your search."
      initialSortKey="tool_id"
      toolbar={
        <Link href="/tools/new" className={primaryButtonClassName}>
          Add tool
        </Link>
      }
    />
  );
}
