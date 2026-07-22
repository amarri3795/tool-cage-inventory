"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { primaryButtonClassName } from "@/components/form-fields";
import {
  DEFAULT_SITE_LABELS,
  type SiteLabels,
} from "@/lib/site-labels";

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
  if (
    current <= min ||
    status.toLowerCase().includes("low") ||
    status.toLowerCase().includes("out")
  ) {
    return "text-[var(--warn)]";
  }
  return "text-[var(--accent)]";
}

function buildColumns(labels: SiteLabels): DataTableColumn<MaterialRow>[] {
  return [
    {
      key: "material_id",
      header: labels.materialId,
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
}

export function MaterialsTable({
  rows,
  labels = DEFAULT_SITE_LABELS,
}: {
  rows: MaterialRow[];
  labels?: SiteLabels;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {labels.materials}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage {labels.materials.toLowerCase()} for this site.
        </p>
      </div>
      <DataTable
        rows={rows}
        columns={buildColumns(labels)}
        getRowKey={(r) => r.id}
        searchPlaceholder={`Search ${labels.materials.toLowerCase()}…`}
        emptyMessage={`No ${labels.materials.toLowerCase()} match your search.`}
        initialSortKey="material_id"
        toolbar={
          <Link href="/materials/new" className={primaryButtonClassName}>
            Add {labels.materialSingular.toLowerCase()}
          </Link>
        }
      />
    </div>
  );
}
