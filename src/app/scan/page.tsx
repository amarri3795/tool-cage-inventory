import { ScanForm } from "./scan-form";

export default function ScanPage() {
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
