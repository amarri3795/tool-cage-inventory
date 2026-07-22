"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  FormField,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/form-fields";
import { createEmployee, type EmployeeActionState } from "./actions";

export type EmployeeFormValues = {
  badge_id: string;
  raw_badge_data: string;
  name: string;
  job_title: string;
};

const initialState: EmployeeActionState = {};

export function EmployeeForm({ initial }: { initial: EmployeeFormValues }) {
  const [state, formAction, pending] = useActionState(
    createEmployee,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state.error ? (
        <p className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <FormField label="Badge ID" name="badge_id">
        <input
          id="badge_id"
          name="badge_id"
          required
          defaultValue={initial.badge_id}
          placeholder="B-1001"
          className={inputClassName}
        />
      </FormField>

      <FormField
        label="Raw badge data"
        name="raw_badge_data"
        hint="Exact scan string stored for badge matching (e.g. 4MT$RECV%B-1001)."
      >
        <input
          id="raw_badge_data"
          name="raw_badge_data"
          required
          defaultValue={initial.raw_badge_data}
          placeholder="4MT$RECV%B-1001"
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

      <FormField label="Job title" name="job_title">
        <input
          id="job_title"
          name="job_title"
          defaultValue={initial.job_title}
          className={inputClassName}
        />
      </FormField>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={pending} className={primaryButtonClassName}>
          {pending ? "Saving…" : "Add employee"}
        </button>
        <Link href="/employees" className={secondaryButtonClassName}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
