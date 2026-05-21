"use client";

import { BrandWordmark } from "@/components/BrandWordmark";

/** Decorative-only: shows the *shape* of a report so the hero doesn’t look like a blank card. */
function HeroReportPreview() {
  return (
    <div className="hero__visual-card">
      <div className="hero__visual-card-top">
        <div className="hero__visual-flag" aria-hidden />
        <div>
          <p className="hero__visual-card-title">What you get back</p>
          <p className="hero__visual-card-sub">Example layout—your real paste fills these rows</p>
        </div>
      </div>

      <ul className="hero__preview-list">
        <li className="hero__preview-row">
          <div className="hero__preview-row-main">
            <span className="hero__preview-label">Rent</span>
            <span className="hero__preview-value">$2,100</span>
          </div>
          <span className="hero__preview-meta">from ad</span>
        </li>
        <li className="hero__preview-row">
          <div className="hero__preview-row-main">
            <span className="hero__preview-label">Layout</span>
            <span className="hero__preview-value">2 bed · 1 bath</span>
          </div>
          <span className="hero__preview-meta">parsed</span>
        </li>
        <li className="hero__preview-row">
          <div className="hero__preview-row-main">
            <span className="hero__preview-label">Fees</span>
            <span className="hero__preview-value">Deposit + app fee</span>
          </div>
          <span className="hero__preview-meta">checklist</span>
        </li>
      </ul>

      <div className="hero__preview-tags">
        <span className="hero__preview-tag">Tour questions</span>
        <span className="hero__preview-tag">Renter checklist</span>
        <span className="hero__preview-tag">Scores</span>
      </div>

      <p className="hero__visual-footnote">Illustration only—not a live listing or your results</p>
    </div>
  );
}

export function Hero() {
  return (
    <header className="hero hero--site" aria-labelledby="hero-heading">
      <div className="hero__grid">
        <div className="hero__text-col">
          <div className="hero__brand-row">
            <BrandWordmark size="hero" />
          </div>
          <p className="hero__kicker">Clarity before you sign</p>
          <h1 id="hero-heading" className="hero__title">
            Rental listings, clearer—see{" "}
            <span className="hero__mark">
              <span className="hero__mark-text">red flags</span>
              <span className="hero__mark-bg" aria-hidden />
            </span>{" "}
            while you still have leverage.
          </h1>
          <p className="hero__lede">
            Moving is already loud: spam inboxes, broker games, ads that quietly leave out the expensive part.
            RentFlag reads what you paste and hands back facts, a renter checklist, and questions for the tour—so
            you&apos;re not improvising in the lobby.
          </p>
          <div className="hero__stats">
            <div className="hero__stat">
              <p className="hero__stat-value">Paste &amp; run</p>
              <p className="hero__stat-label">One listing at a time, no account wall for the first try</p>
            </div>
            <div className="hero__stat">
              <p className="hero__stat-value">Your text</p>
              <p className="hero__stat-label">We don&apos;t invent rent, fees, or fake &ldquo;comps&rdquo;</p>
            </div>
            <div className="hero__stat">
              <p className="hero__stat-value">Rules + AI</p>
              <p className="hero__stat-label">Pattern checks always on; model adds nuance when keys are set</p>
            </div>
          </div>
        </div>
        <div className="hero__visual" aria-hidden>
          <div className="hero__visual-float" />
          <HeroReportPreview />
        </div>
      </div>
    </header>
  );
}
