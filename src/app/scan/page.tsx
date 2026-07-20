import { ScanForm } from "./scan-form";
import { getAppSessionOrRedirect, getSitePaywallForSession } from "@/lib/site-context";
import Link from "next/link";

export default async function ScanPage() {
  const session = await getAppSessionOrRedirect();
  const paywall = await getSitePaywallForSession(session);

  if (paywall.blocked) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Scan</h1>
        <p className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-4 py-3 text-sm">
          {paywall.message ?? "Scanning is unavailable until subscription is active."}{" "}
          <Link href="/dashboard" className="text-[var(--accent)] hover:underline">
            Return to dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Scan</h1>
      <p className="mt-2 mb-6 text-sm text-[var(--muted)]">
        Look up a badge and a TL-/MAT- item, review details, then submit
        check-out, check-in, issue, or receive.
      </p>
      <ScanForm />
    </div>
  );
}
