import { NextResponse } from "next/server";
import {
  generateResetToken,
  hashResetToken,
  normalizeSiteName,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Stub reset flow: validates site + email, stores token for master/admin follow-up. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const siteName = normalizeSiteName(String(body.siteName ?? ""));
  const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();

  if (!siteName || !contactEmail) {
    return NextResponse.json(
      { success: false, error: "Site name and contact email are required." },
      { status: 400 },
    );
  }

  const site = await prisma.site.findUnique({ where: { name: siteName } });
  const genericMessage =
    "If the site and email match our records, your request was recorded. Contact your master administrator to complete the reset.";

  if (!site || site.contact_email.trim().toLowerCase() !== contactEmail) {
    return NextResponse.json({ success: true, message: genericMessage });
  }

  const token = generateResetToken();
  const token_hash = hashResetToken(token);
  const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.passwordResetToken.create({
    data: { site_id: site.id, token_hash, expires_at },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[password-reset] site=${site.name} token=${token} (dev only — share via master admin tools)`,
    );
  }

  return NextResponse.json({ success: true, message: genericMessage });
}
