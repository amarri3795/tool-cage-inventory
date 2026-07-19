import { getSession } from "@/lib/auth";

/**
 * Server-side guard for /api/admin/* routes.
 * Cookie session must be master_admin (middleware also enforces this).
 */
export async function requireAdmin(
  _request?: Request,
): Promise<{ ok: true; badgeId: string } | { ok: false; response: Response }> {
  const session = await getSession();
  if (!session || session.role !== "master_admin" || !session.adminId) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "Master admin login required." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, badgeId: session.adminId };
}

/** @deprecated Badge-based admin access removed. */
export async function isAdminBadge(_badgeId: string | null): Promise<boolean> {
  return false;
}

export function normalizeBadgeId(raw: string): string {
  const s = raw.trim();
  const m = s.match(/%(\d+)\s*$/);
  if (m) return m[1];
  return s;
}

export function extractBadgeId(request: Request): string | null {
  const header = request.headers.get("x-badge-id");
  if (header?.trim()) return normalizeBadgeId(header);
  const url = new URL(request.url);
  const query = url.searchParams.get("badge");
  if (query?.trim()) return normalizeBadgeId(query);
  return null;
}
