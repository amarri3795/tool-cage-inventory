import Link from "next/link";
import "../preview.css";

export const dynamic = "force-static";

/**
 * Design preview only — redesigned landing with glass UI.
 * Open /preview/landing before replacing production `/`.
 */
export default function LandingPreviewPage() {
  return (
    <div className="preview-shell preview-landing">
      <div className="preview-landing-bg" aria-hidden />

      <div className="preview-landing-layout">
        <section className="preview-landing-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/opsflow-logo.png"
            alt="OpsFlow"
            className="preview-landing-logo"
          />
          <p className="preview-eyebrow">OpsFlow</p>
          <h1 className="preview-landing-headline">
            Run the cage.
            <br />
            From one screen.
          </h1>
          <p className="preview-landing-copy">
            Multi-site inventory, scan check-out, and stock tracking for plants
            that need clarity — not another spreadsheet.
          </p>
          <ul className="preview-landing-points">
            <li>Equipment check-out or inventory presets</li>
            <li>Badge scan on the floor</li>
            <li>Site admin + master control</li>
          </ul>
        </section>

        <section className="preview-glass preview-landing-card">
          <p className="preview-eyebrow">Site login</p>
          <h2 className="preview-landing-card-title">Enter your plant</h2>
          <p className="preview-sub">
            Same core fields as today — plant name, password, remember me —
            in a glass panel.
          </p>

          <div className="preview-landing-form">
            <label className="preview-field">
              Plant name
              <input className="preview-input" placeholder="YourPlant" readOnly />
            </label>
            <label className="preview-field">
              Site password
              <input
                className="preview-input"
                type="password"
                placeholder="••••••••"
                readOnly
              />
            </label>
            <label className="preview-remember">
              <input type="checkbox" disabled /> Remember me
            </label>
            <button type="button" className="preview-btn preview-btn-block">
              Sign in
            </button>
          </div>

          <div className="preview-landing-card-links">
            <span>New plant? Sign up</span>
            <span>Reset password</span>
            <span>Admin login</span>
          </div>
        </section>
      </div>

      <p className="preview-links preview-links-center">
        <Link href="/preview/glass">Glass UI preview</Link>
        <Link href="/">Back to live login</Link>
      </p>
    </div>
  );
}
