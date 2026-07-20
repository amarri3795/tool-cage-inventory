"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/form-fields";

export function SiteSettingsPanel() {
  const searchParams = useSearchParams();
  const masterSiteId = searchParams.get("siteId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sitePassword, setSitePassword] = useState("");
  const [siteAdminPassword, setSiteAdminPassword] = useState("");
  const [toolCategories, setToolCategories] = useState("[]");
  const [dashboardPreferences, setDashboardPreferences] = useState("{}");
  const [isMaster, setIsMaster] = useState(false);
  const [masterSites, setMasterSites] = useState<
    { id: number; name: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = (await sessionRes.json()) as {
        role?: string;
        siteId?: number;
      };
      setIsMaster(session.role === "master_admin");

      if (session.role === "master_admin") {
        const listRes = await fetch("/api/master/sites");
        const listData = (await listRes.json()) as {
          sites?: { id: number; name: string }[];
        };
        setMasterSites(listData.sites ?? []);
      }

      const q =
        session.role === "master_admin" && masterSiteId
          ? `?siteId=${encodeURIComponent(masterSiteId)}`
          : "";
      const res = await fetch(`/api/site-settings${q}`);
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        site?: { id: number; name: string; contact_email: string };
        toolCategories?: string;
        dashboardPreferences?: string;
      };
      if (!res.ok || !data.success || !data.site) {
        setError(data.error ?? "Could not load settings");
        return;
      }
      setSiteId(data.site.id);
      setDisplayName(data.site.name);
      setContactEmail(data.site.contact_email);
      setToolCategories(data.toolCategories ?? "[]");
      setDashboardPreferences(data.dashboardPreferences ?? "{}");
    } catch {
      setError("Network error loading settings");
    } finally {
      setLoading(false);
    }
  }, [masterSiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: siteId ?? undefined,
        displayName,
        contactEmail,
        sitePassword: sitePassword || undefined,
        siteAdminPassword: siteAdminPassword || undefined,
        toolCategories,
        dashboardPreferences,
      }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      setError(data.error ?? "Save failed");
      return;
    }
    setSitePassword("");
    setSiteAdminPassword("");
    setMessage("Settings saved.");
    await load();
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading site settings…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Update plant credentials, categories, and dashboard preferences.
        </p>
      </div>

      {isMaster ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-medium">Master admin — select site</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {masterSites.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/site-settings?siteId=${s.id}`}
                  className={
                    siteId === s.id
                      ? "font-semibold text-[var(--accent)]"
                      : "text-[var(--muted)] hover:text-[var(--accent)]"
                  }
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? (
        <p className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      <form onSubmit={save} className="max-w-xl space-y-4">
        <label className="block text-sm">
          Display name
          <input
            className={`${inputClassName} mt-1`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Contact email
          <input
            type="email"
            className={`${inputClassName} mt-1`}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          New site (member) password
          <input
            type="password"
            className={`${inputClassName} mt-1`}
            value={sitePassword}
            onChange={(e) => setSitePassword(e.target.value)}
            placeholder="Leave blank to keep current"
          />
        </label>
        <label className="block text-sm">
          New site admin password
          <input
            type="password"
            className={`${inputClassName} mt-1`}
            value={siteAdminPassword}
            onChange={(e) => setSiteAdminPassword(e.target.value)}
            placeholder="Leave blank to keep current"
          />
        </label>
        <label className="block text-sm">
          Tool categories (JSON array)
          <textarea
            className={`${inputClassName} mt-1 font-mono text-xs`}
            rows={4}
            value={toolCategories}
            onChange={(e) => setToolCategories(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Dashboard preferences (JSON object)
          <textarea
            className={`${inputClassName} mt-1 font-mono text-xs`}
            rows={4}
            value={dashboardPreferences}
            onChange={(e) => setDashboardPreferences(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButtonClassName}>
            Save settings
          </button>
          <Link href="/employees" className={secondaryButtonClassName}>
            Manage employees
          </Link>
        </div>
      </form>
    </div>
  );
}
