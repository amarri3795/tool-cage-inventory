import { BADGE_HEADER, SESSION_KEY } from "@/lib/admin-constants";
import { getAdminSettings } from "@/lib/settings";

export { BADGE_HEADER, SESSION_KEY };

export function normalizeBadgeId(raw: string): string {
  const s = raw.trim();
  const m = s.match(/%(\d+)\s*$/);
  if (m) return m[1];
  return s;
}

export function extractBadgeId(request: Request): string | null {
  const header = request.headers.get(BADGE_HEADER);
  if (header?.trim()) return normalizeBadgeId(header);

  const url = new URL(request.url);
  const query = url.searchParams.get("badge");
  if (query?.trim()) return normalizeBadgeId(query);

  return null;
}

export function isDevBypassEnabled(): boolean {
  return (
    process.env.ADMIN_DEV_BYPASS === "1" ||
    process.env.ADMIN_DEV_BYPASS === "true" ||
    (process.env.NODE_ENV === "development" &&
      process.env.ADMIN_DEV_BYPASS !== "0")
  );
}

export async function isAdminBadge(badgeId: string | null): Promise<boolean> {
  if (!badgeId) return false;
  const normalized = normalizeBadgeId(badgeId);

  if (isDevBypassEnabled() && (normalized === "dev" || normalized === "bypass")) {
    return true;
  }

  const settings = await getAdminSettings();
  return settings.admin_badge_ids
    .map(normalizeBadgeId)
    .includes(normalized);
}

export async function requireAdmin(
  request: Request,
): Promise<{ ok: true; badgeId: string } | { ok: false; response: Response }> {
  const badgeId = extractBadgeId(request);

  if (!badgeId) {
    return {
      ok: false,
      response: Response.json(
        {
          success: false,
          error:
            "Admin badge required. Send x-badge-id header or ?badge= query.",
        },
        { status: 401 },
      ),
    };
  }

  const allowed = await isAdminBadge(badgeId);
  if (!allowed) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "Badge is not authorized for admin access." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, badgeId };
}
