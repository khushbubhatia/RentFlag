"use client";

type BrandWordmarkProps = {
  /** Extra-large hero treatment */
  size?: "default" | "hero";
  className?: string;
};

export function BrandWordmark({ size = "default", className = "" }: BrandWordmarkProps) {
  const isHero = size === "hero";

  return (
    <div className={`brand-wordmark${isHero ? " brand-wordmark--hero" : ""} ${className}`.trim()}>
      <div
        className={`brand-wordmark__icon ${isHero ? "brand-wordmark__icon--hero" : "brand-wordmark__icon--default"}`}
        aria-hidden
      >
        <span className="brand-wordmark__icon-shine" />
        <svg
          viewBox="0 0 24 32"
          className={`brand-wordmark__svg ${isHero ? "brand-wordmark__svg--hero" : "brand-wordmark__svg--default"}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11 3v26"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="brand-wordmark__svg-pole"
          />
          <path
            d="M11 5h11l-3.5 5.5L19 16l-8-1V5z"
            fill="white"
            className="brand-wordmark__svg-fill"
          />
        </svg>
      </div>
      <div className="brand-wordmark__text-col">
        <p
          className={`brand-wordmark__title ${isHero ? "brand-wordmark__title--hero" : "brand-wordmark__title--default"}`}
        >
          <span className="brand-wordmark__rent">Rent</span>
          <span className="brand-wordmark__dot" aria-hidden>
            ·
          </span>
          <span className="brand-wordmark__flag">Flag</span>
        </p>
        {isHero && (
          <p className="brand-wordmark__tagline-hero">Red-flag instincts, rental-real answers.</p>
        )}
        {!isHero && (
          <p className="brand-wordmark__tagline-compact">Checklist help for your next lease</p>
        )}
      </div>
    </div>
  );
}
