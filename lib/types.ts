export type ConfidenceLevel = "high" | "medium" | "low" | "not_found";

export type FieldWithConfidence<T> = {
  value: T | null;
  confidence: ConfidenceLevel;
  sourceNote?: string;
};

export type ExtractedListing = {
  monthlyRent: FieldWithConfidence<number>;
  securityDeposit: FieldWithConfidence<number>;
  applicationFee: FieldWithConfidence<number>;
  brokerFee: FieldWithConfidence<number>;
  bedrooms: FieldWithConfidence<number>;
  bathrooms: FieldWithConfidence<number>;
  squareFootage: FieldWithConfidence<number>;
  leaseTerm: FieldWithConfidence<string>;
  laundry: FieldWithConfidence<string>;
  parking: FieldWithConfidence<string>;
  petPolicy: FieldWithConfidence<string>;
  utilitiesIncluded: FieldWithConfidence<string>;
  airConditioning: FieldWithConfidence<string>;
  furnished: FieldWithConfidence<string>;
  availableDate: FieldWithConfidence<string>;
  locationMention: FieldWithConfidence<string>;
  concessionsLanguage: FieldWithConfidence<string>;
  suspiciousWording: FieldWithConfidence<string[]>;
};

export type RedFlagSeverity = "low" | "medium" | "high";

export type RedFlag = {
  id: string;
  title: string;
  severity: RedFlagSeverity;
  explanation: string;
  recommendation: string;
  origin: "rule" | "ai" | "hybrid";
};

export type ListingScores = {
  transparencyScore: number;
  affordabilityScore: number;
  riskScore: number;
};

export type OverallRecommendation =
  | "good_fit"
  | "proceed_with_caution"
  | "high_risk_investigate_more";

export type RenterPreferences = {
  monthlyTakeHomeIncome: number | null;
  maxMonthlyBudget: number | null;
  moveInDate: string;
  mustHaveInUnitLaundry: boolean;
  mustHaveParking: boolean;
  mustHavePetFriendly: boolean;
  mustHaveFurnished: boolean;
  mustHaveAirConditioning: boolean;
};

export type AnalysisInputMode = "text" | "url" | "screenshots";

export type AiSearchMatchIdea = {
  headline: string;
  neighborhoodOrArea: string;
  whyFitsBetter: string;
  searchTips: string[];
};

export type AiEnrichmentResult = {
  normalizedFieldsPatch: Partial<Record<keyof ExtractedListing, unknown>>;
  additionalRedFlags: RedFlag[];
  suggestedQuestions: string[];
  narrativeConcerns: string[];
  /** When the listing is a weak match vs. renter prefs or risky—search angles, not real units. */
  alternativeMatchIdeas?: AiSearchMatchIdea[];
  alternativeMatchesIntro?: string;
  scoreAdjustments?: {
    transparencyDelta?: number;
    riskDelta?: number;
    affordabilityDelta?: number;
  };
};

export type ScoreCaptionBlock = {
  heading: string;
  body: string;
};

export type AnalysisResult = {
  extractedListing: ExtractedListing;
  redFlags: RedFlag[];
  scores: ListingScores;
  overallRecommendation: OverallRecommendation;
  missingInformation: string[];
  questionsToAsk: string[];
  summaryLines: string[];
  scoreCaptions: {
    transparency: ScoreCaptionBlock;
    budgetFit: ScoreCaptionBlock;
    verificationLoad: ScoreCaptionBlock;
  };
  /** Model-generated soft interpretations — not treated as facts. */
  interpretiveNotes?: string[];
  aiUsed: boolean;
  aiError?: string;
  imageAnalysisNote?: string;
  /** How listing body was obtained (e.g. URL fetch vs paste). */
  listingSourceNote?: string;
  llmConfigured?: boolean;
  /** AI-generated “where to look next” ideas after a poor-fit read—illustrative only. */
  alternativeMatchIdeas?: AiSearchMatchIdea[];
  alternativeMatchesIntro?: string;
};

export const defaultRenterPreferences: RenterPreferences = {
  monthlyTakeHomeIncome: null,
  maxMonthlyBudget: null,
  moveInDate: "",
  mustHaveInUnitLaundry: false,
  mustHaveParking: false,
  mustHavePetFriendly: false,
  mustHaveFurnished: false,
  mustHaveAirConditioning: false,
};
