"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AccessControlSection } from "@/components/admin/AccessControlSection";
import { AdminActionsSection } from "@/components/admin/AdminActionsSection";
import { AlertsSection } from "@/components/admin/AlertsSection";
import {
  adminFetch,
  type ActionResponse,
  type HealthResponse,
  type SettingsResponse,
} from "@/components/admin/admin-api";
import { SystemHealthSection } from "@/components/admin/SystemHealthSection";
import { SystemSettingsSection } from "@/components/admin/SystemSettingsSection";
import type { SystemHealthReport } from "@/lib/admin-health";
import type { AdminSettings } from "@/lib/settings";

const NAV = [
  { id: "system-settings", label: "System Settings" },
  { id: "access-control", label: "Access Control" },
  { id: "alerts", label: "Alerts" },
  { id: "system-health", label: "System Health" },
  { id: "admin-actions", label: "Admin Actions" },
] as const;

export function AdminControlCenter() {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const loadSettings = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    try {
      const res = await adminFetch("/api/admin/settings");
      const data = (await res.json()) as SettingsResponse;
      if (!res.ok || !data.success) {
        if (res.status === 401 || res.status === 403) {
          await signOut();
          return;
        }
        setLoadError(data.error ?? "Failed to load settings");
        return;
      }
      setSettings(data.settings);
    } catch {
      setLoadError("Network error loading settings");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/health");
      const data = (await res.json()) as HealthResponse;
      if (!res.ok || !data.success) {
        showToast(data.error ?? "Health check failed");
        return;
      }
      setHealth(data.health);
    } catch {
      showToast("Network error running health checks");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadHealth();
  }, [loadSettings, loadHealth]);

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as SettingsResponse;
      if (!res.ok || !data.success) {
        showToast(data.error ?? "Save failed");
        return;
      }
      setSettings(data.settings);
      showToast("Settings saved");
    } catch {
      showToast("Network error saving settings");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(
    path: string,
    method: "POST" | "GET" = "POST",
  ): Promise<ActionResponse | null> {
    setBusy(true);
    try {
      const res = await adminFetch(path, { method });
      if (path.includes("export-audit-log") && method === "GET") {
        if (!res.ok) {
          const data = (await res.json()) as ActionResponse;
          showToast(data.error ?? "Export failed");
          return null;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        const msg = "Audit log CSV downloaded";
        setActionMessage(msg);
        showToast(msg);
        return { success: true, message: msg };
      }

      const data = (await res.json()) as ActionResponse;
      if (!res.ok || !data.success) {
        showToast(data.error ?? "Action failed");
        return null;
      }
      const msg = data.message ?? "Action completed";
      setActionMessage(msg);
      showToast(msg);
      return data;
    } catch {
      showToast("Network error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-6">
        <p className="font-medium text-[var(--danger)]">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="mt-3 text-sm underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="py-16 text-center text-sm text-[var(--muted)]">
        Loading control center…
      </div>
    );
  }

  return (
    <div className="relative lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm shadow-lg">
          {toast}
        </div>
      ) : null}

      <aside className="mb-6 lg:sticky lg:top-4 lg:mb-0 lg:self-start">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Control Center
          </p>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">
            Master admin
          </p>
          <nav className="mt-4 space-y-1">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 w-full rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--background)]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="space-y-12 pb-16">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            OpsFlow — Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Configure cage settings, access, alerts, and run operational checks —
            backed by the database, not Excel.
          </p>
          <Link
            href="/admin/sites"
            className="mt-3 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Open Master Admin Tools →
          </Link>
        </header>

        <SystemSettingsSection
          settings={settings}
          busy={busy}
          onChange={(patch) => setSettings({ ...settings, ...patch })}
          onSave={() => void saveSettings()}
        />

        <AccessControlSection
          settings={settings}
          busy={busy}
          onChange={(patch) => setSettings({ ...settings, ...patch })}
          onSave={() => void saveSettings()}
        />

        <AlertsSection
          settings={settings}
          busy={busy}
          onChange={(patch) => setSettings({ ...settings, ...patch })}
          onSave={() => void saveSettings()}
        />

        <SystemHealthSection
          health={health}
          busy={busy}
          onRefresh={() => void loadHealth()}
        />

        <AdminActionsSection
          busy={busy}
          inventoryLocked={!settings.allow_manual_inventory_edits}
          lastMessage={actionMessage}
          onRefreshDashboard={() =>
            void runAction("/api/admin/actions/refresh-dashboard")
          }
          onMarkMissing={async () => {
            await runAction("/api/admin/actions/mark-missing");
            await loadHealth();
          }}
          onLowStockCheck={async () => {
            await runAction("/api/admin/actions/low-stock-check");
            await loadHealth();
          }}
          onResetFlags={() =>
            void runAction("/api/admin/actions/reset-low-stock-flags")
          }
          onExportAudit={() =>
            void runAction("/api/admin/actions/export-audit-log", "GET")
          }
          onLock={async () => {
            const data = await runAction("/api/admin/actions/lock-inventory");
            if (data?.success) {
              setSettings({
                ...settings,
                allow_manual_inventory_edits: false,
              });
            }
          }}
          onUnlock={async () => {
            const data = await runAction("/api/admin/actions/unlock-inventory");
            if (data?.success) {
              setSettings({
                ...settings,
                allow_manual_inventory_edits: true,
              });
            }
          }}
        />
      </div>
    </div>
  );
}
