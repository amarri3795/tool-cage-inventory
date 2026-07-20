import { Suspense } from "react";
import { requireSiteAdminSession } from "@/lib/site-context";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SiteSettingsPanel } from "@/components/site-settings/SiteSettingsPanel";

export default async function SiteSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role === "site_member") redirect("/dashboard/admin-login");
  if (session.role === "master_admin") {
    // Master uses panel with site picker
  } else {
    await requireSiteAdminSession();
  }

  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <SiteSettingsPanel />
    </Suspense>
  );
}
