"use client";

import type { SystemHealthReport } from "@/lib/admin-health";

type Props = {
  health: SystemHealthReport | null;
  busy: boolean;
  onRefresh: () => void;
};

export function SystemHealthSection({ health, busy, onRefresh }: Props) {
  return (
    <section id="system-health" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">System Health</h2>
          <p className="text-sm text-[var(--muted)]">
            Live integrity checks against tools, transactions, and materials.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onRefresh}
          className="glass-panel px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-50"
        >
          {busy ? "Checking…" : "Run health checks"}
        </button>
      </div>

      {health ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-panel px-4 py-3">
              <p className="text-xs text-[var(--muted)]">Passing</p>
              <p className="text-2xl font-semibold tabular-nums text-[var(--accent)]">
                {health.summary.passing}/{health.summary.total_checks}
              </p>
            </div>
            <div className="glass-panel px-4 py-3">
              <p className="text-xs text-[var(--muted)]">Failing</p>
              <p className="text-2xl font-semibold tabular-nums text-[var(--danger)]">
                {health.summary.failing}
              </p>
            </div>
            <div className="glass-panel px-4 py-3">
              <p className="text-xs text-[var(--muted)]">Total issues</p>
              <p className="text-2xl font-semibold tabular-nums">
                {health.summary.total_issues}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {health.checks.map((check) => (
              <article
                key={check.id}
                className={`rounded-xl border p-4 ${
                  check.ok
                    ? "border-[var(--accent)]/25 bg-[var(--accent-soft)]/40"
                    : "border-[var(--danger)]/25 bg-[var(--danger-soft)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{check.label}</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {check.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      check.ok
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--danger)] text-white"
                    }`}
                  >
                    {check.ok ? "OK" : check.count}
                  </span>
                </div>
                {!check.ok && check.issues.length > 0 ? (
                  <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto text-xs">
                    {check.issues.slice(0, 8).map((issue) => (
                      <li key={`${check.id}-${issue.id}`} className="truncate">
                        <span className="font-medium">{issue.label}</span>
                        {issue.detail ? (
                          <span className="text-[var(--muted)]">
                            {" "}
                            — {issue.detail}
                          </span>
                        ) : null}
                      </li>
                    ))}
                    {check.count > 8 ? (
                      <li className="text-[var(--muted)]">
                        +{check.count - 8} more
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Last checked {new Date(health.checked_at).toLocaleString()}
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--muted)]">
          Run health checks to see live inventory integrity results.
        </div>
      )}
    </section>
  );
}
