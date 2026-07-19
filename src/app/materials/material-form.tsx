"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  FormField,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/form-fields";
import {
  createMaterial,
  updateMaterial,
  type MaterialActionState,
} from "./actions";

export type MaterialFormValues = {
  id?: number;
  material_id: string;
  name: string;
  category: string;
  unit: string;
  location: string;
  current_qty: string;
  min_qty: string;
  status: string;
  notes: string;
};

const STATUS_OPTIONS = ["OK", "Low", "Out of Stock"];

const initialState: MaterialActionState = {};

export function MaterialForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: MaterialFormValues;
}) {
  const action =
    mode === "create"
      ? createMaterial
      : updateMaterial.bind(null, initial.id as number);

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error ? (
        <p className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <FormField label="Material ID" name="material_id">
        <input
          id="material_id"
          name="material_id"
          required
          defaultValue={initial.material_id}
          placeholder="MAT-001"
          className={inputClassName}
        />
      </FormField>

      <FormField label="Name" name="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={initial.name}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Category" name="category">
        <input
          id="category"
          name="category"
          defaultValue={initial.category}
          className={inputClassName}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Unit" name="unit">
          <input
            id="unit"
            name="unit"
            defaultValue={initial.unit}
            placeholder="ea, ft, box…"
            className={inputClassName}
          />
        </FormField>

        <FormField label="Location" name="location">
          <input
            id="location"
            name="location"
            defaultValue={initial.location}
            className={inputClassName}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Current Qty" name="current_qty">
          <input
            id="current_qty"
            name="current_qty"
            type="number"
            step="any"
            min={0}
            defaultValue={initial.current_qty}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Min Qty" name="min_qty">
          <input
            id="min_qty"
            name="min_qty"
            type="number"
            step="any"
            min={0}
            defaultValue={initial.min_qty}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField label="Status" name="status">
        <select
          id="status"
          name="status"
          defaultValue={initial.status || "OK"}
          className={inputClassName}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Notes" name="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial.notes}
          className={inputClassName}
        />
      </FormField>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={pending} className={primaryButtonClassName}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Add material"
              : "Save changes"}
        </button>
        <Link href="/materials" className={secondaryButtonClassName}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
