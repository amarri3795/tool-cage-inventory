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
  "surface-light w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

/** Dark text on gold — keeps Link-as-button readable (global `a` color would otherwise match the accent fill). */
export const primaryButtonClassName =
  "btn-primary inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50";

export const secondaryButtonClassName =
  "btn-secondary inline-flex items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] no-underline hover:bg-[var(--accent-soft)]";
