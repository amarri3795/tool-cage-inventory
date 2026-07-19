"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  lookupEmployeeAction,
  lookupItemAction,
  submitScanAction,
} from "./actions";
import type { EmployeeSummary, ItemSummary } from "@/lib/scan-types";
import { MATERIAL_ACTIONS, TOOL_ACTIONS } from "@/lib/scan-types";

const TOOL_ACTION_OPTIONS: string[] = [
  TOOL_ACTIONS.CHECK_OUT,
  TOOL_ACTIONS.CHECK_IN,
];

const MATERIAL_ACTION_OPTIONS: string[] = [
  MATERIAL_ACTIONS.ISSUE,
  MATERIAL_ACTIONS.RECEIVE,
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

export function ScanForm() {
  const [badgeInput, setBadgeInput] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [action, setAction] = useState("");
  const [qtyPurpose, setQtyPurpose] = useState("");

  const [employee, setEmployee] = useState<EmployeeSummary | null>(null);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [item, setItem] = useState<ItemSummary | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const [pending, startTransition] = useTransition();

  const actionOptions = useMemo(() => {
    if (!item) return [] as string[];
    return item.kind === "tool" ? TOOL_ACTION_OPTIONS : MATERIAL_ACTION_OPTIONS;
  }, [item]);

  const qtyPurposeLabel =
    item?.kind === "material" ? "Quantity" : "Purpose / notes";

  useEffect(() => {
    if (!item) {
      setAction("");
      return;
    }
    setAction((prev) => (actionOptions.includes(prev) ? prev : actionOptions[0] ?? ""));
  }, [item, actionOptions]);

  function resolveEmployee() {
    setFormMessage(null);
    startTransition(async () => {
      const result = await lookupEmployeeAction(badgeInput);
      if (result.ok) {
        setEmployee(result.employee);
        setEmployeeError(null);
      } else {
        setEmployee(null);
        setEmployeeError(result.error);
      }
    });
  }

  function resolveItem() {
    setFormMessage(null);
    startTransition(async () => {
      const result = await lookupItemAction(itemInput);
      if (result.ok) {
        setItem(result.item);
        setItemError(null);
      } else {
        setItem(null);
        setItemError(result.error);
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);

    startTransition(async () => {
      const empResult = employee
        ? { ok: true as const, employee }
        : await lookupEmployeeAction(badgeInput);
      if (!empResult.ok) {
        setEmployee(null);
        setEmployeeError(empResult.error);
        setFormMessage({ type: "error", text: empResult.error });
        return;
      }
      setEmployee(empResult.employee);
      setEmployeeError(null);

      const itemResult = item
        ? { ok: true as const, item }
        : await lookupItemAction(itemInput);
      if (!itemResult.ok) {
        setItem(null);
        setItemError(itemResult.error);
        setFormMessage({ type: "error", text: itemResult.error });
        return;
      }
      setItem(itemResult.item);
      setItemError(null);

      // Tool check-out / check-in go through the dedicated API routes.
      if (itemResult.item.kind === "tool") {
        const endpoint =
          action === TOOL_ACTIONS.CHECK_OUT
            ? "/api/scan/tool/check-out"
            : action === TOOL_ACTIONS.CHECK_IN
              ? "/api/scan/tool/check-in"
              : null;

        if (!endpoint) {
          setFormMessage({
            type: "error",
            text: `Unknown tool action "${action}".`,
          });
          return;
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            badgeId: badgeInput,
            toolId: itemInput,
            purpose: qtyPurpose || undefined,
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          message?: string;
          error?: string;
        };

        if (!res.ok || !data.success) {
          setFormMessage({
            type: "error",
            text: data.error ?? `Request failed (HTTP ${res.status})`,
          });
          return;
        }

        setFormMessage({
          type: "ok",
          text: data.message ?? "Tool scan logged.",
        });
        setQtyPurpose("");
        const refreshed = await lookupItemAction(itemInput);
        if (refreshed.ok) setItem(refreshed.item);
        return;
      }

      const result = await submitScanAction({
        badgeInput,
        itemInput,
        action,
        qtyPurpose,
      });

      if (result.ok) {
        setFormMessage({ type: "ok", text: result.message });
        setQtyPurpose("");
        const refreshed = await lookupItemAction(itemInput);
        if (refreshed.ok) setItem(refreshed.item);
      } else {
        setFormMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Scan inputs
          </h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Badge ID</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={badgeInput}
                  onChange={(e) => {
                    setBadgeInput(e.target.value);
                    setEmployee(null);
                    setEmployeeError(null);
                  }}
                  onBlur={() => {
                    if (badgeInput.trim()) resolveEmployee();
                  }}
                  placeholder="Badge ID or raw badge string"
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={resolveEmployee}
                  disabled={pending || !badgeInput.trim()}
                  className="shrink-0 rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent-soft)] disabled:opacity-50"
                >
                  Lookup
                </button>
              </div>
              {employeeError && (
                <p className="mt-1 text-sm text-[var(--danger)]">{employeeError}</p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-medium">Tool or Material ID</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={itemInput}
                  onChange={(e) => {
                    setItemInput(e.target.value);
                    setItem(null);
                    setItemError(null);
                  }}
                  onBlur={() => {
                    if (itemInput.trim()) resolveItem();
                  }}
                  placeholder="TL-001 or MAT-001"
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={resolveItem}
                  disabled={pending || !itemInput.trim()}
                  className="shrink-0 rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent-soft)] disabled:opacity-50"
                >
                  Lookup
                </button>
              </div>
              {itemError && (
                <p className="mt-1 text-sm text-[var(--danger)]">{itemError}</p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-medium">Action</span>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                disabled={!item}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
              >
                {!item && <option value="">Lookup an item first</option>}
                {actionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">{qtyPurposeLabel}</span>
              <input
                type={item?.kind === "material" ? "number" : "text"}
                min={item?.kind === "material" ? 1 : undefined}
                step={item?.kind === "material" ? "any" : undefined}
                value={qtyPurpose}
                onChange={(e) => setQtyPurpose(e.target.value)}
                placeholder={
                  item?.kind === "material"
                    ? "e.g. 2"
                    : "e.g. Job site repair"
                }
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || !item || !action}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Submit scan"}
            </button>
            {formMessage && (
              <p
                className={`text-sm ${
                  formMessage.type === "ok"
                    ? "text-[var(--accent)]"
                    : "text-[var(--danger)]"
                }`}
              >
                {formMessage.text}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Employee
            </h2>
            {employee ? (
              <dl className="mt-3 space-y-2">
                <DetailRow label="Name" value={employee.name} />
                <DetailRow label="Badge ID" value={employee.badge_id} />
                <DetailRow
                  label="Job title"
                  value={employee.job_title ?? "—"}
                />
                <DetailRow label="Raw badge" value={employee.raw_badge_data} />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Enter a badge ID to look up the employee.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Item details
            </h2>
            {!item && (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Enter a TL- or MAT- ID to preview details before submitting.
              </p>
            )}
            {item?.kind === "tool" && (
              <dl className="mt-3 space-y-2">
                <DetailRow label="Type" value="Tool" />
                <DetailRow label="Tool ID" value={item.tool_id} />
                <DetailRow label="Name" value={item.name} />
                <DetailRow label="Status" value={item.status} />
                <DetailRow label="Category" value={item.category ?? "—"} />
                <DetailRow label="Location" value={item.location ?? "—"} />
                <DetailRow label="Condition" value={item.condition ?? "—"} />
                <DetailRow
                  label="Last out by"
                  value={item.last_checked_out_by ?? "—"}
                />
                <DetailRow
                  label="Checkout time"
                  value={
                    item.checkout_time
                      ? new Date(item.checkout_time).toLocaleString()
                      : "—"
                  }
                />
                <DetailRow label="Notes" value={item.notes ?? "—"} />
              </dl>
            )}
            {item?.kind === "material" && (
              <dl className="mt-3 space-y-2">
                <DetailRow label="Type" value="Material" />
                <DetailRow label="Material ID" value={item.material_id} />
                <DetailRow label="Name" value={item.name} />
                <DetailRow label="Status" value={item.status} />
                <DetailRow
                  label="Qty on hand"
                  value={String(item.current_qty)}
                />
                <DetailRow label="Min qty" value={String(item.min_qty)} />
                <DetailRow label="Unit" value={item.unit ?? "—"} />
                <DetailRow label="Category" value={item.category ?? "—"} />
                <DetailRow label="Location" value={item.location ?? "—"} />
                <DetailRow
                  label="Last taken by"
                  value={item.last_taken_by ?? "—"}
                />
                <DetailRow label="Notes" value={item.notes ?? "—"} />
              </dl>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
