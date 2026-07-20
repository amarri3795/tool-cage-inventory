import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = {
  is_disabled?: boolean;
  paywall_enabled?: boolean;
  paywall_price?: number;
  billing_cycle?: string;
  free_trial_days?: number;
  free_trial_preset?: string | null;
  paywall_paid?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireMasterAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { id: idRaw } = await context.params;
  const siteId = Number(idRaw);
  if (!Number.isFinite(siteId)) {
    return NextResponse.json(
      { success: false, error: "Invalid site id." },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const existing = await prisma.site.findUnique({ where: { id: siteId } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Site not found." },
      { status: 404 },
    );
  }

  const paywall_enabled = body.paywall_enabled ?? existing.paywall_enabled;
  const trial_started_at =
    paywall_enabled && !existing.paywall_enabled && !existing.trial_started_at
      ? new Date()
      : existing.trial_started_at;

  const site = await prisma.site.update({
    where: { id: siteId },
    data: {
      is_disabled: body.is_disabled ?? existing.is_disabled,
      paywall_enabled,
      paywall_price:
        body.paywall_price != null ? body.paywall_price : existing.paywall_price,
      billing_cycle: body.billing_cycle ?? existing.billing_cycle,
      free_trial_days: body.free_trial_days ?? existing.free_trial_days,
      free_trial_preset:
        body.free_trial_preset !== undefined
          ? body.free_trial_preset
          : existing.free_trial_preset,
      paywall_paid: body.paywall_paid ?? existing.paywall_paid,
      trial_started_at,
    },
  });

  return NextResponse.json({
    success: true,
    site: { ...site, paywall_price: Number(site.paywall_price) },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireMasterAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { id: idRaw } = await context.params;
  const siteId = Number(idRaw);
  if (!Number.isFinite(siteId)) {
    return NextResponse.json(
      { success: false, error: "Invalid site id." },
      { status: 400 },
    );
  }

  await prisma.site.delete({ where: { id: siteId } });
  return NextResponse.json({ success: true });
}
