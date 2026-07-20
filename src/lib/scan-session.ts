import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPaywallState,
  isSiteScopedRole,
  sessionBypassesPaywall,
} from "@/lib/site-access";

export async function requireSiteScanAccess(): Promise<
  | { ok: true; siteId: number }
  | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session || !isSiteScopedRole(session.role) || session.siteId == null) {
    return { ok: false, status: 401, error: "Site login required." };
  }

  const site = await prisma.site.findUnique({
    where: { id: session.siteId },
    select: {
      id: true,
      is_disabled: true,
      paywall_enabled: true,
      paywall_paid: true,
      free_trial_days: true,
      trial_started_at: true,
      created_at: true,
    },
  });
  if (!site) {
    return { ok: false, status: 401, error: "Site not found." };
  }
  if (site.is_disabled) {
    return {
      ok: false,
      status: 403,
      error: "This site is temporarily disabled.",
    };
  }
  if (!sessionBypassesPaywall(session)) {
    const paywall = getPaywallState(site);
    if (paywall.blocked) {
      return {
        ok: false,
        status: 402,
        error: paywall.message ?? "Subscription required.",
      };
    }
  }

  return { ok: true, siteId: session.siteId };
}
