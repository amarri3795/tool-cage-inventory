import { ScanForm } from "./scan-form";
import {
  getAppSessionOrRedirect,
  getSitePaywallForSession,
} from "@/lib/site-context";
import { getSiteLabels } from "@/lib/site-labels";
import {
  getSitePreset,
  scanFeaturesForPreset,
} from "@/lib/site-presets";
import Link from "next/link";

export default async function ScanPage() {
  const session = await getAppSessionOrRedirect();
  const paywall = await getSitePaywallForSession(session);
  const siteId =
    session.role === "site_member" || session.role === "site_admin"
      ? session.siteId
      : null;
  const labels = await getSiteLabels(siteId);
  const features = scanFeaturesForPreset(await getSitePreset(siteId));

  if (paywall.blocked) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{labels.scan}</h1>
        <p className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-4 py-3 text-sm">
          {paywall.message ??
            "Scanning is unavailable until subscription is active."}{" "}
          <Link
            href="/dashboard"
            className="text-[var(--accent)] hover:underline"
          >
            Return to {labels.dashboard.toLowerCase()}
          </Link>
        </p>
      </div>
    );
  }

  const helpText = features.allowToolCheckout
    ? `Look up a badge and a TL-/MAT- item, review details, then submit check-out, check-in, issue, or receive.`
    : `Look up a badge and a MAT- stock ID, then issue or receive quantity. Equipment check-out is hidden for this site preset.`;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{labels.scan}</h1>
      <p className="mt-2 mb-6 text-sm text-[var(--muted)]">{helpText}</p>
      <ScanForm
        allowToolCheckout={features.allowToolCheckout}
        allowMaterialTake={features.allowMaterialTake}
      />
    </div>
  );
}
