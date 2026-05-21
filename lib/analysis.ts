import { mergeConcernsByStableId } from "./concernMerge";
import { extractListingFromText } from "./extraction";
import { appendScreenshotAnalysisPlaceholder } from "./imageExtraction";
import { runListingEnrichment } from "./llmClient";
import { evaluateDeterministicConcerns } from "./redFlags";
import {
  buildDashboardScoreCaptions,
  buildExecutiveSummaryLines,
  collectMissingInformation,
  computeListingScores,
  computeOverallRecommendation,
} from "./scoring";
import type {
  AiSearchMatchIdea,
  AnalysisInputMode,
  AnalysisResult,
  RenterPreferences,
} from "./types";
import { buildTemplateTourQuestions } from "./tourQuestionFallbacks";

export async function analyzeListingPayload(args: {
  mode: AnalysisInputMode;
  listingText: string;
  listingUrl?: string;
  imageCount: number;
  preferences: RenterPreferences;
  enableAi: boolean;
  listingSourceNote?: string;
}): Promise<AnalysisResult> {
  let combinedText = args.listingText.trim();
  if (args.mode === "url" && args.listingUrl?.trim()) {
    combinedText = `Listing URL (saved for your records; content still pasted below):\n${args.listingUrl.trim()}\n\n${combinedText}`;
  }
  combinedText += appendScreenshotAnalysisPlaceholder(args.imageCount);

  const extractedBaseline = extractListingFromText(combinedText);
  let extracted = extractedBaseline;
  let listingConcerns = evaluateDeterministicConcerns(combinedText, extractedBaseline, args.preferences);
  let modelEnrichmentRan = false;
  let modelError: string | undefined;
  let interpretiveNotes: string[] = [];
  let modelSuggestedQuestions: string[] = [];
  let scoreAdjustments = { transparencyDelta: 0, riskDelta: 0, affordabilityDelta: 0 };
  let alternativeMatchIdeas: AiSearchMatchIdea[] | undefined;
  let alternativeMatchesIntro: string | undefined;

  if (args.enableAi) {
    try {
      const enrichment = await runListingEnrichment({
        listingText: combinedText,
        extracted: extractedBaseline,
        preferences: args.preferences,
      });
      extracted = enrichment.mergedExtracted;
      listingConcerns = evaluateDeterministicConcerns(combinedText, extracted, args.preferences);
      listingConcerns = mergeConcernsByStableId(listingConcerns, enrichment.aiFlags);
      modelSuggestedQuestions = enrichment.questions;
      interpretiveNotes = enrichment.concerns;
      scoreAdjustments = enrichment.adjustments;
      alternativeMatchIdeas =
        enrichment.alternativeMatchIdeas.length > 0 ? enrichment.alternativeMatchIdeas : undefined;
      alternativeMatchesIntro = enrichment.alternativeMatchesIntro;
      modelEnrichmentRan = true;
    } catch (error) {
      modelError = error instanceof Error ? error.message : "Model request did not complete";
      extracted = extractedBaseline;
      listingConcerns = evaluateDeterministicConcerns(combinedText, extractedBaseline, args.preferences);
    }
  }

  const scores = computeListingScores(
    extracted,
    listingConcerns,
    args.preferences,
    scoreAdjustments.transparencyDelta,
    scoreAdjustments.riskDelta,
    scoreAdjustments.affordabilityDelta
  );
  const overallRecommendation = computeOverallRecommendation(scores, listingConcerns);

  const leanPoorFit =
    overallRecommendation !== "good_fit" ||
    listingConcerns.some((c) => c.severity === "high") ||
    scores.affordabilityScore < 48;

  if (!leanPoorFit || !alternativeMatchIdeas?.length) {
    alternativeMatchIdeas = undefined;
    alternativeMatchesIntro = undefined;
  } else {
    alternativeMatchIdeas = alternativeMatchIdeas.slice(0, 3);
  }
  const missingInformation = collectMissingInformation(extracted);
  const listingMentionsNetEffective = /\bnet effective rent\b/i.test(combinedText);
  const templateQuestions = buildTemplateTourQuestions(missingInformation, listingMentionsNetEffective);
  const questionsToAsk = Array.from(new Set([...modelSuggestedQuestions, ...templateQuestions])).slice(0, 12);

  const summaryLines = buildExecutiveSummaryLines(
    extracted,
    scores,
    overallRecommendation,
    listingConcerns.length,
    modelEnrichmentRan
  );

  const scoreCaptions = buildDashboardScoreCaptions(
    scores,
    extracted,
    args.preferences,
    listingConcerns.length
  );

  return {
    extractedListing: extracted,
    redFlags: listingConcerns,
    scores,
    overallRecommendation,
    missingInformation,
    questionsToAsk,
    summaryLines,
    scoreCaptions,
    interpretiveNotes: interpretiveNotes.length ? interpretiveNotes : undefined,
    aiUsed: modelEnrichmentRan,
    aiError: modelError,
    imageAnalysisNote:
      args.imageCount > 0
        ? "You attached screenshots; RentFlag still relies on the text you provide until OCR is connected."
        : undefined,
    listingSourceNote: args.listingSourceNote,
    alternativeMatchIdeas,
    alternativeMatchesIntro,
  };
}
