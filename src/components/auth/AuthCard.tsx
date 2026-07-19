"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  mode: "site-login" | "signup" | "admin-login";
};

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
            : "/api/auth/site-login";

      const body =
        mode === "admin-login"
          ? { adminId: siteName, password, rememberMe }
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
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.replace(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? "Site Signup"
      : mode === "admin-login"
        ? "Admin Login"
        : "Site Login";

  const subtitle =
    mode === "signup"
      ? "Register a new plant. Existing sites should use Site Login."
      : mode === "admin-login"
        ? "Master admin access to the control center."
        : "Select your plant and enter the site password.";

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="auth-eyebrow">Tool Cage Inventory</p>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{subtitle}</p>

        <form onSubmit={onSubmit} className="auth-form">
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

          <label className="auth-label">
            {mode === "admin-login" ? "Admin Password" : "Site Password"}
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
            />
          </label>

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
        </div>
      </div>
    </div>
  );
}
