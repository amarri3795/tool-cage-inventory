"use client";

type Props = {
  busy: boolean;
  inventoryLocked: boolean;
  lastMessage: string | null;
  onRefreshDashboard: () => void;
  onMarkMissing: () => void;
  onLowStockCheck: () => void;
  onResetFlags: () => void;
  onExportAudit: () => void;
  onLock: () => void;
  onUnlock: () => void;
};

function ActionButton({
  label,
  description,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  tone?: "default" | "accent" | "warn" | "danger";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]"
      : tone === "warn"
        ? "border-[var(--warn)]/30 hover:bg-[var(--warn-soft)]"
        : tone === "danger"
          ? "border-[var(--danger)]/30 hover:bg-[var(--danger-soft)]"
          : "border-[var(--border)] hover:bg-[var(--background)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border bg-[var(--card)] p-4 text-left transition disabled:opacity-50 ${toneClass}`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="mt-1 block text-xs text-[var(--muted)]">
        {description}
      </span>
    </button>
  );
}

export function AdminActionsSection({
  busy,
  inventoryLocked,
  lastMessage,
  onRefreshDashboard,
  onMarkMissing,
  onLowStockCheck,
  onResetFlags,
  onExportAudit,
  onLock,
  onUnlock,
}: Props) {
  return (
    <section id="admin-actions" className="scroll-mt-24 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Admin Actions</h2>
        <p className="text-sm text-[var(--muted)]">
          Operational controls for refresh, overdue tools, alerts, audit export,
          and edit lock.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionButton
          label="Refresh dashboard"
          description="Revalidate dashboard and inventory page caches"
          onClick={onRefreshDashboard}
          disabled={busy}
          tone="accent"
        />
        <ActionButton
          label="Mark overdue tools Missing"
          description="Checked-out tools older than missing_after_hours → Missing"
          onClick={onMarkMissing}
          disabled={busy}
          tone="danger"
        />
        <ActionButton
          label="Run low stock check"
          description="Simulate low-stock alerts (frequency-gated) and reset OK flags"
          onClick={onLowStockCheck}
          disabled={busy}
          tone="warn"
        />
        <ActionButton
          label="Reset low stock email flags"
          description="Clear low_stock_email_sent so alerts can fire again"
          onClick={onResetFlags}
          disabled={busy}
        />
        <ActionButton
          label="Export audit log"
          description="Download Security & Audit rows as CSV"
          onClick={onExportAudit}
          disabled={busy}
        />
        {inventoryLocked ? (
          <ActionButton
            label="Unlock manual inventory edits"
            description="Set allow_manual_inventory_edits to true"
            onClick={onUnlock}
            disabled={busy}
            tone="warn"
          />
        ) : (
          <ActionButton
            label="Lock manual inventory edits"
            description="Set allow_manual_inventory_edits to false"
            onClick={onLock}
            disabled={busy}
            tone="danger"
          />
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
        <span className="text-[var(--muted)]">Inventory edit lock: </span>
        <span
          className={
            inventoryLocked
              ? "font-semibold text-[var(--danger)]"
              : "font-semibold text-[var(--accent)]"
          }
        >
          {inventoryLocked ? "Locked" : "Unlocked"}
        </span>
        {lastMessage ? (
          <p className="mt-2 text-xs text-[var(--muted)]">{lastMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
