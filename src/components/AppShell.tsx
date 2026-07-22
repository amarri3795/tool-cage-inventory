"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/AppNav";

const AUTH_PATHS = new Set([
  "/",
  "/signup",
  "/admin/login",
  "/reset-password",
]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth =
    AUTH_PATHS.has(pathname) || pathname.startsWith("/preview");

  if (isAuth) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/opsflow-logo.png" alt="" className="h-8 w-auto" />
            <span>OpsFlow</span>
          </Link>
          <AppNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
