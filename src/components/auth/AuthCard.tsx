"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE_PRESETS, type SitePresetId } from "@/lib/site-presets";

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
  const [preset, setPreset] = useState<SitePresetId>("checkout");
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
                  preset,
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

  const cardTitle =
    mode === "signup"
      ? "Create your site"
      : mode === "admin-login"
        ? "Administrator access"
        : mode === "site-admin-login"
          ? "Site admin login"
          : "Enter your site";

  const cardSubtitle =
    mode === "signup"
      ? "Register a new site. Existing sites should use site login."
      : mode === "admin-login"
        ? "Master admin access to the control center."
        : mode === "site-admin-login"
          ? "Enter the site admin password to manage inventory and settings."
          : "Site name, password, and remember me — same as always.";

  const showLandingHero = mode === "site-login";

  return (
    <div className="auth-landing">
      <div className="auth-logo-backdrop" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/opsflow-logo.png" alt="" />
      </div>

      <div className="auth-landing-layout">
        {showLandingHero ? (
          <section className="auth-landing-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/opsflow-logo.png"
              alt="OpsFlow"
              className="auth-landing-logo"
            />
            <p className="auth-eyebrow">OpsFlow</p>
            <h1 className="auth-landing-headline">
              Operations,
              <br />
              from one screen.
            </h1>
            <p className="auth-landing-copy">
              Inventory, check-outs, and stock across every site — clear enough
              for the floor, strong enough for the office.
            </p>
            <ul className="auth-landing-points">
              <li>Presets for check-out, inventory, or both</li>
              <li>Badge scan when you need it</li>
              <li>Site admin + master control</li>
            </ul>
          </section>
        ) : null}

        <section className="auth-card auth-glass">
          {!showLandingHero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/opsflow-logo.png"
              alt="OpsFlow"
              className="mx-auto mb-4 h-14 w-auto"
            />
          ) : null}

          <p className="auth-eyebrow">
            {mode === "admin-login" ? "OpsFlow Admin" : "OpsFlow"}
          </p>
          <h1 className="auth-title">{cardTitle}</h1>
          <p className="auth-sub">{cardSubtitle}</p>

          <form onSubmit={onSubmit} className="auth-form">
            {mode !== "site-admin-login" ? (
              <label className="auth-label">
                {mode === "admin-login" ? "Admin ID" : "Site name"}
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
                  ? "Admin password"
                  : mode === "site-admin-login"
                    ? "Site admin password"
                    : "Site password"
              }
              value={password}
              onChange={setPassword}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />

            {mode === "signup" ? (
              <label className="auth-label">
                Contact email
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

            {mode === "signup" ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-[var(--accent)]">
                  Operation preset
                </legend>
                <p className="text-xs text-[var(--muted)]">
                  Chooses your dashboard and scan focus. You can change this
                  later in Site Settings.
                </p>
                <div className="grid gap-2">
                  {SITE_PRESETS.map((p) => (
                    <label
                      key={p.id}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-sm ${
                        preset === p.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--border)] bg-black/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="preset"
                        className="sr-only"
                        checked={preset === p.id}
                        onChange={() => setPreset(p.id)}
                      />
                      <span className="font-medium text-[var(--foreground)]">
                        {p.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {p.description}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
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
                <Link href="/signup">New site? Sign up</Link>
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
        </section>
      </div>
    </div>
  );
}
