"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { primaryButtonClassName } from "@/components/form-fields";
import {
  DEFAULT_SITE_LABELS,
  type SiteLabels,
} from "@/lib/site-labels";

export type EmployeeRow = {
  id: number;
  badge_id: string;
  name: string;
  job_title: string | null;
  raw_badge_data: string;
  created_at: string;
};

const columns: DataTableColumn<EmployeeRow>[] = [
  {
    key: "badge_id",
    header: "Badge ID",
    sortValue: (r) => r.badge_id,
    render: (r) => <span className="font-medium">{r.badge_id}</span>,
  },
  {
    key: "name",
    header: "Name",
    sortValue: (r) => r.name,
    render: (r) => r.name,
  },
  {
    key: "job_title",
    header: "Job Title",
    sortValue: (r) => r.job_title,
    render: (r) => r.job_title ?? "—",
  },
  {
    key: "raw_badge_data",
    header: "Raw Badge Data",
    sortValue: (r) => r.raw_badge_data,
    render: (r) => (
      <span
        className="max-w-xs truncate font-mono text-xs"
        title={r.raw_badge_data}
      >
        {r.raw_badge_data}
      </span>
    ),
  },
  {
    key: "created_at",
    header: "Created",
    sortValue: (r) => r.created_at,
    render: (r) => new Date(r.created_at).toLocaleString(),
  },
];

export function EmployeesTable({
  rows,
  labels = DEFAULT_SITE_LABELS,
}: {
  rows: EmployeeRow[];
  labels?: SiteLabels;
}) {
  const addLabel = `Add ${labels.employeeSingular.toLowerCase()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {labels.employees}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            People who can check out {labels.tools.toLowerCase()} and take{" "}
            {labels.materials.toLowerCase()}.
          </p>
        </div>
        <Link href="/employees/new" className={primaryButtonClassName}>
          {addLabel}
        </Link>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        searchPlaceholder={`Search ${labels.employees.toLowerCase()}…`}
        emptyMessage={`No ${labels.employees.toLowerCase()} match your search.`}
        initialSortKey="name"
      />
    </div>
  );
}
