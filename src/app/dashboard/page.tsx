import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getSitePaywallForSession,
  getSiteScope,
} from "@/lib/site-context";
import { isSiteAdminRole } from "@/lib/site-access";
import { getSiteLabels } from "@/lib/site-labels";
import {
  dashboardFeaturesForPreset,
  getSitePreset,
} from "@/lib/site-presets";

export const dynamic = "force-dynamic";

const AVAILABLE_STATUSES = ["Available", "available", "AVAILABLE"];
const CHECKED_OUT_STATUSES = [
  "Checked Out",
  "checked out",
  "CHECKED_OUT",
  "CheckedOut",
];
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
  value: number | string;
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
      <td
        colSpan={colSpan}
        className="px-3 py-6 text-center text-sm text-[var(--muted)]"
      >
        {message}
      </td>
    </tr>
  );
}

export default async function DashboardPage() {
  const { where, session, siteId } = await getSiteScope();
  const paywall = session
    ? await getSitePaywallForSession(session)
    : { blocked: false };
  const labels = await getSiteLabels(siteId);
  const preset = await getSitePreset(siteId);
  const features = dashboardFeaturesForPreset(preset);

  const [
    totalTools,
    availableTools,
    checkedOutTools,
    missingTools,
    checkedOutRows,
    missingRows,
    materials,
    recentTakes,
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
    features.showCheckedOutSection
      ? prisma.tool.findMany({
          where: { ...where, status: { in: CHECKED_OUT_STATUSES } },
          orderBy: [{ checkout_time: "desc" }, { tool_id: "asc" }],
        })
      : Promise.resolve([]),
    features.showMissingSection
      ? prisma.tool.findMany({
          where: { ...where, status: { in: MISSING_STATUSES } },
          orderBy: { tool_id: "asc" },
        })
      : Promise.resolve([]),
    prisma.material.findMany({
      where,
      orderBy: { material_id: "asc" },
    }),
    features.showRecentTakes
      ? prisma.materialTransaction.findMany({
          where,
          orderBy: { occurred_at: "desc" },
          take: 15,
        })
      : Promise.resolve([]),
  ]);

  const lowStockRows = materials
    .filter((material) => material.current_qty <= material.min_qty)
    .sort(
      (a, b) =>
        b.min_qty - b.current_qty - (a.min_qty - a.current_qty) ||
        a.material_id.localeCompare(b.material_id),
    );
  const lowStockCount = lowStockRows.length;
  const unitsOnHand = materials.reduce((sum, m) => sum + m.current_qty, 0);

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

      {session &&
      !isSiteAdminRole(session.role) &&
      session.role !== "master_admin" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
          <p className="text-[var(--muted)]">
            Need to manage {labels.tools.toLowerCase()},{" "}
            {labels.materials.toLowerCase()}, or{" "}
            {labels.employees.toLowerCase()}?{" "}
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
        <h1 className="text-2xl font-semibold tracking-tight">
          OpsFlow — {labels.dashboard}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {session?.siteName
            ? labels.dashboardSubtitle.replace(/your site/i, session.siteName)
            : labels.dashboardSubtitle}
        </p>
      </div>

      {features.showCheckoutStats || features.showOnHandStats ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {features.showCheckoutStats ? (
            <>
              <StatCard label={`Total ${labels.tools}`} value={totalTools} />
              <StatCard label="Available" value={availableTools} tone="ok" />
              <StatCard
                label="Checked Out"
                value={checkedOutTools}
                tone="warn"
              />
              <StatCard label="Missing" value={missingTools} tone="danger" />
            </>
          ) : null}
          {features.showOnHandStats ? (
            <>
              <StatCard
                label={`${labels.materials} SKUs`}
                value={materials.length}
              />
              <StatCard
                label="Units on hand"
                value={Math.round(unitsOnHand * 100) / 100}
                tone="ok"
              />
            </>
          ) : null}
          {features.showLowStock ? (
            <StatCard
              label={`Low Stock ${labels.materials}`}
              value={lowStockCount}
              tone="warn"
            />
          ) : null}
        </section>
      ) : null}

      {features.showCheckedOutSection ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {labels.tools} Currently Checked Out
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">{labels.toolId}</th>
                  <th className="px-3 py-2 font-medium">
                    {labels.toolSingular} Name
                  </th>
                  <th className="px-3 py-2 font-medium">Last Checked Out By</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Checkout Time</th>
                </tr>
              </thead>
              <tbody>
                {checkedOutRows.length === 0 ? (
                  <EmptyRow
                    colSpan={5}
                    message={`No ${labels.tools.toLowerCase()} are currently checked out.`}
                  />
                ) : (
                  checkedOutRows.map((tool) => (
                    <tr
                      key={tool.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">{tool.tool_id}</td>
                      <td className="px-3 py-2">{tool.name}</td>
                      <td className="px-3 py-2">
                        {tool.last_checked_out_by ?? "—"}
                      </td>
                      <td className="px-3 py-2">{tool.location ?? "—"}</td>
                      <td className="px-3 py-2">
                        {formatDate(tool.checkout_time)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {features.showMissingSection ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Missing {labels.tools} — Last Known User
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">{labels.toolId}</th>
                  <th className="px-3 py-2 font-medium">
                    {labels.toolSingular} Name
                  </th>
                  <th className="px-3 py-2 font-medium">Last Known User</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {missingRows.length === 0 ? (
                  <EmptyRow
                    colSpan={5}
                    message={`No missing ${labels.tools.toLowerCase()}.`}
                  />
                ) : (
                  missingRows.map((tool) => (
                    <tr
                      key={tool.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">{tool.tool_id}</td>
                      <td className="px-3 py-2">{tool.name}</td>
                      <td className="px-3 py-2">
                        {tool.last_checked_out_by ?? "—"}
                      </td>
                      <td className="px-3 py-2">{tool.location ?? "—"}</td>
                      <td className="px-3 py-2 text-[var(--danger)]">
                        {tool.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {features.showStockTable ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {labels.materials} on hand
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">{labels.materialId}</th>
                  <th className="px-3 py-2 font-medium">
                    {labels.materialSingular} Name
                  </th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Current Qty</th>
                  <th className="px-3 py-2 font-medium">Min Qty</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <EmptyRow
                    colSpan={6}
                    message={`No ${labels.materials.toLowerCase()} yet.`}
                  />
                ) : (
                  materials.map((material) => {
                    const low = material.current_qty <= material.min_qty;
                    return (
                      <tr
                        key={material.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-3 py-2 font-medium">
                          {material.material_id}
                        </td>
                        <td className="px-3 py-2">{material.name}</td>
                        <td className="px-3 py-2">
                          {material.location ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {material.current_qty}
                          {material.unit ? ` ${material.unit}` : ""}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {material.min_qty}
                        </td>
                        <td
                          className={`px-3 py-2 ${low ? "text-[var(--warn)]" : ""}`}
                        >
                          {low ? "Low stock" : material.status}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {features.showLowStock && !features.showStockTable ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Low Stock {labels.materials}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">{labels.materialId}</th>
                  <th className="px-3 py-2 font-medium">
                    {labels.materialSingular} Name
                  </th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Current Qty</th>
                  <th className="px-3 py-2 font-medium">Min Qty</th>
                  <th className="px-3 py-2 font-medium">Reorder Need</th>
                </tr>
              </thead>
              <tbody>
                {lowStockRows.length === 0 ? (
                  <EmptyRow
                    colSpan={6}
                    message={`No ${labels.materials.toLowerCase()} are below reorder level.`}
                  />
                ) : (
                  lowStockRows.map((material) => {
                    const need = Math.max(
                      0,
                      material.min_qty - material.current_qty,
                    );
                    return (
                      <tr
                        key={material.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-3 py-2 font-medium">
                          {material.material_id}
                        </td>
                        <td className="px-3 py-2">{material.name}</td>
                        <td className="px-3 py-2">
                          {material.category ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {material.current_qty}
                          {material.unit ? ` ${material.unit}` : ""}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {material.min_qty}
                        </td>
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
      ) : null}

      {features.showRecentTakes ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent stock moves</h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">{labels.materialId}</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {recentTakes.length === 0 ? (
                  <EmptyRow colSpan={5} message="No recent stock moves." />
                ) : (
                  recentTakes.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-3 py-2">
                        {formatDate(txn.occurred_at)}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {txn.material_id}
                      </td>
                      <td className="px-3 py-2">
                        {txn.material_name ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {txn.qty_taken}
                        {txn.unit ? ` ${txn.unit}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        {txn.employee_name ?? txn.badge_id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
