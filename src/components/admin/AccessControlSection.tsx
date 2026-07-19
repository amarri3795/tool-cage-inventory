"use client";

import type { AdminSettings } from "@/lib/settings";

type Props = {
  settings: AdminSettings;
  busy: boolean;
  onChange: (patch: Partial<AdminSettings>) => void;
  onSave: () => void;
};

export function AccessControlSection({
  settings,
  busy,
  onChange,
  onSave,
}: Props) {
  const roles = Object.keys(settings.role_permissions);

  return (
    <section id="access-control" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Access Control</h2>
          <p className="text-sm text-[var(--muted)]">
            Who can open this console and what each role may do.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Save access
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <label className="text-sm font-medium">Admin badge IDs</label>
          <p className="mb-2 text-xs text-[var(--muted)]">
            One ID per line. Only these badges can use /admin APIs.
          </p>
          <textarea
            value={settings.admin_badge_ids.join("\n")}
            onChange={(e) =>
              onChange({
                admin_badge_ids: e.target.value
                  .split(/[\n,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <label className="text-sm font-medium">
            Material manager badge IDs
          </label>
          <p className="mb-2 text-xs text-[var(--muted)]">
            Badges allowed to adjust material inventory quantities.
          </p>
          <textarea
            value={settings.material_manager_badge_ids.join("\n")}
            onChange={(e) =>
              onChange({
                material_manager_badge_ids: e.target.value
                  .split(/[\n,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="text-sm font-semibold">Role permissions</h3>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Edit permission tokens per role (comma-separated). Used by the control
          center and future page guards.
        </p>
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role}
              className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center"
            >
              <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                {role.replace(/_/g, " ")}
              </span>
              <input
                value={(settings.role_permissions[role] ?? []).join(", ")}
                onChange={(e) => {
                  const perms = e.target.value
                    .split(/[,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  onChange({
                    role_permissions: {
                      ...settings.role_permissions,
                      [role]: perms,
                    },
                  });
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
