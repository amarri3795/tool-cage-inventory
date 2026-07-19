"use client";

import { useMemo, useState, type ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  /** Value used for sorting; defaults to stringified render text if omitted. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Extra text included in search; render output is always searchable as text. */
  searchValue?: (row: T) => string;
  render: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string | number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  initialSortKey?: string;
  initialSortDirection?: SortDirection;
  toolbar?: ReactNode;
};

function cellText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(cellText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return cellText(props?.children);
  }
  return "";
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: SortDirection,
): number {
  const emptyA = a == null || a === "";
  const emptyB = b == null || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  let result: number;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }
  return direction === "asc" ? result : -result;
}

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  searchPlaceholder = "Search…",
  emptyMessage = "No rows found.",
  initialSortKey,
  initialSortDirection = "asc",
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialSortDirection);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = rows;

    if (q) {
      next = rows.filter((row) => {
        return columns.some((col) => {
          const fromSearch = col.searchValue?.(row) ?? "";
          const fromRender = cellText(col.render(row));
          return `${fromSearch} ${fromRender}`.toLowerCase().includes(q);
        });
      });
    }

    if (!sortKey) return next;

    const column = columns.find((col) => col.key === sortKey);
    if (!column) return next;

    return [...next].sort((a, b) => {
      const aVal = column.sortValue
        ? column.sortValue(a)
        : cellText(column.render(a));
      const bVal = column.sortValue
        ? column.sortValue(b)
        : cellText(column.render(b));
      return compareValues(aVal, bVal, sortDirection);
    });
  }, [rows, columns, query, sortKey, sortDirection]);

  function onHeaderClick(column: DataTableColumn<T>) {
    if (column.sortable === false) return;
    if (sortKey === column.key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setSortDirection("asc");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full max-w-sm rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        {toolbar}
        <p className="ml-auto text-sm text-[var(--muted)]">
          {filteredSorted.length} of {rows.length}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable !== false;
                const active = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    className={`px-3 py-2 font-medium ${column.className ?? ""}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onHeaderClick(column)}
                        className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
                      >
                        {column.header}
                        <span className="text-xs tabular-nums" aria-hidden>
                          {active ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-sm text-[var(--muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2 ${column.className ?? ""}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
