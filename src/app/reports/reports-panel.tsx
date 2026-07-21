"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InventoryReportSummary } from "@/lib/automation/generateInventoryReports";

export type ReportListItem = {
  id: number;
  type: string;
  period_start: string;
  period_end: string;
  created_at: string;
  summary: InventoryReportSummary;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function typeLabel(type: string) {
  if (type === "weekly_inventory") return "Weekly";
  if (type === "daily_inventory") return "Daily";
  return type;
}

export function ReportsPanel({
  siteId,
  rows,
}: {
  siteId: number;
  rows: ReportListItem[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(
    rows[0]?.id ?? null,
  );
  const [busy, setBusy] = useState<"daily" | "weekly" | "both" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(kind: "daily" | "weekly" | "both") {
    setBusy(kind);
    setMessage(null);
    setError(null);
    try {
      const type =
        kind === "both" ? "all" : kind === "weekly" ? "weekly" : "daily";
      const res = await fetch("/api/automation/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: "SiteAdmin",
          siteId,
          type,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        generated?: number;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Report generation failed");
      }
      setMessage(data.message ?? `Generated ${data.generated ?? 0} report(s).`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Daily and weekly inventory digests for this site. Email delivery is
            simulated (logged) until real SMTP is wired.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => generate("daily")}
            className="rounded-md border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1.5 text-sm text-[var(--accent)] hover:border-[var(--accent)] disabled:opacity-50"
          >
            {busy === "daily" ? "Generating…" : "Generate daily"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => generate("weekly")}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-50"
          >
            {busy === "weekly" ? "Generating…" : "Generate weekly"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => generate("both")}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
          >
            {busy === "both" ? "Generating…" : "Both"}
          </button>
        </div>
      </div>

      {message ? (
        <p className="text-sm text-[var(--accent)]">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No reports yet. Generate a daily digest to get started.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--card)]">
          {rows.map((row) => {
            const open = expandedId === row.id;
            const s = row.summary;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--accent-soft)]"
                  onClick={() => setExpandedId(open ? null : row.id)}
                  aria-expanded={open}
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      {typeLabel(row.type)} inventory
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                      {formatWhen(row.period_start)} →{" "}
                      {formatWhen(row.period_end)} · created{" "}
                      {formatWhen(row.created_at)}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--accent)]">
                    {open ? "Hide" : "Details"}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-[var(--border)] bg-[#12151c] px-4 py-4 text-sm">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                          Tools
                        </div>
                        <p className="mt-1 text-[var(--foreground)]">
                          {s.tools.total} total · {s.tools.available} available ·{" "}
                          {s.tools.checkedOut} checked out · {s.tools.missing}{" "}
                          missing
                          {s.tools.other > 0 ? ` · ${s.tools.other} other` : ""}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                          Materials
                        </div>
                        <p className="mt-1 text-[var(--foreground)]">
                          {s.materials.total} total · {s.materials.lowStock} low
                          stock
                        </p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                          Transactions in period
                        </div>
                        <p className="mt-1 text-[var(--foreground)]">
                          {s.transactions.toolCount} tool ·{" "}
                          {s.transactions.materialCount} material
                        </p>
                      </div>
                    </div>
                    {s.emailSimulatedTo ? (
                      <p className="text-xs text-[var(--muted)]">
                        Simulated email to {s.emailSimulatedTo}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
