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
  createTool,
  updateTool,
  type ToolActionState,
} from "./actions";

export type ToolFormValues = {
  id?: number;
  tool_id: string;
  name: string;
  category: string;
  location: string;
  status: string;
  condition: string;
  notes: string;
};

const STATUS_OPTIONS = ["Available", "Checked Out", "Missing", "Maintenance"];
const CONDITION_OPTIONS = ["Good", "Fair", "Poor", "Needs Repair"];

const initialState: ToolActionState = {};

export function ToolForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: ToolFormValues;
}) {
  const action =
    mode === "create"
      ? createTool
      : updateTool.bind(null, initial.id as number);

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error ? (
        <p className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <FormField label="Tool ID" name="tool_id">
        <input
          id="tool_id"
          name="tool_id"
          required
          defaultValue={initial.tool_id}
          placeholder="TL-001"
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

      <FormField label="Location" name="location">
        <input
          id="location"
          name="location"
          defaultValue={initial.location}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Status" name="status">
        <select
          id="status"
          name="status"
          defaultValue={initial.status || "Available"}
          className={inputClassName}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Condition" name="condition">
        <select
          id="condition"
          name="condition"
          defaultValue={initial.condition || "Good"}
          className={inputClassName}
        >
          {CONDITION_OPTIONS.map((opt) => (
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
              ? "Add tool"
              : "Save changes"}
        </button>
        <Link href="/tools" className={secondaryButtonClassName}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
