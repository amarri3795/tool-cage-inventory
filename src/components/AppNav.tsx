"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_AUTH_EVENT,
  clearStoredBadge,
  getStoredBadge,
} from "@/components/admin/admin-api";

const publicLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scan", label: "Scan" },
  { href: "/admin", label: "Admin" },
] as const;

const adminOnlyLinks = [
  { href: "/tools", label: "Tools" },
  { href: "/materials", label: "Materials" },
  { href: "/employees", label: "Employees" },
  { href: "/transactions", label: "Transactions" },
] as const;

const linkClassName =
  "rounded-md px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]";

export function AppNav() {
  const [badgeId, setBadgeId] = useState<string | null>(null);

  const sync = useCallback(() => {
    setBadgeId(getStoredBadge());
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

  const isAdmin = Boolean(badgeId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {publicLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        ))}
        {isAdmin
          ? adminOnlyLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClassName}>
                {link.label}
              </Link>
            ))
          : null}
      </nav>
      {isAdmin ? (
        <div className="flex items-center gap-2 border-l border-[var(--border)] pl-2 text-xs text-[var(--muted)]">
          <span>
            Admin <span className="font-medium text-[var(--foreground)]">{badgeId}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              clearStoredBadge();
              setBadgeId(null);
            }}
            className="rounded-md px-2 py-1 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
