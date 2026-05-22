import type {
  ExtractedListing,
  ListingScores,
  OverallRecommendation,
  RedFlag,
  RenterPreferences,
  ScoreCaptionBlock,
} from "./types";
import {
  BUDGET_FIT_HEADROOM_BONUS,
  BUDGET_FIT_HIDDEN_FEE_LANGUAGE_PENALTY,
  BUDGET_FIT_INCOME_COMFORT_BONUS,
  BUDGET_FIT_INCOME_STRETCH_HEAVY,
  BUDGET_FIT_INCOME_STRETCH_PENALTY,
  BUDGET_FIT_NEAR_BUDGET_PENALTY,
  BUDGET_FIT_OVER_BUDGET_PENALTY,
  BUDGET_FIT_START,
  BUDGET_COMFORT_RATIO,
  BUDGET_NEAR_RATIO,
  CONCERN_IDS_AFFECTING_BUDGET_UNCERTAINTY,
  CONCERN_IDS_AFFECTING_TRANSPARENCY,
  CONCERN_IDS_TRANSPARENCY_LIGHT_PENALTY,
  FIT_ASSESSMENT_THRESHOLDS,
  RENT_TO_INCOME_COMFORT,
  RENT_TO_INCOME_HEAVY,
  RENT_TO_INCOME_STRETCH,
  TRANSPARENCY_MAX_PENALTY_FROM_GAPS,
  TRANSPARENCY_MAX_PENALTY_FROM_MARKETING_PHRASES,
  TRANSPARENCY_PENALTY_HIGH_SEVERITY_CONCERN,
  TRANSPARENCY_PENALTY_MEDIUM_SEVERITY_CONCERN,
  TRANSPARENCY_PENALTY_PER_MARKETING_PHRASE,
  TRANSPARENCY_PENALTY_PER_MISSING_KEY_FIELD,
  TRANSPARENCY_PENALTY_SMALL_CONCERN,
  VERIFICATION_BASELINE,
  VERIFICATION_INCREMENT_PER_MARKETING_PHRASE,
  VERIFICATION_WEIGHT_HIGH,
  VERIFICATION_WEIGHT_LOW,
  VERIFICATION_WEIGHT_MEDIUM,
} from "./scoringModel";

const STRUCTURED_FIELD_KEYS: (keyof ExtractedListing)[] = [
  "monthlyRent",
  "securityDeposit",
  "utilitiesIncluded",
  "laundry",
  "parking",
  "leaseTerm",
  "squareFootage",
  "locationMention",
];

function countStructuredFieldsWithNoValue(extracted: ExtractedListing): number {
  return STRUCTURED_FIELD_KEYS.filter((key) => extracted[key].value === null).length;
}

export function verificationPointsForSeverity(severity: RedFlag["severity"]): number {
  switch (severity) {
    case "high":
      return VERIFICATION_WEIGHT_HIGH;
    case "medium":
      return VERIFICATION_WEIGHT_MEDIUM;
    case "low":
    default:
      return VERIFICATION_WEIGHT_LOW;
  }
}

export function collectMissingInformation(extracted: ExtractedListing): string[] {
  const labels: Partial<Record<keyof ExtractedListing, string>> = {
    monthlyRent: "Monthly rent",
    securityDeposit: "Security deposit amount",
    applicationFee: "Application fee",
    brokerFee: "Broker or leasing fees",
    bedrooms: "Bedroom count",
    bathrooms: "Bathroom count",
    squareFootage: "Square footage",
    leaseTerm: "Lease term",
    laundry: "Laundry details",
    parking: "Parking details",
    petPolicy: "Pet policy",
    utilitiesIncluded: "Utilities included / excluded",
    airConditioning: "Air conditioning",
    furnished: "Furnished vs unfurnished",
    availableDate: "Availability / move-in date",
    locationMention: "Specific address or neighborhood",
    concessionsLanguage: "Concessions (if any)",
  };

  const missing: string[] = [];
  (Object.keys(labels) as (keyof ExtractedListing)[]).forEach((key) => {
    if (extracted[key].value === null && key !== "suspiciousWording") {
      const label = labels[key];
      if (label) missing.push(label);
    }
  });
  return missing;
}

function computeTransparencyScoreValue(
  extracted: ExtractedListing,
  concerns: RedFlag[],
  modelTransparencyDelta: number
): number {
  let score = 100;

  const missingKeyFieldCount = countStructuredFieldsWithNoValue(extracted);
  score -= Math.min(
    TRANSPARENCY_MAX_PENALTY_FROM_GAPS,
    missingKeyFieldCount * TRANSPARENCY_PENALTY_PER_MISSING_KEY_FIELD
  );

  const marketingPhraseCount = extracted.suspiciousWording.value?.length ?? 0;
  if (marketingPhraseCount) {
    score -= Math.min(
      TRANSPARENCY_MAX_PENALTY_FROM_MARKETING_PHRASES,
      marketingPhraseCount * TRANSPARENCY_PENALTY_PER_MARKETING_PHRASE
    );
  }

  for (const concern of concerns) {
    if (!CONCERN_IDS_AFFECTING_TRANSPARENCY.has(concern.id)) continue;
    if (CONCERN_IDS_TRANSPARENCY_LIGHT_PENALTY.has(concern.id)) {
      score -= TRANSPARENCY_PENALTY_SMALL_CONCERN;
      continue;
    }
    score -=
      concern.severity === "high"
        ? TRANSPARENCY_PENALTY_HIGH_SEVERITY_CONCERN
        : TRANSPARENCY_PENALTY_MEDIUM_SEVERITY_CONCERN;
  }

  score += modelTransparencyDelta;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeBudgetFitScoreValue(
  extracted: ExtractedListing,
  preferences: RenterPreferences,
  concerns: RedFlag[],
  modelAffordabilityDelta: number
): number {
  let score = BUDGET_FIT_START;
  const rent = extracted.monthlyRent.value;
  const budget = preferences.maxMonthlyBudget;
  const income = preferences.monthlyTakeHomeIncome;

  if (rent !== null && budget !== null) {
    if (rent <= budget * BUDGET_COMFORT_RATIO) score += BUDGET_FIT_HEADROOM_BONUS;
    if (rent > budget) score -= BUDGET_FIT_OVER_BUDGET_PENALTY;
    else if (rent > budget * BUDGET_NEAR_RATIO) score -= BUDGET_FIT_NEAR_BUDGET_PENALTY;
  }

  if (rent !== null && income !== null && income > 0) {
    const rentToIncome = rent / income;
    if (rentToIncome <= RENT_TO_INCOME_COMFORT) score += BUDGET_FIT_INCOME_COMFORT_BONUS;
    if (rentToIncome > RENT_TO_INCOME_STRETCH) score -= BUDGET_FIT_INCOME_STRETCH_PENALTY;
    if (rentToIncome > RENT_TO_INCOME_HEAVY) score -= BUDGET_FIT_INCOME_STRETCH_HEAVY;
  }

  if (concerns.some((item) => CONCERN_IDS_AFFECTING_BUDGET_UNCERTAINTY.has(item.id))) {
    score -= BUDGET_FIT_HIDDEN_FEE_LANGUAGE_PENALTY;
  }

  score += modelAffordabilityDelta;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeVerificationLoadScoreValue(
  extracted: ExtractedListing,
  concerns: RedFlag[],
  modelRiskDelta: number
): number {
  let score = VERIFICATION_BASELINE;
  for (const concern of concerns) {
    score += verificationPointsForSeverity(concern.severity);
  }
  const marketingPhraseCount = extracted.suspiciousWording.value?.length ?? 0;
  score += marketingPhraseCount * VERIFICATION_INCREMENT_PER_MARKETING_PHRASE;
  score += modelRiskDelta;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeListingScores(
  extracted: ExtractedListing,
  concerns: RedFlag[],
  preferences: RenterPreferences,
  modelTransparencyDelta: number,
  modelRiskDelta: number,
  modelAffordabilityDelta: number
): ListingScores {
  return {
    transparencyScore: computeTransparencyScoreValue(extracted, concerns, modelTransparencyDelta),
    affordabilityScore: computeBudgetFitScoreValue(
      extracted,
      preferences,
      concerns,
      modelAffordabilityDelta
    ),
    riskScore: computeVerificationLoadScoreValue(extracted, concerns, modelRiskDelta),
  };
}

export function computeOverallRecommendation(
  scores: ListingScores,
  concerns: RedFlag[]
): OverallRecommendation {
  const highSeverityCount = concerns.filter((item) => item.severity === "high").length;

  if (FIT_ASSESSMENT_THRESHOLDS.needsDeepVerification(scores.riskScore, highSeverityCount)) {
    return "high_risk_investigate_more";
  }
  if (
    FIT_ASSESSMENT_THRESHOLDS.extraVerification(
      scores.riskScore,
      scores.transparencyScore,
      highSeverityCount
    ) ||
    FIT_ASSESSMENT_THRESHOLDS.budgetStress(scores.affordabilityScore)
  ) {
    return "proceed_with_caution";
  }
  return "good_fit";
}

export function buildExecutiveSummaryLines(
  extracted: ExtractedListing,
  scores: ListingScores,
  fitAssessment: OverallRecommendation,
  concernCount: number,
  modelEnrichmentRan: boolean,
  budgetFitPersonalized: boolean = false
): string[] {
  const rent = extracted.monthlyRent.value;
  const lines: string[] = [];

  lines.push(
    rent !== null
      ? `We parsed rent of about $${rent.toLocaleString()}/mo from your paste—confirm the gross amount and lease length on a call or tour.`
      : "Rent did not come through clearly in the text you shared; ask for gross monthly rent and what it includes."
  );

  const scoreLine = budgetFitPersonalized
    ? `Scores at a glance — disclosure completeness ${scores.transparencyScore}/100, budget fit ${scores.affordabilityScore}/100, verification load ${scores.riskScore}/100 (higher means more to confirm with the landlord).`
    : `Scores at a glance — disclosure completeness ${scores.transparencyScore}/100, verification load ${scores.riskScore}/100 (higher means more to confirm with the landlord). Add a budget above to personalize the budget-fit score.`;
  lines.push(scoreLine);

  if (concernCount > 0) {
    lines.push(
      `${concernCount} checklist item${concernCount === 1 ? "" : "s"} surfaced from listing patterns${
        modelEnrichmentRan ? " plus a light model pass" : ""
      }—use them as prompts, not automatic deal-breakers.`
    );
  }

  lines.push(
    fitAssessment === "good_fit"
      ? "Overall: the ad is relatively informative. Still put material numbers and promises in email or the lease."
      : fitAssessment === "proceed_with_caution"
        ? "Overall: still workable—plan a short list of follow-ups on fees, utilities, and the exact unit before you apply."
        : "Overall: several open items remain; take time to confirm pricing, identity, and fees before you pay any deposits."
  );

  return lines;
}

export function buildDashboardScoreCaptions(
  scores: ListingScores,
  extracted: ExtractedListing,
  preferences: RenterPreferences,
  concernCount: number
): {
  transparency: ScoreCaptionBlock;
  budgetFit: ScoreCaptionBlock;
  verificationLoad: ScoreCaptionBlock;
} {
  const missingCount = countStructuredFieldsWithNoValue(extracted);
  const rent = extracted.monthlyRent.value;
  const budget = preferences.maxMonthlyBudget;

  const transparency: ScoreCaptionBlock = {
    heading: "Disclosure completeness",
    body:
      missingCount <= 2
        ? "Most core cost and location fields were visible in what you pasted."
        : `${missingCount} common fields (rent, deposit, utilities, layout basics, etc.) were missing or vague—expect more back-and-forth.`,
  };

  let budgetBody =
    "Add your budget or take-home pay above to personalize this. Right now it reflects generic assumptions.";
  if (rent !== null && budget !== null) {
    if (rent <= budget * BUDGET_COMFORT_RATIO) {
      budgetBody = `Listed rent is below your max budget cushion—you still want to layer in utilities and fees.`;
    } else if (rent > budget) {
      budgetBody = `Listed rent is above the monthly max you entered; concessions or fees could change the picture, but plan on pressure here.`;
    } else {
      budgetBody = `Listed rent is within your stated range but close to the ceiling—confirm variable costs before committing.`;
    }
  } else if (rent !== null && preferences.monthlyTakeHomeIncome) {
    const ratio = rent / preferences.monthlyTakeHomeIncome;
    if (ratio <= RENT_TO_INCOME_COMFORT) {
      budgetBody = `Roughly ${Math.round(ratio * 100)}% of your entered take-home—within a common planning band before utilities.`;
    } else if (ratio <= RENT_TO_INCOME_STRETCH) {
      budgetBody = `Roughly ${Math.round(ratio * 100)}% of take-home—comfortable only if other costs stay predictable.`;
    } else {
      budgetBody = `Roughly ${Math.round(ratio * 100)}% of take-home—that is a tight housing load once utilities and savings matter.`;
    }
  }

  const verificationLoad: ScoreCaptionBlock = {
    heading: "Verification load",
    body:
      concernCount === 0 && scores.riskScore < 40
        ? "Fewer structural gaps surfaced—still confirm anything you care about in writing."
        : concernCount > 0
          ? `${concernCount} review item${concernCount === 1 ? "" : "s"} below—you are not doing anything wrong by asking for clarity.`
          : "Language in the listing still leaves room for follow-up; use the questions section as your script.",
  };

  return {
    transparency,
    budgetFit: { heading: "Budget fit", body: budgetBody },
    verificationLoad,
  };
}
