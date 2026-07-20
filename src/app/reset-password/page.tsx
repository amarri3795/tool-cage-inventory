"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [siteName, setSiteName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName, contactEmail }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setMessage(
        data.message ??
          "If the site and email match our records, a reset link has been issued. Contact your master administrator if you need immediate help.",
      );
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="auth-eyebrow">Tool Cage Inventory</p>
        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-sub">
          Request a site password reset. Your master administrator can also reset
          passwords from Master Admin Tools.
        </p>
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-label">
            Site Name
            <input
              className="auth-input"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              required
            />
          </label>
          <label className="auth-label">
            Contact Email (on file)
            <input
              className="auth-input"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          {message ? (
            <p className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--foreground)]">
              {message}
            </p>
          ) : null}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "Sending…" : "Request reset"}
          </button>
        </form>
        <div className="auth-links">
          <Link href="/">Back to site login</Link>
        </div>
      </div>
    </div>
  );
}
