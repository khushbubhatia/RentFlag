import type { ConfidenceLevel } from "./types";

/** How clearly the value appeared in pasted text — not a guarantee the landlord is accurate. */
export function formatConfidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "Clearly stated";
    case "medium":
      return "Parsed — confirm";
    case "low":
      return "Weak match";
    case "not_found":
    default:
      return "Not in text";
  }
}

export function formatCurrency(value: number | null): string {
  if (value === null) return "Not in text";
  return `$${value.toLocaleString()}`;
}

export function formatFitAssessment(
  key: "good_fit" | "proceed_with_caution" | "high_risk_investigate_more"
): { title: string; description: string; tone: "positive" | "caution" | "verify" } {
  switch (key) {
    case "good_fit":
      return {
        title: "Reasonable to keep exploring",
        description:
          "Looks complete enough to keep going—still confirm rent, fees, and the exact unit in writing before you pay.",
        tone: "positive",
      };
    case "proceed_with_caution":
      return {
        title: "Pursue—with a short verification list",
        description:
          "Not a hard no—just plan to nail down fees, utilities, and which unit you’re actually leasing before you apply.",
        tone: "caution",
      };
    case "high_risk_investigate_more":
    default:
      return {
        title: "Slow down—verify before money moves",
        description:
          "A lot is still open-ended. Normal in some markets: confirm who you’re dealing with and get fees in writing first.",
        tone: "verify",
      };
  }
}

/** User-facing label for severity — avoids “HIGH RISK” vibes. */
export function formatConcernPriority(severity: "low" | "medium" | "high"): string {
  switch (severity) {
    case "high":
      return "Resolve before applying";
    case "medium":
      return "Clarify on a call";
    case "low":
    default:
      return "Quick check";
  }
}

export function formatConcernOrigin(origin: "rule" | "ai" | "hybrid"): string {
  switch (origin) {
    case "rule":
      return "Rule-based";
    case "ai":
      return "Model assist";
    case "hybrid":
      return "Combined";
    default:
      return origin;
  }
}
