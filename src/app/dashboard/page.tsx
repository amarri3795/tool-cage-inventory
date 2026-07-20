import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getSitePaywallForSession,
  getSiteScope,
} from "@/lib/site-context";
import { isSiteAdminRole } from "@/lib/site-access";

export const dynamic = "force-dynamic";

/** Status strings from Tool Scanning.xlsm Tool Inventory / Dashboard. */
const AVAILABLE_STATUSES = ["Available", "available", "AVAILABLE"];
const CHECKED_OUT_STATUSES = ["Checked Out", "checked out", "CHECKED_OUT", "CheckedOut"];
const MISSING_STATUSES = ["Missing", "missing", "MISSING"];

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toLocaleString();
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "ok"
      ? "border-[var(--accent)]/30 bg-[var(--accent-soft)]"
      : tone === "warn"
        ? "border-[var(--warn)]/30 bg-[var(--warn-soft)]"
        : tone === "danger"
          ? "border-[var(--danger)]/30 bg-[var(--danger-soft)]"
          : "border-[var(--border)] bg-[var(--card)]";

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
        {message}
      </td>
    </tr>
  );
}

export default async function DashboardPage() {
  const { where, session } = await getSiteScope();
  const paywall = session ? await getSitePaywallForSession(session) : { blocked: false };

  const [
    totalTools,
    availableTools,
    checkedOutTools,
    missingTools,
    checkedOutRows,
    missingRows,
    materials,
  ] = await Promise.all([
    prisma.tool.count({ where }),
    prisma.tool.count({
      where: { ...where, status: { in: AVAILABLE_STATUSES } },
    }),
    prisma.tool.count({
      where: { ...where, status: { in: CHECKED_OUT_STATUSES } },
    }),
    prisma.tool.count({
      where: { ...where, status: { in: MISSING_STATUSES } },
    }),
    prisma.tool.findMany({
      where: { ...where, status: { in: CHECKED_OUT_STATUSES } },
      orderBy: [{ checkout_time: "desc" }, { tool_id: "asc" }],
    }),
    prisma.tool.findMany({
      where: { ...where, status: { in: MISSING_STATUSES } },
      orderBy: { tool_id: "asc" },
    }),
    prisma.material.findMany({
      where,
      orderBy: { material_id: "asc" },
    }),
  ]);

  // Low stock = Current Qty (current_qty) <= Min Qty (min_qty), matching Excel Dashboard.
  const lowStockRows = materials
    .filter((material) => material.current_qty <= material.min_qty)
    .sort(
      (a, b) =>
        b.min_qty - b.current_qty - (a.min_qty - a.current_qty) ||
        a.material_id.localeCompare(b.material_id),
    );
  const lowStockCount = lowStockRows.length;

  return (
    <div className="space-y-8">
      {paywall.blocked ? (
        <div className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--warn)]">Access limited</p>
          <p className="mt-1 text-[var(--foreground)]">
            {paywall.message ??
              "Subscription required. Scan and member features are paused until billing is resolved."}
          </p>
        </div>
      ) : null}

      {session && !isSiteAdminRole(session.role) && session.role !== "master_admin" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
          <p className="text-[var(--muted)]">
            Need to manage tools, materials, or employees?{" "}
            <Link
              href="/dashboard/admin-login"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Site admin login
            </Link>
          </p>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">OpsFlow — Site Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {session?.siteName
            ? `Live inventory summary for ${session.siteName}.`
            : "Live inventory summary for tools and materials."}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Tools" value={totalTools} />
        <StatCard label="Available" value={availableTools} tone="ok" />
        <StatCard label="Checked Out" value={checkedOutTools} tone="warn" />
        <StatCard label="Missing" value={missingTools} tone="danger" />
        <StatCard label="Low Stock Materials" value={lowStockCount} tone="warn" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tools Currently Checked Out</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Tool ID</th>
                <th className="px-3 py-2 font-medium">Tool Name</th>
                <th className="px-3 py-2 font-medium">Last Checked Out By</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Checkout Time</th>
              </tr>
            </thead>
            <tbody>
              {checkedOutRows.length === 0 ? (
                <EmptyRow colSpan={5} message="No tools are currently checked out." />
              ) : (
                checkedOutRows.map((tool) => (
                  <tr key={tool.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 font-medium">{tool.tool_id}</td>
                    <td className="px-3 py-2">{tool.name}</td>
                    <td className="px-3 py-2">{tool.last_checked_out_by ?? "—"}</td>
                    <td className="px-3 py-2">{tool.location ?? "—"}</td>
                    <td className="px-3 py-2">{formatDate(tool.checkout_time)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Missing Tools — Last Known User</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Tool ID</th>
                <th className="px-3 py-2 font-medium">Tool Name</th>
                <th className="px-3 py-2 font-medium">Last Known User</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {missingRows.length === 0 ? (
                <EmptyRow colSpan={5} message="No missing tools." />
              ) : (
                missingRows.map((tool) => (
                  <tr key={tool.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 font-medium">{tool.tool_id}</td>
                    <td className="px-3 py-2">{tool.name}</td>
                    <td className="px-3 py-2">{tool.last_checked_out_by ?? "—"}</td>
                    <td className="px-3 py-2">{tool.location ?? "—"}</td>
                    <td className="px-3 py-2 text-[var(--danger)]">{tool.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Low Stock Materials</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Material ID</th>
                <th className="px-3 py-2 font-medium">Material Name</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Current Qty</th>
                <th className="px-3 py-2 font-medium">Min Qty</th>
                <th className="px-3 py-2 font-medium">Reorder Need</th>
              </tr>
            </thead>
            <tbody>
              {lowStockRows.length === 0 ? (
                <EmptyRow colSpan={6} message="No materials are below reorder level." />
              ) : (
                lowStockRows.map((material) => {
                  const need = Math.max(0, material.min_qty - material.current_qty);
                  return (
                    <tr
                      key={material.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">{material.material_id}</td>
                      <td className="px-3 py-2">{material.name}</td>
                      <td className="px-3 py-2">{material.category ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {material.current_qty}
                        {material.unit ? ` ${material.unit}` : ""}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{material.min_qty}</td>
                      <td className="px-3 py-2 font-medium tabular-nums text-[var(--warn)]">
                        {need}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
