import { NextResponse } from "next/server";
import { isAdminBadge, normalizeBadgeId } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Validate a badge against admin_badge_ids (or dev bypass). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const badgeRaw =
    body && typeof body === "object" && "badgeId" in body
      ? String((body as { badgeId: unknown }).badgeId ?? "")
      : "";

  const badgeId = normalizeBadgeId(badgeRaw);
  if (!badgeId) {
    return NextResponse.json(
      { success: false, error: "Badge ID is required" },
      { status: 400 },
    );
  }

  const allowed = await isAdminBadge(badgeId);
  if (!allowed) {
    return NextResponse.json(
      { success: false, authorized: false, error: "Not an admin badge" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    success: true,
    authorized: true,
    badgeId,
  });
}
