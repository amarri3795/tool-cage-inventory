import { getSession, siteWhere, type AppSession } from "@/lib/auth";
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
    session.role === "site" && session.siteId != null ? session.siteId : null;
  return { session, siteId, where: siteWhere(siteId) };
}

export async function requireSiteSession(): Promise<{
  session: AppSession;
  siteId: number;
}> {
  const session = await getAppSessionOrRedirect();
  if (session.role === "master_admin") {
    // Master uses Admin Dashboard; site pages need an explicit site context later.
    // For inventory CRUD, master may pass without site — redirect to admin.
    redirect("/admin");
  }
  if (session.siteId == null) redirect("/");
  return { session, siteId: session.siteId };
}
