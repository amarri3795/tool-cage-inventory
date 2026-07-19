"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { primaryButtonClassName } from "@/components/form-fields";

export type MaterialRow = {
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
};

function statusClass(status: string, current: number, min: number) {
  if (current <= min || status.toLowerCase().includes("low") || status.toLowerCase().includes("out")) {
    return "text-[var(--warn)]";
  }
  return "text-[var(--accent)]";
}

const columns: DataTableColumn<MaterialRow>[] = [
  {
    key: "material_id",
    header: "Material ID",
    sortValue: (r) => r.material_id,
    render: (r) => <span className="font-medium">{r.material_id}</span>,
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
    key: "current_qty",
    header: "Qty",
    sortValue: (r) => r.current_qty,
    render: (r) => (
      <span className="tabular-nums">
        {r.current_qty}
        {r.unit ? ` ${r.unit}` : ""}
      </span>
    ),
  },
  {
    key: "min_qty",
    header: "Min",
    sortValue: (r) => r.min_qty,
    render: (r) => <span className="tabular-nums">{r.min_qty}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortValue: (r) => r.status,
    render: (r) => (
      <span className={statusClass(r.status, r.current_qty, r.min_qty)}>
        {r.status}
      </span>
    ),
  },
  {
    key: "last_taken_by",
    header: "Last Taken By",
    sortValue: (r) => r.last_taken_by,
    render: (r) => r.last_taken_by ?? "—",
  },
  {
    key: "actions",
    header: "Actions",
    sortable: false,
    render: (r) => (
      <Link
        href={`/materials/${r.id}/edit`}
        className="text-[var(--accent)] hover:underline"
      >
        Edit
      </Link>
    ),
  },
];

export function MaterialsTable({ rows }: { rows: MaterialRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      searchPlaceholder="Search materials…"
      emptyMessage="No materials match your search."
      initialSortKey="material_id"
      toolbar={
        <Link href="/materials/new" className={primaryButtonClassName}>
          Add material
        </Link>
      }
    />
  );
}
