import { buildAnalysisSystemPrompt, buildAnalysisUserPayload } from "./aiPrompts";
import type {
  AiEnrichmentResult,
  AiSearchMatchIdea,
  ExtractedListing,
  RedFlag,
  RenterPreferences,
} from "./types";

function sanitizeMatchIdea(candidate: unknown): AiSearchMatchIdea | null {
  if (!candidate || typeof candidate !== "object") return null;
  const row = candidate as Record<string, unknown>;
  const headline = typeof row.headline === "string" ? row.headline.trim().slice(0, 140) : "";
  const neighborhoodOrArea =
    typeof row.neighborhoodOrArea === "string" ? row.neighborhoodOrArea.trim().slice(0, 100) : "";
  const whyFitsBetter = typeof row.whyFitsBetter === "string" ? row.whyFitsBetter.trim().slice(0, 320) : "";
  const rawTips = Array.isArray(row.searchTips) ? row.searchTips : [];
  const searchTips = rawTips
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().slice(0, 140))
    .filter(Boolean)
    .slice(0, 5);
  if (!headline || !whyFitsBetter) return null;
  return {
    headline,
    neighborhoodOrArea: neighborhoodOrArea || "Same city / nearby",
    whyFitsBetter,
    searchTips,
  };
}

function sanitizeRedFlag(candidate: unknown): RedFlag | null {
  if (!candidate || typeof candidate !== "object") return null;
  const flag = candidate as Record<string, unknown>;
  const severity = flag.severity;
  if (severity !== "low" && severity !== "medium" && severity !== "high") return null;
  if (typeof flag.id !== "string" || typeof flag.title !== "string") return null;
  if (typeof flag.explanation !== "string" || typeof flag.recommendation !== "string") return null;
  return {
    id: flag.id,
    title: flag.title,
    severity,
    explanation: flag.explanation,
    recommendation: flag.recommendation,
    origin: "ai",
  };
}
import { mergeExtractedPatches } from "./extraction";

type Provider = "openai" | "groq";

function detectProvider(): Provider | null {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

function parseJsonResponse(content: string): AiEnrichmentResult | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as AiEnrichmentResult;
    const rawFlags = Array.isArray(parsed.additionalRedFlags) ? parsed.additionalRedFlags : [];
    const rawIdeas = Array.isArray(parsed.alternativeMatchIdeas) ? parsed.alternativeMatchIdeas : [];
    const intro =
      typeof parsed.alternativeMatchesIntro === "string"
        ? parsed.alternativeMatchesIntro.trim().slice(0, 240)
        : "";
    return {
      normalizedFieldsPatch: parsed.normalizedFieldsPatch ?? {},
      additionalRedFlags: rawFlags.map(sanitizeRedFlag).filter(Boolean) as RedFlag[],
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
      narrativeConcerns: Array.isArray(parsed.narrativeConcerns) ? parsed.narrativeConcerns : [],
      alternativeMatchIdeas: rawIdeas.map(sanitizeMatchIdea).filter(Boolean) as AiSearchMatchIdea[],
      alternativeMatchesIntro: intro || undefined,
      scoreAdjustments: parsed.scoreAdjustments,
    };
  } catch {
    return null;
  }
}

async function postChatCompletions(
  url: string,
  headers: Record<string, string>,
  body: object
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LLM error ${response.status}: ${detail.slice(0, 500)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty LLM response");
  return text;
}

export type AiAdjustments = {
  transparencyDelta: number;
  riskDelta: number;
  affordabilityDelta: number;
};

export async function runListingEnrichment(args: {
  listingText: string;
  extracted: ExtractedListing;
  preferences: RenterPreferences;
}): Promise<{
  mergedExtracted: ExtractedListing;
  aiFlags: RedFlag[];
  questions: string[];
  concerns: string[];
  adjustments: AiAdjustments;
  alternativeMatchIdeas: AiSearchMatchIdea[];
  alternativeMatchesIntro?: string;
}> {
  const provider = detectProvider();
  if (!provider) {
    throw new Error("No LLM API key configured");
  }

  const system = buildAnalysisSystemPrompt();
  const user = buildAnalysisUserPayload(args);

  let raw: string;
  if (provider === "groq") {
    raw = await postChatCompletions(
      "https://api.groq.com/openai/v1/chat/completions",
      { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      {
        model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }
    );
  } else {
    raw = await postChatCompletions(
      "https://api.openai.com/v1/chat/completions",
      { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      {
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }
    );
  }

  const parsed = parseJsonResponse(raw);
  if (!parsed) {
    throw new Error("Could not parse LLM JSON");
  }

  const mergedExtracted = mergeExtractedPatches(args.extracted, parsed.normalizedFieldsPatch ?? {});
  const adj = parsed.scoreAdjustments ?? {};

  return {
    mergedExtracted,
    aiFlags: (parsed.additionalRedFlags ?? []).map((flag) => ({
      ...flag,
      origin: "ai" as const,
    })),
    questions: parsed.suggestedQuestions ?? [],
    concerns: parsed.narrativeConcerns ?? [],
    alternativeMatchIdeas: parsed.alternativeMatchIdeas ?? [],
    alternativeMatchesIntro: parsed.alternativeMatchesIntro,
    adjustments: {
      transparencyDelta: clampDelta(adj.transparencyDelta),
      riskDelta: clampDelta(adj.riskDelta),
      affordabilityDelta: clampDelta(adj.affordabilityDelta),
    },
  };
}

function clampDelta(value: unknown): number {
  const numberValue = typeof value === "number" ? value : 0;
  return Math.max(-15, Math.min(15, Math.round(numberValue)));
}
