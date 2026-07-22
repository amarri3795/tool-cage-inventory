import Link from "next/link";
import "../preview.css";

export const dynamic = "force-static";

/**
 * Design preview — redesigned landing with clear glass + logo backdrop.
 * Open /preview/landing
 */
export default function LandingPreviewPage() {
  return (
    <div className="preview-shell preview-landing">
      <div className="preview-logo-backdrop" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/opsflow-logo.png" alt="" />
      </div>

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
            Operations,
            <br />
            from one screen.
          </h1>
          <p className="preview-landing-copy">
            Inventory, check-outs, and stock across every site — clear enough
            for the floor, strong enough for the office.
          </p>
          <ul className="preview-landing-points">
            <li>Presets for check-out, inventory, or both</li>
            <li>Badge scan when you need it</li>
            <li>Site admin + master control</li>
          </ul>
        </section>

        <section className="preview-glass preview-landing-card">
          <p className="preview-eyebrow">Site login</p>
          <h2 className="preview-landing-card-title">Enter your site</h2>
          <p className="preview-sub">
            Same core fields — site name, password, remember me — in clear glass
            over the brand.
          </p>

          <div className="preview-landing-form">
            <label className="preview-field">
              Site name
              <input className="preview-input" placeholder="YourSite" readOnly />
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
            <span>New site? Sign up</span>
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
