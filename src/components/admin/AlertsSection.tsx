"use client";

import type { AdminSettings } from "@/lib/settings";

type Props = {
  settings: AdminSettings;
  busy: boolean;
  onChange: (patch: Partial<AdminSettings>) => void;
  onSave: () => void;
};

export function AlertsSection({ settings, busy, onChange, onSave }: Props) {
  return (
    <section id="alerts" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Alerts</h2>
          <p className="text-sm text-[var(--muted)]">
            Low-stock notification policy. Email delivery may be stubbed without
            SMTP.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Save alerts
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-panel p-4 sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.low_stock_alerts_enabled}
              onChange={(e) =>
                onChange({ low_stock_alerts_enabled: e.target.checked })
              }
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-medium">
                Low stock alerts enabled
              </span>
              <span className="text-xs text-[var(--muted)]">
                When on, the low-stock check marks due materials for notification.
              </span>
            </span>
          </label>
        </div>

        <div className="glass-panel p-4">
          <label className="text-sm font-medium">Alert email recipient</label>
          <input
            type="email"
            value={settings.low_stock_email_to}
            onChange={(e) => onChange({ low_stock_email_to: e.target.value })}
            placeholder="ops@example.com"
            className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="glass-panel p-4">
          <label className="text-sm font-medium">Alert frequency (hours)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={settings.alert_frequency_hours}
            onChange={(e) =>
              onChange({ alert_frequency_hours: Number(e.target.value) || 0 })
            }
            className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="glass-panel p-4 sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.reset_email_flag_when_ok}
              onChange={(e) =>
                onChange({ reset_email_flag_when_ok: e.target.checked })
              }
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-medium">
                Reset alert flag when material returns to OK
              </span>
              <span className="text-xs text-[var(--muted)]">
                Clears low_stock_email_sent so a future drop below min can alert
                again.
              </span>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
