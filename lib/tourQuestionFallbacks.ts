const DEFAULT_CORE_QUESTIONS = [
  "What one-time fees (application, admin, move-in, broker) apply, and what is each amount?",
  "Do the listing photos show the exact unit I would lease, or a model/similar unit?",
] as const;

export function buildTemplateTourQuestions(
  missingFieldLabels: string[],
  listingMentionsNetEffectiveRent: boolean
): string[] {
  const questions = new Set<string>(DEFAULT_CORE_QUESTIONS);

  if (listingMentionsNetEffectiveRent) {
    questions.add(
      "Is the rent quoted as gross rent per month, or net-effective after concessions? What do I actually pay each month?"
    );
  }

  if (missingFieldLabels.includes("Laundry details")) {
    questions.add("Is laundry in-unit, shared in the building, or not provided—and is there any extra cost?");
  }
  if (missingFieldLabels.includes("Parking details")) {
    questions.add("What parking options are available, permit rules, and monthly costs if any?");
  }
  if (missingFieldLabels.includes("Pet policy")) {
    questions.add(
      "What is the pet policy in writing—allowed breeds/weights, deposits, and monthly pet rent?"
    );
  }

  return Array.from(questions);
}
