"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SessionInfo = {
  authenticated: boolean;
  role?: "master_admin" | "site";
  adminId?: string | null;
  siteName?: string | null;
};

const siteLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scan", label: "Scan" },
  { href: "/tools", label: "Tools" },
  { href: "/materials", label: "Materials" },
  { href: "/employees", label: "Employees" },
  { href: "/transactions", label: "Transactions" },
] as const;

const adminLinks = [{ href: "/admin", label: "Admin Dashboard" }] as const;

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
    pathname === "/admin/login";

  if (isAuthPage || !session?.authenticated) {
    return null;
  }

  const isAdmin = session.role === "master_admin";
  const links = isAdmin ? adminLinks : siteLinks;

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
          {isAdmin ? (
            <>
              Master{" "}
              <span className="font-medium text-[var(--foreground)]">
                {session.adminId}
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
