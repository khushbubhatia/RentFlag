import type {
  ConfidenceLevel,
  ExtractedListing,
  FieldWithConfidence,
} from "./types";

const NOT_FOUND_CONFIDENCE: ConfidenceLevel = "not_found";

function field<T>(value: T | null, confidence: ConfidenceLevel): FieldWithConfidence<T> {
  return { value, confidence };
}

function extractCurrency(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1]?.replace(/,/g, "");
      const numberValue = Number.parseFloat(raw ?? "");
      if (!Number.isNaN(numberValue)) return numberValue;
    }
  }
  return null;
}

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const numberValue = Number.parseFloat(match[1] ?? "");
      if (!Number.isNaN(numberValue)) return numberValue;
    }
  }
  return null;
}

const BAIT_WORDS = [
  "luxury",
  "cozy",
  "must see",
  "income requirements",
  "pricing may change",
  "photos may not reflect",
  "subject to change",
  "stock photo",
  "similar unit",
  "starting at",
  "flex room",
  "convertible",
  "net effective rent",
  "net effective",
  "contact for pricing",
];

function findSuspiciousPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const phrase of BAIT_WORDS) {
    if (lower.includes(phrase)) hits.push(phrase);
  }
  return [...new Set(hits)];
}

function extractLeaseTerm(text: string): string | null {
  const lower = text.toLowerCase();
  const monthLease = lower.match(/(\d+)\s*[-]?\s*month\s*lease/);
  if (monthLease) return `${monthLease[1]} month lease`;
  if (/\bmonth\s*to\s*month\b/.test(lower)) return "month to month";
  if (/\b12\s*mo\b/.test(lower)) return "12 month";
  return null;
}

function extractLaundry(text: string): string | null {
  const lower = text.toLowerCase();
  if (/in[- ]?unit\s+(laundry|wd|w\/d|washer)/.test(lower)) return "In-unit";
  if (/wd\s+in\s+building|laundry\s+in\s+building|shared\s+laundry/.test(lower))
    return "In building / shared";
  if (/hookups?\s+only|laundry\s+hookups?/.test(lower)) return "Hookups only";
  if (/no\s+laundry/.test(lower)) return "Not mentioned / none stated";
  if (/laundry|washer|w\/d|wd\b/.test(lower)) return "Mentioned (details unclear)";
  return null;
}

function extractParking(text: string): string | null {
  const lower = text.toLowerCase();
  if (/garage|assigned\s+parking|deeded\s+parking/.test(lower)) return "Garage or assigned";
  if (/street\s+parking|parking\s+zone|permit\s+parking/.test(lower)) return "Street / permit";
  if (/parking\s+available|parking\s+included/.test(lower)) return "Parking mentioned";
  if (/no\s+parking/.test(lower)) return "No parking";
  return null;
}

function extractPetPolicy(text: string): string | null {
  const lower = text.toLowerCase();
  if (/pet\s*friendly|cats?\s*ok|dogs?\s*ok|pets?\s*allowed/.test(lower))
    return "Pets allowed (details in listing)";
  if (/no\s+pets|pets?\s*not/.test(lower)) return "No pets";
  return null;
}

function extractUtilities(text: string): string | null {
  const lower = text.toLowerCase();
  if (/utilities\s+included|all\s+utilities|heat\s*(and|&)\s*(hw|hot\s*water)/.test(lower))
    return "Some utilities included (see listing)";
  if (/tenant\s+pays\s+(electric|all)/.test(lower)) return "Tenant pays (per listing)";
  return null;
}

function extractAC(text: string): string | null {
  const lower = text.toLowerCase();
  if (/central\s*ac|central\s*air|hvac/.test(lower)) return "Central AC";
  if (/window\s*(ac|a\/c|unit)/.test(lower)) return "Window AC";
  if (/\bac\b|air\s*conditioning/.test(lower)) return "AC mentioned";
  return null;
}

function extractFurnished(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bfurnished\b/.test(lower)) return "Furnished";
  if (/\bunfurnished\b/.test(lower)) return "Unfurnished";
  return null;
}

function extractAvailableDate(text: string): string | null {
  const patterns = [
    /available\s+(?:now|asap|immediately)/i,
    /avail(?:able)?\.?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/i,
    /(?:move[- ]?in|available)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

function extractLocation(text: string): string | null {
  const address = text.match(
    /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b[^.]*\.?/i
  );
  if (address) return address[0].trim();
  const neighborhood = text.match(
    /\b(?:in|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/
  );
  if (neighborhood) return neighborhood[1]?.trim() ?? null;
  return null;
}

function extractConcessions(text: string): string | null {
  const lower = text.toLowerCase();
  if (
    /\d+\s*month(s)?\s*free|free\s*month|concession|move[- ]?in\s*special|op\s*city|net\s*effective/.test(
      lower
    )
  ) {
    const slice = text.slice(Math.max(0, lower.indexOf("month") - 20), lower.indexOf("month") + 40);
    return slice.trim() || "Concession language detected";
  }
  return null;
}

function confidenceForNumber(found: number | null, strongPatternHit: boolean): ConfidenceLevel {
  if (found === null) return NOT_FOUND_CONFIDENCE;
  return strongPatternHit ? "high" : "medium";
}

export function extractListingFromText(rawText: string): ExtractedListing {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  const monthlyRent = extractCurrency(text, [
    /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:\/|\s*per\s*)?\s*mo(?:nth)?/i,
    /\$\s*([\d,]+(?:\.\d{2})?)\s*\/\s*month/i,
    /rent[s]?\s*(?:is|:)?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ]);

  const securityDeposit = extractCurrency(text, [
    /security\s+deposit\s*(?:of|:)?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /deposit\s*[:.]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ]);

  const applicationFee = extractCurrency(text, [
    /application\s+fee\s*(?:of|:)?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /app\s*fee\s*[:.]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ]);

  let brokerFeeValue: number | null = null;
  if (/no\s*(?:broker\s*)?fee|no\s+broker/i.test(lower)) {
    brokerFeeValue = 0;
  } else {
    brokerFeeValue = extractCurrency(text, [
      /broker(?:\s*fee)?\s*(?:of|:)?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
      /fee[s]?\s+to\s+(?:the\s+)?broker[^$]*\$\s*([\d,]+(?:\.\d{2})?)/i,
    ]);
  }

  const bedrooms = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:bd|br|bed|bedroom|bedrooms)\b/i,
    /(\d+)\s*bed/i,
  ]);

  const bathrooms = extractNumber(text, [
    /(\d+(?:\.\d+)?)\s*(?:ba|bath|bathroom|bathrooms)\b/i,
    /(\d+)\s*bath/i,
  ]);

  const squareFootage = extractNumber(text, [
    /(\d{2,5})\s*(?:sq\.?\s*ft|sqft|sf)\b/i,
    /(\d{2,5})\s*square\s*feet/i,
  ]);

  const suspicious = findSuspiciousPhrases(text);

  return {
    monthlyRent: field(monthlyRent, confidenceForNumber(monthlyRent, /\$\d+.*\/\s*mo/i.test(text))),
    securityDeposit: field(
      securityDeposit,
      confidenceForNumber(securityDeposit, /security\s+deposit/i.test(text))
    ),
    applicationFee: field(
      applicationFee,
      confidenceForNumber(applicationFee, /application\s+fee|app\s+fee/i.test(text))
    ),
    brokerFee: field(
      brokerFeeValue,
      /no\s*(?:broker\s*)?fee|no\s+broker/i.test(lower)
        ? "high"
        : confidenceForNumber(brokerFeeValue, /broker/i.test(text))
    ),
    bedrooms: field(
      resolveBedroomCount(bedrooms, text),
      confidenceForNumber(
        resolveBedroomCount(bedrooms, text),
        /\b\d+\s*br\b/i.test(lower) || /studio|\b0\s*br\b/i.test(lower)
      )
    ),
    bathrooms: field(bathrooms, confidenceForNumber(bathrooms, /\b\d+\s*ba\b/i.test(lower))),
    squareFootage: field(
      squareFootage,
      confidenceForNumber(squareFootage, /sq\.?\s*ft|sqft/i.test(lower))
    ),
    leaseTerm: field(extractLeaseTerm(text), extractLeaseTerm(text) ? "medium" : NOT_FOUND_CONFIDENCE),
    laundry: field(extractLaundry(text), extractLaundry(text) ? "medium" : NOT_FOUND_CONFIDENCE),
    parking: field(extractParking(text), extractParking(text) ? "medium" : NOT_FOUND_CONFIDENCE),
    petPolicy: field(extractPetPolicy(text), extractPetPolicy(text) ? "medium" : NOT_FOUND_CONFIDENCE),
    utilitiesIncluded: field(
      extractUtilities(text),
      extractUtilities(text) ? "medium" : NOT_FOUND_CONFIDENCE
    ),
    airConditioning: field(extractAC(text), extractAC(text) ? "medium" : NOT_FOUND_CONFIDENCE),
    furnished: field(extractFurnished(text), extractFurnished(text) ? "high" : NOT_FOUND_CONFIDENCE),
    availableDate: field(
      extractAvailableDate(text),
      extractAvailableDate(text) ? "medium" : NOT_FOUND_CONFIDENCE
    ),
    locationMention: field(
      extractLocation(text),
      extractLocation(text) ? "medium" : NOT_FOUND_CONFIDENCE
    ),
    concessionsLanguage: field(
      extractConcessions(text),
      extractConcessions(text) ? "medium" : NOT_FOUND_CONFIDENCE
    ),
    suspiciousWording: field(
      suspicious.length ? suspicious : null,
      suspicious.length ? "high" : NOT_FOUND_CONFIDENCE
    ),
  };
}

function resolveBedroomCount(bedrooms: number | null, text: string): number | null {
  if (bedrooms !== null) return bedrooms;
  if (/studio|\b0\s*br\b/i.test(text)) return 0;
  return null;
}

export function mergeExtractedPatches(
  base: ExtractedListing,
  patch: Partial<Record<keyof ExtractedListing, unknown>>
): ExtractedListing {
  const next = { ...base };
  (Object.keys(patch) as (keyof ExtractedListing)[]).forEach((key) => {
    const value = patch[key];
    if (value && typeof value === "object" && "value" in (value as object)) {
      next[key] = value as FieldWithConfidence<never>;
    }
  });
  return next;
}
