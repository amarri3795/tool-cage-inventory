import type { AppSession, SessionRole } from "@/lib/auth";

export const SITE_MEMBER_PATHS = ["/dashboard", "/scan"] as const;

export const SITE_ADMIN_PATHS = [
  "/tools",
  "/materials",
  "/employees",
  "/transactions",
  "/reports",
  "/site-settings",
] as const;

export function isSiteMemberRole(role: SessionRole): boolean {
  return role === "site_member";
}

export function isSiteAdminRole(role: SessionRole): boolean {
  return role === "site_admin";
}

export function isSiteScopedRole(role: SessionRole): boolean {
  return role === "site_member" || role === "site_admin";
}

export function canAccessInventoryNav(role: SessionRole): boolean {
  return role === "master_admin" || role === "site_admin";
}

export function pathnameRequiresSiteAdmin(pathname: string): boolean {
  return SITE_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function pathnameIsSiteMemberOnly(pathname: string): boolean {
  if (pathname === "/dashboard/admin-login") return true;
  return SITE_MEMBER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export type PaywallState = {
  blocked: boolean;
  reason?: "paywall" | "disabled";
  message?: string;
};

type PaywallSiteFields = {
  paywall_enabled: boolean;
  paywall_paid: boolean;
  free_trial_days: number;
  trial_started_at: Date | null;
  created_at: Date;
  is_disabled: boolean;
};

export function getPaywallState(site: PaywallSiteFields): PaywallState {
  if (site.is_disabled) {
    return {
      blocked: true,
      reason: "disabled",
      message: "This site has been temporarily disabled. Contact your administrator.",
    };
  }
  if (!site.paywall_enabled || site.paywall_paid) {
    return { blocked: false };
  }
  const trialStart = site.trial_started_at ?? site.created_at;
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + site.free_trial_days);
  if (new Date() < trialEnd) {
    return { blocked: false };
  }
  return {
    blocked: true,
    reason: "paywall",
    message:
      "Subscription required. Contact your master administrator to enable billing or mark this site as paid.",
  };
}

export function sessionBypassesPaywall(session: AppSession): boolean {
  return session.role === "master_admin" || session.role === "site_admin";
}
