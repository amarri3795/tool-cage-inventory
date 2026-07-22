import Link from "next/link";
import "../preview.css";

export const dynamic = "force-static";

/**
 * Design preview — clear glass over logo backdrop.
 * Open /preview/glass
 */
export default function GlassPreviewPage() {
  return (
    <div className="preview-shell">
      <div className="preview-logo-backdrop" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/opsflow-logo.png" alt="" />
      </div>

      <div className="preview-frame">
        <header className="preview-glass preview-header">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/opsflow-logo.png" alt="" className="h-7 w-auto" />
            <span className="text-base font-semibold tracking-tight">OpsFlow</span>
          </div>
          <nav className="preview-nav">
            <span className="preview-nav-active">Dashboard</span>
            <span>Scan</span>
            <span>Items</span>
          </nav>
        </header>

        <main className="preview-main">
          <p className="preview-eyebrow">Preview · Clear glass</p>
          <h1 className="preview-title">See-through panels</h1>
          <p className="preview-sub">
            Logo sits large in the background. Panels are clear glass — light tint,
            thin edge, light blur — so the mark shows through.
          </p>

          <section className="preview-stat-grid">
            {[
              { label: "On hand", value: "1,284" },
              { label: "Low stock", value: "12" },
              { label: "SKUs", value: "41" },
            ].map((s) => (
              <div key={s.label} className="preview-glass preview-stat">
                <p className="preview-stat-label">{s.label}</p>
                <p className="preview-stat-value">{s.value}</p>
              </div>
            ))}
          </section>

          <section className="preview-glass preview-panel">
            <h2 className="preview-panel-title">Stock needing attention</h2>
            <ul className="preview-list">
              <li>
                <span>Gloves — L</span>
                <span className="preview-warn">4 left</span>
              </li>
              <li>
                <span>Zip ties</span>
                <span className="preview-warn">18 left</span>
              </li>
              <li>
                <span>Safety glasses</span>
                <span>OK</span>
              </li>
            </ul>
            <button type="button" className="preview-btn">
              Add stock
            </button>
          </section>

          <p className="preview-links">
            <Link href="/preview/landing">Landing preview</Link>
            <Link href="/">Back to live login</Link>
          </p>
        </main>
      </div>
    </div>
  );
}
