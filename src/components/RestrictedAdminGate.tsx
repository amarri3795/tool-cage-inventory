"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_AUTH_EVENT,
  getStoredBadge,
  setStoredBadge,
} from "@/components/admin/admin-api";

type Props = {
  children: React.ReactNode;
};

export function RestrictedAdminGate({ children }: Props) {
  const [badgeId, setBadgeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sync = useCallback(() => {
    setBadgeId(getStoredBadge());
    setReady(true);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(ADMIN_AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ADMIN_AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeId: input.trim() }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        badgeId?: string;
        error?: string;
      };
      if (!res.ok || !data.success || !data.badgeId) {
        setError(data.error ?? "Access denied");
        return;
      }
      setStoredBadge(data.badgeId);
      setBadgeId(data.badgeId);
      setInput("");
    } catch {
      setError("Could not verify badge. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
        Checking admin access…
      </div>
    );
  }

  if (badgeId) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Restricted
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Admin login required
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Tools, Materials, Employees, and Transactions are locked until you
          sign in with an authorized admin badge.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Admin badge ID
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoFocus
              placeholder="e.g. 6279"
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </label>
          {error ? (
            <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Unlock inventory pages"}
          </button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Or sign in from{" "}
          <Link href="/admin" className="font-medium text-[var(--accent)] hover:underline">
            Admin
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
