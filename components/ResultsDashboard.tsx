"use client";

import { useState } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import {
  formatConcernOrigin,
  formatConcernPriority,
  formatConfidenceLabel,
  formatCurrency,
  formatFitAssessment,
} from "@/lib/display";
import type {
  AnalysisResult,
  ConfidenceLevel,
  ExtractedListing,
  FieldWithConfidence,
} from "@/lib/types";

function isPoorFitRead(result: AnalysisResult): boolean {
  return (
    result.overallRecommendation !== "good_fit" ||
    (result.redFlags ?? []).some((r) => r.severity === "high") ||
    (result.budgetFitPersonalized && result.scores.affordabilityScore < 48)
  );
}

function pickField<T>(field: FieldWithConfidence<T> | undefined): FieldWithConfidence<T> {
  return field ?? { value: null, confidence: "not_found" };
}

function resultsReadSurfaceClass(tone: "positive" | "caution" | "verify") {
  if (tone === "positive") return "results-read results-read--positive";
  if (tone === "caution") return "results-read results-read--caution";
  return "results-read results-read--verify";
}

function concernRowClass(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "high":
      return "results-concern results-concern--high";
    case "medium":
      return "results-concern results-concern--medium";
    case "low":
    default:
      return "results-concern results-concern--low";
  }
}

function FactRow({
  label,
  field,
  format,
}: {
  label: string;
  field: { value: unknown; confidence: ConfidenceLevel };
  format?: (value: unknown) => string;
}) {
  const display =
    field.value === null || field.value === undefined || field.value === ""
      ? "Not in text"
      : format
        ? format(field.value)
        : Array.isArray(field.value)
          ? field.value.join(", ")
          : String(field.value);

  return (
    <div className="results-fact-row">
      <div className="results-fact-row__main">
        <p className="results-fact-row__label">{label}</p>
        <p className="results-fact-row__value">{display}</p>
      </div>
      <p className="results-fact-row__conf">{formatConfidenceLabel(field.confidence)}</p>
    </div>
  );
}

function KeyFactsChips({ extracted }: { extracted: ExtractedListing }) {
  const chips: string[] = [];
  const rent = extracted.monthlyRent?.value;
  if (rent != null) chips.push(formatCurrency(rent));
  const beds = extracted.bedrooms?.value;
  const baths = extracted.bathrooms?.value;
  if (beds != null || baths != null) chips.push(`${beds ?? "?"} bed · ${baths ?? "?"} bath`);
  const loc = extracted.locationMention?.value;
  if (typeof loc === "string" && loc.trim()) chips.push(loc.trim().slice(0, 52) + (loc.length > 52 ? "…" : ""));

  if (chips.length === 0) return null;
  return (
    <div className="results-glance__chips" aria-label="Key facts from your paste">
      {chips.map((c) => (
        <span key={c} className="results-glance__chip">
          {c}
        </span>
      ))}
    </div>
  );
}

function CompactScorePill({ value, label }: { value: number; label: string }) {
  return (
    <div className="results-score-pill">
      <span className="results-score-pill__value">{value}</span>
      <span className="results-score-pill__label">{label}</span>
    </div>
  );
}

function BudgetPlaceholderPill() {
  return (
    <div className="results-score-pill results-score-pill--placeholder" aria-label="Budget fit not personalized">
      <span className="results-score-pill__value results-score-pill__value--muted" aria-hidden>
        —
      </span>
      <span className="results-score-pill__label">Budget fit · add budget to see</span>
    </div>
  );
}

function buildPlainTextExport(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push("RentFlag — listing review");
  lines.push("");
  lines.push("Summary");
  (result.summaryLines ?? []).forEach((line) => lines.push(`• ${line}`));
  lines.push("");
  lines.push("Scores (0–100)");
  lines.push(`Disclosure completeness: ${result.scores.transparencyScore}`);
  if (result.budgetFitPersonalized) {
    lines.push(`Budget fit: ${result.scores.affordabilityScore}`);
  } else {
    lines.push(`Budget fit: not personalized (no budget or take-home entered)`);
  }
  lines.push(`Verification load (higher → more follow-up): ${result.scores.riskScore}`);
  lines.push("");
  lines.push("Tour questions");
  (result.questionsToAsk ?? []).forEach((question, index) => lines.push(`${index + 1}. ${question}`));
  lines.push("");
  lines.push("Checklist from listing patterns");
  (result.redFlags ?? []).forEach((item) => {
    lines.push(`[${item.severity}] ${item.title}: ${item.explanation}`);
  });
  if (result.alternativeMatchIdeas?.length) {
    lines.push("");
    lines.push("AI-suggested search directions (not real listings)");
    if (result.alternativeMatchesIntro) {
      lines.push(result.alternativeMatchesIntro);
    }
    result.alternativeMatchIdeas.forEach((idea, index) => {
      lines.push(`${index + 1}. ${idea.headline} — ${idea.neighborhoodOrArea}`);
      lines.push(`   ${idea.whyFitsBetter}`);
      idea.searchTips.forEach((tip) => lines.push(`   · ${tip}`));
    });
  }
  return lines.join("\n");
}

const SUMMARY_PREVIEW = 2;
const CONCERN_PREVIEW = 2;
const QUESTIONS_PREVIEW = 5;

export function ResultsDashboard({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset?: () => void;
}) {
  const [showAllConcerns, setShowAllConcerns] = useState(false);

  const assessment = formatFitAssessment(result.overallRecommendation);

  const copyQuestions = async () => {
    const text = result.questionsToAsk.map((question, index) => `${index + 1}. ${question}`).join("\n");
    await navigator.clipboard.writeText(text);
  };

  const downloadSummary = () => {
    const blob = new Blob([buildPlainTextExport(result)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rentflag-review.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const extracted = result.extractedListing;
  const summaryLines = result.summaryLines ?? [];
  const summaryPreview = summaryLines.slice(0, SUMMARY_PREVIEW);
  const summaryExtra = summaryLines.length - SUMMARY_PREVIEW;

  const flags = result.redFlags ?? [];
  const concernPreview = showAllConcerns ? flags : flags.slice(0, CONCERN_PREVIEW);
  const concernExtra = flags.length - CONCERN_PREVIEW;

  const questions = result.questionsToAsk ?? [];
  const questionsPreview = questions.slice(0, QUESTIONS_PREVIEW);
  const questionsExtra = questions.length - QUESTIONS_PREVIEW;

  const bedBathDisplay =
    (extracted.bedrooms?.value ?? null) !== null || (extracted.bathrooms?.value ?? null) !== null
      ? `${extracted.bedrooms?.value ?? "?"} bed · ${extracted.bathrooms?.value ?? "?"} bath`
      : null;
  const bedBathConfidence: ConfidenceLevel =
    extracted.bedrooms?.confidence !== "not_found" || extracted.bathrooms?.confidence !== "not_found"
      ? "medium"
      : "not_found";

  const hasMoreNotes =
    (result.interpretiveNotes?.length ?? 0) > 0 ||
    Boolean(result.aiError) ||
    Boolean(result.listingSourceNote) ||
    Boolean(result.imageAnalysisNote);

  return (
    <div className="results">
      <div className="results__topbar">
        <BrandWordmark />
        {onReset && (
          <button type="button" onClick={onReset} className="results__reset">
            ← New listing
          </button>
        )}
      </div>

      <div className={resultsReadSurfaceClass(assessment.tone)}>
        <div className="results-glance">
          <p className="results-read__eyebrow">At a glance</p>
          <h2 className="results-read__title results-read__title--compact">{assessment.title}</h2>
          <KeyFactsChips extracted={extracted} />

          <div className="results-glance__scores">
            <CompactScorePill value={result.scores.transparencyScore} label="Disclosure" />
            {result.budgetFitPersonalized ? (
              <CompactScorePill value={result.scores.affordabilityScore} label="Budget fit" />
            ) : (
              <BudgetPlaceholderPill />
            )}
            <CompactScorePill value={result.scores.riskScore} label="Verify load" />
          </div>

          {summaryPreview.length > 0 && (
            <ul className="results-glance__summary">
              {summaryPreview.map((line, index) => (
                <li key={`${index}-${line.slice(0, 48)}`} className="results-read__summary-item">
                  <span className="results-read__bullet">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="results-glance__actions">
            <button type="button" onClick={copyQuestions} className="results-read__btn-primary">
              Copy all tour questions
            </button>
            <button type="button" onClick={downloadSummary} className="results-read__btn-secondary">
              Download full report
            </button>
          </div>
        </div>

        {(summaryExtra > 0 || hasMoreNotes) && (
          <details className="results-disclosure">
            <summary className="results-disclosure__summary">More on this read</summary>
            <div className="results-disclosure__body">
              <p className="results-disclosure__lede">{assessment.description}</p>
              {summaryExtra > 0 && (
                <ul className="results-read__summary">
                  {summaryLines.slice(SUMMARY_PREVIEW).map((line, index) => (
                    <li key={`extra-${index}-${line.slice(0, 40)}`} className="results-read__summary-item">
                      <span className="results-read__bullet">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
              {result.interpretiveNotes && result.interpretiveNotes.length > 0 && (
                <div className="results-read__notes results-read__notes--tight">
                  <p className="results-read__notes-title">Model notes (not facts)</p>
                  <ul className="results-read__notes-list">
                    {result.interpretiveNotes.map((note) => (
                      <li key={note.slice(0, 60)}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.aiError && (
                <p className="results-read__ai-error">
                  Model assist didn&apos;t finish ({result.aiError}). Rules still drove this report.
                </p>
              )}
              {result.listingSourceNote && (
                <p className="results-read__source">
                  <span className="results-read__source-prefix">Source · </span>
                  {result.listingSourceNote}
                </p>
              )}
              {result.imageAnalysisNote && <p className="results-read__image-note">{result.imageAnalysisNote}</p>}
              <p className="results-disclosure__hint">
                Full fact table &amp; checklist below—open only what you need.
              </p>
            </div>
          </details>
        )}

        {summaryExtra <= 0 && !hasMoreNotes && (
          <p className="results-read__desc results-read__desc--compact">{assessment.description}</p>
        )}

        <details className="results-disclosure">
          <summary className="results-disclosure__summary">What the three scores mean</summary>
          <div className="results-disclosure__body results-disclosure__body--columns">
            <div>
              <p className="results-score-caption-h">{result.scoreCaptions.transparency.heading}</p>
              <p className="results-score-caption-b">{result.scoreCaptions.transparency.body}</p>
            </div>
            <div>
              <p className="results-score-caption-h">{result.scoreCaptions.budgetFit.heading}</p>
              <p className="results-score-caption-b">
                {result.budgetFitPersonalized
                  ? result.scoreCaptions.budgetFit.body
                  : "Hidden until you enter a max budget or take-home pay in your renter profile—without those, any number here would be a generic guess."}
              </p>
            </div>
            <div>
              <p className="results-score-caption-h">{result.scoreCaptions.verificationLoad.heading}</p>
              <p className="results-score-caption-b">{result.scoreCaptions.verificationLoad.body}</p>
            </div>
          </div>
        </details>
      </div>

      <section className="results-concerns results-concerns--compact" aria-labelledby="concerns-heading">
        <h3 id="concerns-heading" className="results-concerns__title">
          Checklist{flags.length > 0 ? ` · ${flags.length} item${flags.length === 1 ? "" : "s"}` : ""}
        </h3>
        {flags.length === 0 ? (
          <p className="results-concerns__empty">Nothing major jumped out from this paste.</p>
        ) : (
          <>
            <ul className="results-concerns__list">
              {concernPreview.map((item) => (
                <li key={item.id} className={concernRowClass(item.severity)}>
                  <div className="results-concern__badges">
                    <p className="results-concern__title">{item.title}</p>
                    <span className="results-concern__pill">{formatConcernPriority(item.severity)}</span>
                    <span className="results-concern__pill-muted">{formatConcernOrigin(item.origin)}</span>
                  </div>
                  <p
                    className={
                      showAllConcerns ? "results-concern__explain" : "results-concern__explain results-concern__explain--clamp"
                    }
                  >
                    {item.explanation}
                  </p>
                  <p className="results-concern__next">
                    <span className="results-concern__next-prefix">Next · </span>
                    {item.recommendation}
                  </p>
                </li>
              ))}
            </ul>
            {concernExtra > 0 && !showAllConcerns && (
              <button
                type="button"
                className="results-show-more"
                onClick={() => setShowAllConcerns(true)}
              >
                Show {concernExtra} more checklist item{concernExtra === 1 ? "" : "s"}
              </button>
            )}
          </>
        )}
      </section>

      <section className="results-questions results-questions--compact" aria-labelledby="questions-heading">
        <h3 id="questions-heading" className="results-questions__title">Tour questions</h3>
        <p className="results-questions__sub">Top lines to copy—full list in download.</p>
        {questions.length === 0 ? (
          <p className="results-questions__empty">Add more listing text to build questions.</p>
        ) : (
          <>
            <ol className="results-questions__list">
              {questionsPreview.map((question, index) => (
                <li key={`${index}-${question.slice(0, 32)}`} className="results-questions__item">
                  {question}
                </li>
              ))}
            </ol>
            {questionsExtra > 0 && (
              <details className="results-disclosure results-disclosure--tight">
                <summary className="results-disclosure__summary">
                  {questionsExtra} more question{questionsExtra === 1 ? "" : "s"}
                </summary>
                <ol className="results-questions__list results-questions__list--continued" start={QUESTIONS_PREVIEW + 1}>
                  {questions.slice(QUESTIONS_PREVIEW).map((question, index) => (
                    <li key={`q-${index}-${question.slice(0, 24)}`} className="results-questions__item">
                      {question}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </>
        )}
      </section>

      {result.alternativeMatchIdeas && result.alternativeMatchIdeas.length > 0 && (
        <section className="results-ai-matches results-ai-matches--compact" aria-labelledby="ai-matches-heading">
          <div className="results-ai-matches__header">
            <p className="results-ai-matches__badge">AI · search ideas</p>
            <h3 id="ai-matches-heading" className="results-ai-matches__title">
              Where to look next
            </h3>
            <p className="results-ai-matches__sub">Illustrative angles—not real listings.</p>
          </div>
          {result.alternativeMatchesIntro && (
            <p className="results-ai-matches__intro">{result.alternativeMatchesIntro}</p>
          )}
          <ul className="results-ai-matches__list">
            {result.alternativeMatchIdeas.map((idea, index) => (
              <li key={`${index}-${idea.headline.slice(0, 24)}`} className="results-ai-matches__card">
                <p className="results-ai-matches__headline">{idea.headline}</p>
                <p className="results-ai-matches__area">{idea.neighborhoodOrArea}</p>
                <p className="results-ai-matches__why results-ai-matches__why--clamp">{idea.whyFitsBetter}</p>
                {idea.searchTips.length > 0 && (
                  <details className="results-disclosure results-disclosure--nested">
                    <summary className="results-disclosure__summary">Search tips</summary>
                    <ul className="results-ai-matches__tips">
                      {idea.searchTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isPoorFitRead(result) &&
        !(result.alternativeMatchIdeas && result.alternativeMatchIdeas.length > 0) &&
        result.llmConfigured === false && (
          <section className="results-ai-matches results-ai-matches--muted" aria-labelledby="ai-matches-placeholder">
            <p id="ai-matches-placeholder" className="results-ai-matches__placeholder-title">
              AI search ideas
            </p>
            <p className="results-ai-matches__placeholder-body">
              Add an API key for AI-powered “where to look next” when a listing is a weak fit.
            </p>
          </section>
        )}

      <details className="results-disclosure results-disclosure--section">
        <summary className="results-disclosure__summary">Full fact table from your paste</summary>
        <div className="results-facts-panel">
          <div className="results-facts__rows results-facts__rows--panel">
            <FactRow
              label="Monthly rent"
              field={pickField(extracted.monthlyRent)}
              format={(value) => formatCurrency(value as number | null)}
            />
            <FactRow
              label="Security deposit"
              field={pickField(extracted.securityDeposit)}
              format={(value) => formatCurrency(value as number | null)}
            />
            <FactRow
              label="Application fee"
              field={pickField(extracted.applicationFee)}
              format={(value) => formatCurrency(value as number | null)}
            />
            <FactRow
              label="Broker fee"
              field={pickField(extracted.brokerFee)}
              format={(value) =>
                value === 0 ? "$0 (states no broker fee in text)" : formatCurrency(value as number | null)
              }
            />
            <FactRow label="Layout" field={{ value: bedBathDisplay, confidence: bedBathConfidence }} />
            <FactRow
              label="Size"
              field={pickField(extracted.squareFootage)}
              format={(value) => (value === null ? "Not in text" : `${value} sq ft`)}
            />
            <FactRow label="Lease term" field={pickField(extracted.leaseTerm)} />
            <FactRow label="Laundry" field={pickField(extracted.laundry)} />
            <FactRow label="Parking" field={pickField(extracted.parking)} />
            <FactRow label="Pet policy" field={pickField(extracted.petPolicy)} />
            <FactRow label="Utilities" field={pickField(extracted.utilitiesIncluded)} />
            <FactRow label="Cooling" field={pickField(extracted.airConditioning)} />
            <FactRow label="Furnished status" field={pickField(extracted.furnished)} />
            <FactRow label="Availability" field={pickField(extracted.availableDate)} />
            <FactRow label="Where" field={pickField(extracted.locationMention)} />
            <FactRow label="Concession language" field={pickField(extracted.concessionsLanguage)} />
          </div>
          <div className="results-facts__inferred">
            <p className="results-facts__inferred-title">Wording patterns</p>
            <div className="results-facts__inferred-block">
              <FactRow label="Matched phrases" field={pickField(extracted.suspiciousWording)} />
            </div>
          </div>
        </div>
      </details>

      {(result.missingInformation ?? []).length > 0 && (
        <details className="results-disclosure results-disclosure--section">
          <summary className="results-disclosure__summary">
            Still missing in the text ({(result.missingInformation ?? []).length})
          </summary>
          <ul className="results-missing__list results-missing__list--in-details">
            {(result.missingInformation ?? []).map((item) => (
              <li key={item} className="results-missing__item">
                {item}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
