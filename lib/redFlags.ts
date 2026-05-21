import type { ExtractedListing, RedFlag, RenterPreferences } from "./types";

const FEE_LANGUAGE_PATTERN =
  /\b(?:application|app)\s+fee\b|\bbroker(?:age)?\s+fee\b|\bmove[- ]?in\s+fee\b|\badmin(?:istrative)?\s+fee\b|\bamenity\s+fee\b/;

function feeMentionedWithoutDollarAmount(text: string): boolean {
  const lower = text.toLowerCase();
  if (!FEE_LANGUAGE_PATTERN.test(lower)) return false;
  const feeSnippetMatch = lower.match(
    /(?:application|app)\s+fee[^.$]{0,40}|broker[^.$]{0,60}|move[- ]?in\s+fee[^.$]{0,40}/g
  );
  if (!feeSnippetMatch) return false;
  return feeSnippetMatch.some((snippet) => !/\$\s*\d/.test(snippet));
}

function rentLooksFarBelowTypicalMarket(extracted: ExtractedListing): boolean {
  const rent = extracted.monthlyRent.value;
  const beds = extracted.bedrooms.value;
  if (rent === null || beds === null) return false;
  if (beds >= 2 && rent < 900) return true;
  if (beds === 1 && rent < 500) return true;
  if (beds === 0 && rent < 400) return true;
  return false;
}

function locationReadsVague(extracted: ExtractedListing, text: string): boolean {
  if (extracted.locationMention.value) return false;
  const lower = text.toLowerCase();
  if (/dm\s+for|message\s+for|contact\s+for\s+(?:address|location)/.test(lower)) return true;
  if (/\bprime\s+area\b|\bgreat\s+location\b/.test(lower)) return true;
  return false;
}

/**
 * Deterministic concern checks — same input should yield the same items.
 * Wording is intentionally practical, not alarmist.
 */
export function evaluateDeterministicConcerns(
  listingText: string,
  extracted: ExtractedListing,
  preferences: RenterPreferences
): RedFlag[] {
  const concerns: RedFlag[] = [];
  const lower = listingText.toLowerCase();

  if (extracted.securityDeposit.value === null && !/deposit not required|no deposit/i.test(listingText)) {
    concerns.push({
      id: "missing_deposit",
      title: "Security deposit is not spelled out",
      severity: "medium",
      explanation:
        "Many leases list a deposit separate from rent. Not seeing one here makes your total move-in cost harder to plan.",
      recommendation: "Ask for deposit amount, refund rules, and whether anything besides rent is due at signing.",
      origin: "rule",
    });
  }

  if (extracted.laundry.value === null) {
    concerns.push({
      id: "missing_laundry",
      title: "Laundry setup is not described",
      severity: "low",
      explanation: "Whether laundry is in-unit, shared, or off-site changes both cost and weekly routine.",
      recommendation: "Ask where laundry is, whether machines are included, and if there are usage fees.",
      origin: "rule",
    });
  }

  if (extracted.parking.value === null) {
    concerns.push({
      id: "missing_parking",
      title: "Parking is not described",
      severity: "low",
      explanation: "Street rules, permits, and garage options can add predictable monthly cost.",
      recommendation: "Ask what parking is included, typical permit costs, and guest parking rules.",
      origin: "rule",
    });
  }

  if (locationReadsVague(extracted, listingText)) {
    concerns.push({
      id: "vague_location",
      title: "Hard to verify where the unit actually is",
      severity: "medium",
      explanation:
        "You do not yet have cross-streets or an address you can look up, which makes research and commutes harder.",
      recommendation: "Request cross-streets or a full address before visiting; confirm it matches the listing source.",
      origin: "rule",
    });
  }

  if (extracted.utilitiesIncluded.value === null) {
    concerns.push({
      id: "unclear_utilities",
      title: "Utility responsibility is unclear",
      severity: "medium",
      explanation: "Heat, gas, and internet swings can be meaningful relative to base rent.",
      recommendation: "Ask which utilities you pay, typical monthly ranges, and whether any are capped or fixed.",
      origin: "rule",
    });
  }

  if (feeMentionedWithoutDollarAmount(listingText)) {
    concerns.push({
      id: "fees_without_numbers",
      title: "Fees are named but not priced",
      severity: "medium",
      explanation: "When dollar amounts sit behind a phone call or tour, comparing total move-in cost takes longer.",
      recommendation: "Ask for a written fee sheet before you apply—application, admin, move-in, broker if any.",
      origin: "rule",
    });
  }

  if (/\bcontact for exact fees\b/i.test(listingText)) {
    concerns.push({
      id: "contact_exact_fees",
      title: "Exact fees are only described after you reach out",
      severity: "medium",
      explanation: "That is common, but it slows down apples-to-apples comparisons between listings.",
      recommendation: "Request email confirmation of all one-time fees before you schedule a visit.",
      origin: "rule",
    });
  }

  if (extracted.suspiciousWording.value?.length) {
    const phrases = extracted.suspiciousWording.value.join(", ");
    concerns.push({
      id: "bait_language",
      title: "Listing uses promotional or hedge language",
      severity: "medium",
      explanation: `Phrases such as “${phrases}” often mean pricing, photos, or layout need a second look—not that the unit is fake.`,
      recommendation: "Ask which dollars are gross vs net-effective and whether photos match the available unit.",
      origin: "rule",
    });
  }

  if (
    /\bcontact for pricing\b|pricing\s+available\s+upon\s+request/i.test(lower) &&
    !/\bcontact for exact fees\b/i.test(listingText)
  ) {
    concerns.push({
      id: "contact_pricing",
      title: "Rent is framed as “contact for pricing”",
      severity: "medium",
      explanation: "You may need a message or call to learn the number you will actually sign for.",
      recommendation: "Ask for gross rent on a standard lease term and whether concessions change monthly cash flow.",
      origin: "rule",
    });
  }

  if (/\bsubject to change\b|pricing\s+may\s+change|subject\s+to\s+change\s+without\s+notice/i.test(lower)) {
    concerns.push({
      id: "pricing_disclaimer",
      title: "Listing notes that pricing can change",
      severity: "medium",
      explanation: "That is standard marketing language, but it is a reminder to capture the quote you hear in writing.",
      recommendation: "After a tour, ask for the rent and fees tied to a specific unit and move-in window.",
      origin: "rule",
    });
  }

  if (/photos?\s+may\s+not\s+reflect|stock\s+photo|similar\s+unit|representative\s+photos?/i.test(listingText)) {
    concerns.push({
      id: "photo_disclaimer",
      title: "Photos may not show the exact available unit",
      severity: "medium",
      explanation: "You might still like the place—just expect layout or finishes to differ from the gallery.",
      recommendation: "Request current photos or a short video walk-through of the actual unit, not a model.",
      origin: "rule",
    });
  }

  if (/\bstarting at\b|\bfrom\b\s+\$\d+/i.test(listingText)) {
    concerns.push({
      id: "starting_at_pricing",
      title: "“Starting at” or floor pricing language",
      severity: "low",
      explanation: "The headline rent may apply to a different layout or lease term than the one you want.",
      recommendation: "Ask which unit types are really open at that price and what term that assumes.",
      origin: "rule",
    });
  }

  if (/\bflex room\b|\bconvertible\b/i.test(listingText)) {
    concerns.push({
      id: "flex_convertible_layout",
      title: "“Flex” or convertible layout wording",
      severity: "low",
      explanation: "Temporary walls or offices can feel like a bedroom but differ on the lease and for windows/egress.",
      recommendation: "Confirm what the lease counts as a legal bedroom and how the space is measured.",
      origin: "rule",
    });
  }

  if (/\bnet effective rent\b|\bnet-effective\b/i.test(lower)) {
    concerns.push({
      id: "net_effective_rent",
      title: "Net-effective or concession rent mentioned",
      severity: "medium",
      explanation: "Spreading a free month across the lease lowers the “effective” number but not always your first checks.",
      recommendation: "Ask for gross monthly rent, how concessions apply, and cash needed in the first two months.",
      origin: "rule",
    });
  }

  if (extracted.squareFootage.value === null) {
    concerns.push({
      id: "missing_sqft",
      title: "Square footage is not listed",
      severity: "low",
      explanation: "You can still tour—just know comparisons to other listings are fuzzier without size.",
      recommendation: "If it matters to you, ask for approximate square footage or a simple floor plan.",
      origin: "rule",
    });
  }

  if (rentLooksFarBelowTypicalMarket(extracted)) {
    concerns.push({
      id: "too_good_rent",
      title: "Rent looks unusually low for the described layout",
      severity: "medium",
      explanation:
        "It can be genuine, but it is worth an extra beat to confirm the address, landlord, and that fees match what you expect.",
      recommendation: "Verify identity of the poster, tour in person if you can, and compare to nearby comps.",
      origin: "rule",
    });
  }

  if (
    extracted.monthlyRent.value !== null &&
    extracted.monthlyRent.value > 100 &&
    extracted.securityDeposit.value !== null &&
    extracted.securityDeposit.value > 0 &&
    Math.abs(extracted.monthlyRent.value - extracted.securityDeposit.value) < 1
  ) {
    concerns.push({
      id: "deposit_equals_rent",
      title: "Deposit matches monthly rent",
      severity: "low",
      explanation: "One month’s deposit is common; you mainly want the full move-in math, not just the headline.",
      recommendation: "Ask whether first/last month or other items are collected on top of the deposit.",
      origin: "rule",
    });
  }

  if (preferences.mustHaveInUnitLaundry) {
    const laundry = extracted.laundry.value?.toLowerCase() ?? "";
    if (!laundry.includes("in-unit")) {
      concerns.push({
        id: "pref_laundry_mismatch",
        title: "In-unit laundry is a must-have for you and is not confirmed",
        severity: "medium",
        explanation: "The text you shared does not clearly promise in-unit machines.",
        recommendation: "Confirm whether hookups only, shared laundry, or machines in the unit are included.",
        origin: "rule",
      });
    }
  }

  if (preferences.mustHaveParking) {
    const parking = extracted.parking.value?.toLowerCase() ?? "";
    if (!parking || parking.includes("no parking")) {
      concerns.push({
        id: "pref_parking_mismatch",
        title: "Parking is a must-have and is not clearly covered",
        severity: "medium",
        explanation: "The listing does not yet show an option that matches your needs.",
        recommendation: "Ask about deeded spots, garage waitlists, and realistic monthly parking cost.",
        origin: "rule",
      });
    }
  }

  if (preferences.mustHavePetFriendly) {
    const pets = extracted.petPolicy.value?.toLowerCase() ?? "";
    if (!pets || pets.includes("no pets")) {
      concerns.push({
        id: "pref_pet_mismatch",
        title: "Pet-friendly requirement is not clearly met in the text",
        severity: "medium",
        explanation: "You still can ask—many listings omit policy detail until you message.",
        recommendation: "Request the written pet addendum, deposits, monthly pet rent, and breed or weight caps.",
        origin: "rule",
      });
    }
  }

  if (preferences.mustHaveFurnished) {
    const furn = extracted.furnished.value?.toLowerCase() ?? "";
    if (!furn.includes("furnished")) {
      concerns.push({
        id: "pref_furnished_mismatch",
        title: "Furnished preference is not confirmed",
        severity: "low",
        explanation: "Listings sometimes leave furniture assumptions unsaid.",
        recommendation: "Ask exactly which items stay, condition expectations, and any inventory checklist.",
        origin: "rule",
      });
    }
  }

  if (preferences.mustHaveAirConditioning) {
    const ac = extracted.airConditioning.value?.toLowerCase() ?? "";
    if (!ac) {
      concerns.push({
        id: "pref_ac_mismatch",
        title: "Cooling is not described",
        severity: "medium",
        explanation: "You marked AC as important; the paste does not spell out the setup.",
        recommendation: "Ask whether cooling is central, portable, or tenant-installed and any building rules.",
        origin: "rule",
      });
    }
  }

  return concerns;
}
