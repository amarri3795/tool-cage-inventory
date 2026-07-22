"use client";

import { useCallback, useEffect, useState } from "react";
import { inputClassName, primaryButtonClassName } from "@/components/form-fields";

type SiteRow = {
  id: number;
  name: string;
  contact_email: string;
  is_disabled: boolean;
  paywall_enabled: boolean;
  paywall_price: number;
  billing_cycle: string;
  free_trial_days: number;
  free_trial_preset: string | null;
  paywall_paid: boolean;
  metrics: {
    employees: number;
    tools: number;
    materials: number;
    tool_transactions: number;
    material_transactions: number;
    usageTotal: number;
    storageEstimateBytes: number;
  };
};

const TRIAL_PRESETS = [
  { label: "None", value: "" },
  { label: "7 days", value: "7" },
  { label: "14 days", value: "14" },
  { label: "30 days", value: "30" },
];

export function MasterSitesTools() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/master/sites");
    const data = (await res.json()) as {
      success?: boolean;
      sites?: SiteRow[];
      error?: string;
    };
    if (!res.ok || !data.success) {
      setError(data.error ?? "Failed to load sites");
      return;
    }
    setSites(data.sites ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }

  async function patchSite(siteId: number, patch: Record<string, unknown>) {
    setBusyId(siteId);
    try {
      const res = await fetch(`/api/master/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        showToast(data.error ?? "Update failed");
        return;
      }
      await load();
      showToast("Site updated");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSite(site: SiteRow) {
    const ok = window.confirm(
      `Delete site "${site.name}" and ALL inventory data? This cannot be undone.`,
    );
    if (!ok) return;
    setBusyId(site.id);
    try {
      const res = await fetch(`/api/master/sites/${site.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        showToast(data.error ?? "Delete failed");
        return;
      }
      showToast("Site deleted");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function resetPasswords(site: SiteRow) {
    const resetSitePassword = window.prompt(
      `New site (member) password for ${site.name} — leave blank to skip:`,
    );
    const resetSiteAdminPassword = window.prompt(
      `New site admin password for ${site.name} — leave blank to skip:`,
    );
    if (!resetSitePassword && !resetSiteAdminPassword) return;
    setBusyId(site.id);
    try {
      const res = await fetch(
        `/api/master/sites/${site.id}/reset-passwords`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetSitePassword, resetSiteAdminPassword }),
        },
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        showToast(data.error ?? "Reset failed");
        return;
      }
      showToast("Passwords updated");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Master Admin Tools
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage all plants: usage, paywall, access, and deletion.
        </p>
      </div>

      {toast ? (
        <p className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-sm">
          {toast}
        </p>
      ) : null}
      {error ? <p className="auth-error">{error}</p> : null}

      <div className="space-y-4">
        {sites.map((site) => (
          <article
            key={site.id}
            className="glass-panel p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{site.name}</h2>
                <p className="text-sm text-[var(--muted)]">{site.contact_email}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Usage: {site.metrics.usageTotal} rows (~
                  {Math.round(site.metrics.storageEstimateBytes / 1024)} KB est.) ·
                  emp {site.metrics.employees} · tools {site.metrics.tools} · mat{" "}
                  {site.metrics.materials} · tx{" "}
                  {site.metrics.tool_transactions + site.metrics.material_transactions}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === site.id}
                  className={primaryButtonClassName}
                  onClick={() => resetPasswords(site)}
                >
                  Reset passwords
                </button>
                <button
                  type="button"
                  disabled={busyId === site.id}
                  className="rounded-md border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  onClick={() => void deleteSite(site)}
                >
                  Delete site
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={site.is_disabled}
                  onChange={(e) =>
                    void patchSite(site.id, { is_disabled: e.target.checked })
                  }
                />
                Site disabled (block login)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={site.paywall_enabled}
                  onChange={(e) =>
                    void patchSite(site.id, { paywall_enabled: e.target.checked })
                  }
                />
                Paywall enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={site.paywall_paid}
                  onChange={(e) =>
                    void patchSite(site.id, { paywall_paid: e.target.checked })
                  }
                />
                Mark as paid
              </label>
              <label className="text-sm">
                Price
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={`${inputClassName} mt-1`}
                  defaultValue={site.paywall_price}
                  onBlur={(e) =>
                    void patchSite(site.id, {
                      paywall_price: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Billing cycle
                <select
                  className={`${inputClassName} mt-1`}
                  value={site.billing_cycle}
                  onChange={(e) =>
                    void patchSite(site.id, { billing_cycle: e.target.value })
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
              <label className="text-sm">
                Free trial (days)
                <input
                  type="number"
                  min={0}
                  className={`${inputClassName} mt-1`}
                  defaultValue={site.free_trial_days}
                  onBlur={(e) =>
                    void patchSite(site.id, {
                      free_trial_days: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Trial preset
                <select
                  className={`${inputClassName} mt-1`}
                  value={site.free_trial_preset ?? ""}
                  onChange={(e) => {
                    const preset = e.target.value;
                    const days = preset ? Number(preset) : site.free_trial_days;
                    void patchSite(site.id, {
                      free_trial_preset: preset || null,
                      free_trial_days: preset ? days : site.free_trial_days,
                    });
                  }}
                >
                  {TRIAL_PRESETS.map((p) => (
                    <option key={p.label} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
        {sites.length === 0 && !error ? (
          <p className="text-sm text-[var(--muted)]">No sites registered yet.</p>
        ) : null}
      </div>
    </div>
  );
}
