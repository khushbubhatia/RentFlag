import type { ExtractedListing, RenterPreferences } from "./types";

export function buildAnalysisSystemPrompt(): string {
  return `You support RentFlag, a renter decision tool—not a hype bot.

Strict rules:
- Never invent dollar amounts, addresses, or amenities. If it is not in the text, do not assert it.
- Use additionalRedFlags only for issues grounded in quoted patterns or clear omissions in the supplied text.
- Use calm, practical language. You are not predicting fraud; you are surfacing questions worth asking.
- suggestedQuestions should sound like something a renter would text a leasing office—short and specific.
- narrativeConcerns are 1–2 clause soft observations about wording or ambiguity, not factual claims about the apartment.
- alternativeMatchIdeas: ONLY when this listing is a weak fit versus renterProfile (budget, must-haves, dates) OR elevated risk/transparency issues. Give 2–3 items that help the renter search elsewhere—neighborhoods, building types, or filter ideas. NEVER invent addresses, URLs, real listing IDs, or rent numbers not grounded in the paste. Headlines must sound like search strategies (e.g. “Pet-friendly walk-up near transit”), not fake apartments. If the listing is a solid fit, return an empty array.
- alternativeMatchesIntro: one short sentence (optional) framing why looking elsewhere may help; omit if alternativeMatchIdeas is empty.
- severity guide: low = nice-to-ask, medium = should clarify before applying, high = resolve before paying deposits.
- Respond with ONLY valid JSON as in the user schema. No markdown, no commentary.`;
}

export function buildAnalysisUserPayload(args: {
  listingText: string;
  extracted: ExtractedListing;
  preferences: RenterPreferences;
}): string {
  return JSON.stringify(
    {
      listingText: args.listingText.slice(0, 12000),
      extractedFields: args.extracted,
      renterProfile: args.preferences,
      jsonSchema: {
        normalizedFieldsPatch:
          "Partial record only; each value { value, confidence, sourceNote? }. Null if unsupported.",
        additionalRedFlags: [
          {
            id: "snake_case_id",
            title: "string",
            severity: "low | medium | high",
            explanation: "string",
            recommendation: "string",
            origin: "ai",
          },
        ],
        suggestedQuestions: ["string"],
        narrativeConcerns: ["string"],
        alternativeMatchesIntro: "string | omit if none",
        alternativeMatchIdeas: [
          {
            headline: "short search strategy title",
            neighborhoodOrArea: "general area or 'same metro' — never a fake street address",
            whyFitsBetter: "one or two sentences vs renter prefs and why this listing stumbled",
            searchTips: ["filters or keywords for Zillow/StreetEasy/etc.—no URLs required"],
          },
        ],
        scoreAdjustments: {
          transparencyDelta: "integer -15..15",
          riskDelta: "integer -15..15",
          affordabilityDelta: "integer -15..15",
        },
      },
    },
    null,
    2
  );
}
