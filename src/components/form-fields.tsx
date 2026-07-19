import type { ReactNode } from "react";

export function FormField({
  label,
  name,
  children,
  hint,
}: {
  label: string;
  name?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block" htmlFor={name}>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </label>
  );
}

export const inputClassName =
  "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

export const primaryButtonClassName =
  "rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";

export const secondaryButtonClassName =
  "rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent-soft)]";
