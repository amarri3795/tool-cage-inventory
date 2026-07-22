"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";

export type TransactionRow = {
  key: string;
  kind: "tool" | "material";
  type: string;
  transaction_id: string;
  occurred_at: string;
  badge_id: string;
  employee_name: string | null;
  item_id: string;
  item_name: string | null;
  detail: string;
  qty: number | null;
};

type Tab = "all" | "tool" | "material";

const columns: DataTableColumn<TransactionRow>[] = [
  {
    key: "type",
    header: "Type",
    sortValue: (r) => r.type,
    render: (r) => r.type,
  },
  {
    key: "occurred_at",
    header: "When",
    sortValue: (r) => r.occurred_at,
    render: (r) => new Date(r.occurred_at).toLocaleString(),
  },
  {
    key: "transaction_id",
    header: "Txn ID",
    sortValue: (r) => r.transaction_id,
    render: (r) => (
      <span className="font-mono text-xs">{r.transaction_id}</span>
    ),
  },
  {
    key: "badge_id",
    header: "Badge",
    sortValue: (r) => r.badge_id,
    render: (r) => r.badge_id,
  },
  {
    key: "employee_name",
    header: "Employee",
    sortValue: (r) => r.employee_name,
    render: (r) => r.employee_name ?? "—",
  },
  {
    key: "item_id",
    header: "Item ID",
    sortValue: (r) => r.item_id,
    render: (r) => <span className="font-medium">{r.item_id}</span>,
  },
  {
    key: "item_name",
    header: "Item Name",
    sortValue: (r) => r.item_name,
    render: (r) => r.item_name ?? "—",
  },
  {
    key: "detail",
    header: "Detail",
    sortValue: (r) => r.detail,
    render: (r) => r.detail,
  },
  {
    key: "qty",
    header: "Qty",
    sortValue: (r) => r.qty,
    render: (r) =>
      r.qty == null ? "—" : <span className="tabular-nums">{r.qty}</span>,
  },
];

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm ${
    active
      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
      : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
  }`;

export function TransactionsTable({
  rows,
  toolLabel = "Tools",
  materialLabel = "Materials",
}: {
  rows: TransactionRow[];
  toolLabel?: string;
  materialLabel?: string;
}) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    if (tab === "tool") return rows.filter((r) => r.kind === "tool");
    if (tab === "material") return rows.filter((r) => r.kind === "material");
    return rows;
  }, [rows, tab]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <button type="button" className={tabClass(tab === "all")} onClick={() => setTab("all")}>
          All
        </button>
        <button type="button" className={tabClass(tab === "tool")} onClick={() => setTab("tool")}>
          {toolLabel}
        </button>
        <button
          type="button"
          className={tabClass(tab === "material")}
          onClick={() => setTab("material")}
        >
          {materialLabel}
        </button>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        getRowKey={(r) => r.key}
        searchPlaceholder="Search transactions…"
        emptyMessage="No transactions match your search."
        initialSortKey="occurred_at"
        initialSortDirection="desc"
      />
    </div>
  );
}
