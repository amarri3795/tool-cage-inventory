"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  mode: "site-login" | "signup" | "admin-login" | "site-admin-login";
};

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-label" htmlFor={id}>
      {label}
      <div className="relative">
        <input
          id={id}
          className="auth-input pr-10"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

export function AuthCard({ mode }: Props) {
  const router = useRouter();
  const [siteNames, setSiteNames] = useState<string[]>([]);
  const [siteName, setSiteName] = useState("");
  const [password, setPassword] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "site-login") return;
    fetch("/api/auth/sites")
      .then((r) => r.json())
      .then((data: { sites?: string[] }) => {
        setSiteNames(data.sites ?? []);
      })
      .catch(() => setSiteNames([]));
  }, [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint =
        mode === "signup"
          ? "/api/auth/signup"
          : mode === "admin-login"
            ? "/api/auth/admin-login"
            : mode === "site-admin-login"
              ? "/api/auth/site-admin-login"
              : "/api/auth/site-login";

      const body =
        mode === "admin-login"
          ? { adminId: siteName, password, rememberMe }
          : mode === "site-admin-login"
            ? { adminPassword: password, rememberMe }
            : mode === "signup"
              ? {
                  siteName,
                  sitePassword: password,
                  contactEmail,
                  rememberMe,
                }
              : { siteName, sitePassword: password, rememberMe };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: {
        success?: boolean;
        error?: string;
        redirectTo?: string;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          res.ok
            ? "Could not read server response."
            : `Server error (${res.status}). Check server configuration and redeploy if needed.`,
        );
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.replace(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? "Site Signup"
      : mode === "admin-login"
        ? "Admin Login"
        : mode === "site-admin-login"
          ? "Site Admin Login"
          : "Site Login";

  const subtitle =
    mode === "signup"
      ? "Register a new plant. Existing sites should use Site Login."
      : mode === "admin-login"
        ? "Master admin access to the control center."
        : mode === "site-admin-login"
          ? "Enter the site admin password to manage inventory and settings."
          : "Select your plant and enter the site password.";

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="auth-eyebrow">Tool Cage Inventory</p>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{subtitle}</p>

        <form onSubmit={onSubmit} className="auth-form">
          {mode !== "site-admin-login" ? (
            <label className="auth-label">
              {mode === "admin-login" ? "Admin ID" : "Site Name"}
              {mode === "site-login" && siteNames.length > 0 ? (
                <select
                  className="auth-input"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                >
                  <option value="">Select a site…</option>
                  {siteNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="auth-input"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  autoComplete="username"
                  required
                />
              )}
            </label>
          ) : null}

          <PasswordInput
            id="auth-password"
            label={
              mode === "admin-login"
                ? "Admin Password"
                : mode === "site-admin-login"
                  ? "Site Admin Password"
                  : "Site Password"
            }
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />

          {mode === "signup" ? (
            <label className="auth-label">
              Contact Email
              <input
                className="auth-input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
          ) : null}

          <label className="auth-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create site"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-links">
          {mode === "site-login" ? (
            <>
              <Link href="/signup">New plant? Sign up</Link>
              <Link href="/reset-password">Reset password</Link>
              <Link href="/admin/login">Admin login</Link>
            </>
          ) : null}
          {mode === "signup" ? (
            <>
              <Link href="/">Back to site login</Link>
              <Link href="/admin/login">Admin login</Link>
            </>
          ) : null}
          {mode === "admin-login" ? (
            <Link href="/">Back to site login</Link>
          ) : null}
          {mode === "site-admin-login" ? (
            <Link href="/dashboard">Back to dashboard</Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
