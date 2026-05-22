"use client";

import { useEffect, useState } from "react";
import { AnalysisLoadingState } from "@/components/AnalysisLoadingState";
import { Hero } from "@/components/Hero";
import { InputSection, type InputSectionValues } from "@/components/InputSection";
import { HomeAside } from "@/components/HomeAside";
import { PreAnalysisHints } from "@/components/PreAnalysisHints";
import { RenterProfileForm } from "@/components/RenterProfileForm";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { withAnalysisResultDefaults } from "@/lib/analysisResultFallbacks";
import type { AnalysisResult, RenterPreferences } from "@/lib/types";
import { defaultRenterPreferences } from "@/lib/types";

const defaultInput: InputSectionValues = {
  mode: "text",
  listingText: "",
  listingUrl: "",
  imagesBase64: [],
};

export default function HomePage() {
  const [preferences, setPreferences] = useState<RenterPreferences>(defaultRenterPreferences);
  const [input, setInput] = useState<InputSectionValues>(defaultInput);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setFormError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: input.mode,
          listingText: input.listingText,
          listingUrl: input.listingUrl,
          imagesBase64: input.imagesBase64,
          preferences,
        }),
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        setFormError("The server sent a response we could not read. Try again in a moment.");
        return;
      }
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "";
        setFormError(message || "Something went wrong.");
        return;
      }
      const normalized = withAnalysisResultDefaults(payload);
      if (!normalized) {
        setFormError("The report came back incomplete. Try again or paste more listing text.");
        return;
      }
      setResult(normalized);
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setResult(null);
    setInput(defaultInput);
    setPreferences(defaultRenterPreferences);
    setFormError(null);
  };

  /** When analysis finishes, jump to the top so the user doesn't have to scroll past the form. */
  useEffect(() => {
    if (!result) return;
    if (typeof window === "undefined") return;
    const prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduce ? "auto" : "smooth" });
  }, [result]);

  return (
    <main id="main-content" className="home-main" tabIndex={-1}>
      {!result && <Hero />}
      {!result ? (
        <>
          <div className="home-workspace">
            <div className="home-workspace__grid">
              <div className="home-workspace__main">
                <div className="home-flow">
                  <PreAnalysisHints />
                  <InputSection values={input} onChange={setInput} disabled={loading} />
                  <RenterProfileForm preferences={preferences} onChange={setPreferences} />
                  {loading && <AnalysisLoadingState />}
                </div>
                {formError && (
                  <p className="home-form-error mt-6" role="alert">
                    {formError}
                  </p>
                )}
                {!loading && (
                  <div className="home-actions mt-8">
                    <button type="button" onClick={runAnalysis} className="home-submit">
                      Run my RentFlag review
                    </button>
                  </div>
                )}
              </div>
              <HomeAside />
            </div>
          </div>

          <section className="home-promise" aria-labelledby="promise-heading">
            <div className="home-promise__inner">
              <h2 id="promise-heading" className="home-promise__heading">
                Renting is emotional. Your homework shouldn&apos;t feel like a spreadsheet someone forgot to label.
              </h2>
              <p className="home-promise__sub">
                RentFlag is built for the night you&apos;re tired, the fifteenth tab is open, and the listing suddenly
                mentions a fee you didn&apos;t see three scrolls ago. We keep the thread tied to what the ad actually
                says—then nudge you toward better questions and better next searches when the fit is weak.
              </p>
              <div className="home-promise__grid">
                <div className="home-promise__card">
                  <div className="home-promise__card-icon" aria-hidden>
                    1
                  </div>
                  <h3 className="home-promise__card-title">Bring the messy ad</h3>
                  <p className="home-promise__card-text">
                    Text, link plus paste, or screenshots alongside notes—whatever matches how you found the place.
                  </p>
                </div>
                <div className="home-promise__card">
                  <div className="home-promise__card-icon" aria-hidden>
                    2
                  </div>
                  <h3 className="home-promise__card-title">Tune your profile</h3>
                  <p className="home-promise__card-text">
                    Optional budget and must-haves sharpen the budget read and the &ldquo;where to look instead&rdquo;
                    ideas when AI is on—never a verdict on whether you should apply.
                  </p>
                </div>
                <div className="home-promise__card">
                  <div className="home-promise__card-icon" aria-hidden>
                    3
                  </div>
                  <h3 className="home-promise__card-title">Walk in with lines ready</h3>
                  <p className="home-promise__card-text">
                    Copy tour questions, download a plain-text memo, and keep the checklist for anything that felt
                    vague in the ad.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="home-site-footer">
            <p className="home-site-footer__line">
              <span className="home-site-footer__flag">RentFlag</span> is a renter-side signal finder—not legal or
              financial advice. Always verify dollars and policies with the landlord or office.
            </p>
          </footer>
        </>
      ) : (
        <div className={`home-stack home-stack--results home-stack--padded`}>
          <ResultsDashboard result={result} onReset={resetAll} />
        </div>
      )}
    </main>
  );
}
