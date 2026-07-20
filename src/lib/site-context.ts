import { getSession, siteWhere, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPaywallState,
  isSiteAdminRole,
  isSiteScopedRole,
  sessionBypassesPaywall,
} from "@/lib/site-access";
import { redirect } from "next/navigation";

export async function getAppSessionOrRedirect(): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

export async function getSiteScope(): Promise<{
  session: AppSession;
  siteId: number | null;
  where: { site_id?: number };
}> {
  const session = await getAppSessionOrRedirect();
  const siteId =
    isSiteScopedRole(session.role) && session.siteId != null
      ? session.siteId
      : session.role === "master_admin"
        ? null
        : null;
  return { session, siteId, where: siteWhere(siteId) };
}

export async function requireSiteSession(): Promise<{
  session: AppSession;
  siteId: number;
}> {
  const session = await getAppSessionOrRedirect();
  if (session.role === "master_admin") {
    redirect("/admin");
  }
  if (
    (session.role === "site_admin" || session.role === "site_member") &&
    session.siteId != null
  ) {
    return { session, siteId: session.siteId };
  }
  redirect("/");
}

export async function requireSiteAdminSession(): Promise<{
  session: AppSession;
  siteId: number;
}> {
  const session = await getAppSessionOrRedirect();
  if (session.role === "master_admin") {
    redirect("/admin");
  }
  if (isSiteAdminRole(session.role) && session.siteId != null) {
    return { session, siteId: session.siteId };
  }
  redirect("/dashboard/admin-login");
}

export async function requireSiteScanSession(): Promise<{
  session: AppSession;
  siteId: number;
}> {
  const { session, siteId } = await requireSiteSession();
  const paywall = await getSitePaywallForSession(session);
  if (paywall.blocked) {
    redirect("/dashboard?paywall=1");
  }
  return { session, siteId };
}

export async function getSitePaywallForSession(session: AppSession) {
  if (sessionBypassesPaywall(session)) {
    return { blocked: false as const };
  }
  if (!isSiteScopedRole(session.role) || session.siteId == null) {
    return { blocked: false as const };
  }
  const site = await prisma.site.findUnique({
    where: { id: session.siteId },
    select: {
      paywall_enabled: true,
      paywall_paid: true,
      free_trial_days: true,
      trial_started_at: true,
      created_at: true,
      is_disabled: true,
      paywall_price: true,
      billing_cycle: true,
    },
  });
  if (!site) return { blocked: true as const, reason: "disabled" as const };
  return getPaywallState(site);
}
