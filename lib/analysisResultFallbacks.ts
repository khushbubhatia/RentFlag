import type { AiSearchMatchIdea, AnalysisResult, ScoreCaptionBlock } from "./types";

function sanitizeIdeasList(raw: unknown): AiSearchMatchIdea[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: AiSearchMatchIdea[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const headline = typeof o.headline === "string" ? o.headline.trim() : "";
    const neighborhoodOrArea =
      typeof o.neighborhoodOrArea === "string" ? o.neighborhoodOrArea.trim() : "Same city / nearby";
    const whyFitsBetter = typeof o.whyFitsBetter === "string" ? o.whyFitsBetter.trim() : "";
    const tipsRaw = Array.isArray(o.searchTips) ? o.searchTips : [];
    const searchTips = tipsRaw
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean);
    if (headline && whyFitsBetter) {
      out.push({ headline, neighborhoodOrArea, whyFitsBetter, searchTips });
    }
  }
  return out.length ? out : undefined;
}

const DEFAULT_SCORE_CAPTIONS: AnalysisResult["scoreCaptions"] = {
  transparency: {
    heading: "Disclosure completeness",
    body: "Score based on how much of the listing we could tie to common fields.",
  },
  budgetFit: {
    heading: "Budget fit",
    body: "How the rent lines up with the budget and income you entered, if any.",
  },
  verificationLoad: {
    heading: "Verification load",
    body: "Higher means more follow-up with the landlord before you commit—not a fraud score.",
  },
};

/** Keeps the results UI from crashing if the API payload is partial or from an older build. */
export function withAnalysisResultDefaults(raw: unknown): AnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Partial<AnalysisResult>;
  if (!payload.extractedListing || !payload.scores) return null;

  return {
    extractedListing: payload.extractedListing,
    redFlags: Array.isArray(payload.redFlags) ? payload.redFlags : [],
    scores: {
      transparencyScore: payload.scores.transparencyScore ?? 0,
      affordabilityScore: payload.scores.affordabilityScore ?? 0,
      riskScore: payload.scores.riskScore ?? 0,
    },
    overallRecommendation: payload.overallRecommendation ?? "proceed_with_caution",
    missingInformation: Array.isArray(payload.missingInformation) ? payload.missingInformation : [],
    questionsToAsk: Array.isArray(payload.questionsToAsk) ? payload.questionsToAsk : [],
    summaryLines: Array.isArray(payload.summaryLines) ? payload.summaryLines : [],
    scoreCaptions: mergeScoreCaptions(payload.scoreCaptions),
    interpretiveNotes: payload.interpretiveNotes,
    aiUsed: Boolean(payload.aiUsed),
    aiError: payload.aiError,
    imageAnalysisNote: payload.imageAnalysisNote,
    listingSourceNote: payload.listingSourceNote,
    llmConfigured: payload.llmConfigured,
    alternativeMatchIdeas: sanitizeIdeasList(payload.alternativeMatchIdeas),
    alternativeMatchesIntro:
      typeof payload.alternativeMatchesIntro === "string"
        ? payload.alternativeMatchesIntro.trim().slice(0, 280) || undefined
        : undefined,
    budgetFitPersonalized: Boolean(payload.budgetFitPersonalized),
  };
}

function mergeScoreCaptions(
  partial: Partial<AnalysisResult["scoreCaptions"]> | undefined
): AnalysisResult["scoreCaptions"] {
  const p = partial ?? {};
  return {
    transparency: mergeCaption(p.transparency, DEFAULT_SCORE_CAPTIONS.transparency),
    budgetFit: mergeCaption(p.budgetFit, DEFAULT_SCORE_CAPTIONS.budgetFit),
    verificationLoad: mergeCaption(p.verificationLoad, DEFAULT_SCORE_CAPTIONS.verificationLoad),
  };
}

function mergeCaption(a: ScoreCaptionBlock | undefined, fallback: ScoreCaptionBlock): ScoreCaptionBlock {
  return {
    heading: a?.heading?.trim() ? a.heading : fallback.heading,
    body: a?.body?.trim() ? a.body : fallback.body,
  };
}
