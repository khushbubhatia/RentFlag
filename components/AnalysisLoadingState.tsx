"use client";

const STEPS = [
  { label: "Reading your paste", detail: "Pulling numbers and phrases we can tie to fields." },
  { label: "Running checklist rules", detail: "Same inputs always hit the same deterministic checks." },
  { label: "Optional model pass", detail: "If a key is configured, we add question ideas—never replace the rules." },
] as const;

export function AnalysisLoadingState() {
  return (
    <section className="analysis-loading" aria-busy="true" aria-live="polite">
      <div className="analysis-loading__blob" aria-hidden />
      <div className="analysis-loading__top">
        <div>
          <h2 className="analysis-loading__title">Building your RentFlag report</h2>
          <p className="analysis-loading__text">
            This usually takes a few seconds. We separate what the text actually says from what still needs a
            landlord answer.
          </p>
        </div>
        <div className="analysis-loading__spinner" />
      </div>
      <ol className="analysis-loading__list">
        {STEPS.map((step, index) => (
          <li key={step.label} className="analysis-loading__item">
            <span className="analysis-loading__step-num">{index + 1}</span>
            <div>
              <p className="analysis-loading__step-title">{step.label}</p>
              <p className="analysis-loading__step-detail">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
