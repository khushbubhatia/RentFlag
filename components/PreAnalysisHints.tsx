"use client";

export function PreAnalysisHints() {
  return (
    <aside className="pre-analysis" aria-label="What this review includes">
      <div className="pre-analysis__inner">
        <p className="pre-analysis__lead">What you&apos;ll get</p>
        <p className="pre-analysis__items">
          <span className="pre-analysis__kw">Facts</span>
          <span className="pre-analysis__sep" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <span className="pre-analysis__kw">a renter checklist</span>
          <span className="pre-analysis__sep" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <span className="pre-analysis__kw">tour-ready questions</span>
        </p>
      </div>
    </aside>
  );
}
