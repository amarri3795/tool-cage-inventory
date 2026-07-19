"use client";

import type { AdminSettings } from "@/lib/settings";

type Props = {
  settings: AdminSettings;
  busy: boolean;
  onChange: (patch: Partial<AdminSettings>) => void;
  onSave: () => void;
};

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <div className="text-sm font-medium">{children}</div>
      {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value.join("\n")}
      onChange={(e) =>
        onChange(
          e.target.value
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
      rows={3}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
    />
  );
}

export function SystemSettingsSection({
  settings,
  busy,
  onChange,
  onSave,
}: Props) {
  return (
    <section id="system-settings" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">System Settings</h2>
          <p className="text-sm text-[var(--muted)]">
            Core cage behavior — overdue timing, defaults, and allowed values.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Save settings
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <FieldLabel hint="Hours after checkout before auto status becomes MISSING">
            Missing after hours
          </FieldLabel>
          <input
            type="number"
            min={0}
            step={1}
            value={settings.missing_after_hours}
            onChange={(e) =>
              onChange({ missing_after_hours: Number(e.target.value) || 0 })
            }
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <FieldLabel hint="Applied to new tools and materials when location is blank">
            Default location
          </FieldLabel>
          <input
            type="text"
            value={settings.default_location}
            onChange={(e) => onChange({ default_location: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:col-span-2">
          <FieldLabel hint="One status per line">Allowed tool statuses</FieldLabel>
          <TextArea
            value={settings.allowed_tool_statuses}
            onChange={(allowed_tool_statuses) =>
              onChange({ allowed_tool_statuses })
            }
            placeholder="Available&#10;Checked Out&#10;Missing"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <FieldLabel hint="Scanner / transaction actions">Allowed actions</FieldLabel>
          <TextArea
            value={settings.allowed_actions}
            onChange={(allowed_actions) => onChange({ allowed_actions })}
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <FieldLabel hint="Tool condition pick-list">Allowed conditions</FieldLabel>
          <TextArea
            value={settings.allowed_conditions}
            onChange={(allowed_conditions) => onChange({ allowed_conditions })}
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.require_purpose}
              onChange={(e) => onChange({ require_purpose: e.target.checked })}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-medium">
                Require purpose / reason
              </span>
              <span className="text-xs text-[var(--muted)]">
                Block tool transactions that omit a purpose field.
              </span>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
