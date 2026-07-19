"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table";

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
      <span className="max-w-xs truncate font-mono text-xs" title={r.raw_badge_data}>
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

export function EmployeesTable({ rows }: { rows: EmployeeRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      searchPlaceholder="Search employees…"
      emptyMessage="No employees match your search."
      initialSortKey="name"
    />
  );
}
