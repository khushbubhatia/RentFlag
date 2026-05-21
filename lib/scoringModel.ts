/**
 * RentFlag scoring model — interview-friendly, deterministic weights.
 *
 * - Transparency: starts at 100; penalizes omitted key fields and vague pricing patterns.
 * - Budget fit: starts at a neutral baseline; moves with rent vs budget and ~33% rent-to-income guardrail.
 * - Verification load (stored as riskScore for API stability): starts low; rises with concern severity and
 *   fuzzy marketing phrases. Higher = more follow-up with the landlord, not a fraud prediction.
 */

export const TRANSPARENCY_MAX_PENALTY_FROM_GAPS = 42;
export const TRANSPARENCY_PENALTY_PER_MISSING_KEY_FIELD = 6;
export const TRANSPARENCY_MAX_PENALTY_FROM_MARKETING_PHRASES = 18;
export const TRANSPARENCY_PENALTY_PER_MARKETING_PHRASE = 4;

export const TRANSPARENCY_PENALTY_HIGH_SEVERITY_CONCERN = 12;
export const TRANSPARENCY_PENALTY_MEDIUM_SEVERITY_CONCERN = 8;
export const TRANSPARENCY_PENALTY_SMALL_CONCERN = 7;

export const VERIFICATION_BASELINE = 12;
export const VERIFICATION_WEIGHT_LOW = 7;
export const VERIFICATION_WEIGHT_MEDIUM = 16;
export const VERIFICATION_WEIGHT_HIGH = 28;
export const VERIFICATION_INCREMENT_PER_MARKETING_PHRASE = 5;

export const BUDGET_FIT_START = 78;
export const BUDGET_FIT_HEADROOM_BONUS = 12;
export const BUDGET_FIT_OVER_BUDGET_PENALTY = 45;
export const BUDGET_FIT_NEAR_BUDGET_PENALTY = 22;
export const BUDGET_FIT_INCOME_COMFORT_BONUS = 8;
export const BUDGET_FIT_INCOME_STRETCH_PENALTY = 18;
export const BUDGET_FIT_INCOME_STRETCH_HEAVY = 25;
export const BUDGET_FIT_HIDDEN_FEE_LANGUAGE_PENALTY = 8;

export const CONCERN_IDS_AFFECTING_TRANSPARENCY = new Set([
  "missing_deposit",
  "fees_without_numbers",
  "contact_exact_fees",
  "vague_location",
  "unclear_utilities",
  "contact_pricing",
]);

export const CONCERN_IDS_TRANSPARENCY_LIGHT_PENALTY = new Set(["unclear_utilities", "contact_pricing"]);

export const CONCERN_IDS_AFFECTING_BUDGET_UNCERTAINTY = new Set(["net_effective_rent", "fees_without_numbers"]);

/** Rent ≤ this share of budget counts as comfortable headroom. */
export const BUDGET_COMFORT_RATIO = 0.85;

/** Near-budget band before declaring over budget. */
export const BUDGET_NEAR_RATIO = 0.95;

/** Common rent-to-income guardrails (monthly). */
export const RENT_TO_INCOME_COMFORT = 0.28;
export const RENT_TO_INCOME_STRETCH = 0.33;
export const RENT_TO_INCOME_HEAVY = 0.4;

export const FIT_ASSESSMENT_THRESHOLDS = {
  /** Lots still to verify with the landlord. */
  needsDeepVerification:
    (riskScore: number, highSeverityConcernCount: number) =>
      riskScore >= 78 || (riskScore >= 68 && highSeverityConcernCount >= 2),

  /** Worth extra questions before applying, but not inherently disqualifying. */
  extraVerification:
    (riskScore: number, transparencyScore: number, highSeverityConcernCount: number) =>
      riskScore >= 50 ||
      transparencyScore < 50 ||
      (highSeverityConcernCount >= 1 && riskScore >= 58),

  budgetStress: (affordabilityScore: number) => affordabilityScore < 40,
} as const;
