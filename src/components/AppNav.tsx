"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SessionRole = "master_admin" | "site_admin" | "site_member";

function canAccessInventoryNav(role: SessionRole): boolean {
  return role === "master_admin" || role === "site_admin";
}

type SessionInfo = {
  authenticated: boolean;
  role?: SessionRole;
  adminId?: string | null;
  siteName?: string | null;
};

const memberLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scan", label: "Scan" },
] as const;

const siteAdminLinks = [
  ...memberLinks,
  { href: "/tools", label: "Tools" },
  { href: "/materials", label: "Materials" },
  { href: "/employees", label: "Employees" },
  { href: "/transactions", label: "Transactions" },
  { href: "/reports", label: "Reports" },
  { href: "/site-settings", label: "Site Settings" },
] as const;

const adminLinks = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/sites", label: "Master Admin Tools" },
  { href: "/site-settings", label: "Site Settings" },
] as const;

const linkClassName =
  "rounded-md px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]";

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);

  const sync = useCallback(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: SessionInfo) => setSession(data))
      .catch(() => setSession({ authenticated: false }));
  }, []);

  useEffect(() => {
    sync();
  }, [sync, pathname]);

  const isAuthPage =
    pathname === "/" ||
    pathname === "/signup" ||
    pathname === "/admin/login" ||
    pathname === "/reset-password";

  if (isAuthPage || !session?.authenticated) {
    return null;
  }

  const isMaster = session.role === "master_admin";
  const links = isMaster
    ? adminLinks
    : canAccessInventoryNav(session.role ?? "site_member")
      ? siteAdminLinks
      : memberLinks;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ authenticated: false });
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-l border-[var(--border)] pl-2 text-xs text-[var(--muted)]">
        <span>
          {isMaster ? (
            <>
              Master{" "}
              <span className="font-medium text-[var(--foreground)]">
                {session.adminId}
              </span>
            </>
          ) : session.role === "site_admin" ? (
            <>
              Admin ·{" "}
              <span className="font-medium text-[var(--foreground)]">
                {session.siteName}
              </span>
            </>
          ) : (
            <>
              Site{" "}
              <span className="font-medium text-[var(--foreground)]">
                {session.siteName}
              </span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="rounded-md px-2 py-1 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
