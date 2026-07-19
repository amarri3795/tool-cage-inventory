"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_AUTH_EVENT,
  clearStoredBadge,
  getStoredBadge,
  setStoredBadge,
} from "@/components/admin/admin-api";

type Props = {
  children: (badgeId: string, signOut: () => void) => React.ReactNode;
};

export function AdminGate({ children }: Props) {
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

  function signOut() {
    clearStoredBadge();
    setBadgeId(null);
  }

  if (!ready) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
        Checking admin access…
      </div>
    );
  }

  if (badgeId) {
    return <>{children(badgeId, signOut)}</>;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Admin Control Center
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Badge gate
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter an authorized admin badge ID. It is stored in sessionStorage for
          this browser tab only.
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
            {busy ? "Checking…" : "Enter control center"}
          </button>
        </form>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Dev tip: badge <code className="rounded bg-[var(--background)] px-1">dev</code>{" "}
          works when{" "}
          <code className="rounded bg-[var(--background)] px-1">ADMIN_DEV_BYPASS</code>{" "}
          is enabled (default in development).
        </p>
      </div>
    </div>
  );
}
