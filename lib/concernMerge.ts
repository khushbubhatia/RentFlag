import type { RedFlag } from "./types";

/**
 * Dedupe by concern id: deterministic rules keep precedence; the model only fills new ids.
 */
export function mergeConcernsByStableId(ruleBasedConcerns: RedFlag[], modelSuggestions: RedFlag[]): RedFlag[] {
  const concernById = new Map<string, RedFlag>();
  for (const concern of ruleBasedConcerns) {
    concernById.set(concern.id, concern);
  }
  for (const concern of modelSuggestions) {
    if (!concernById.has(concern.id)) {
      concernById.set(concern.id, concern);
    }
  }
  return Array.from(concernById.values());
}
