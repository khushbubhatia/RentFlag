import { NextResponse } from "next/server";
import { analyzeListingPayload } from "@/lib/analysis";
import { fetchListingTextFromUrl } from "@/lib/fetchListingFromUrl";
import type { AnalysisInputMode, RenterPreferences } from "@/lib/types";
import { defaultRenterPreferences } from "@/lib/types";

export const runtime = "nodejs";
/** Allow up to 60s on Vercel (default 10s would time out Firecrawl + LLM on heavy listings). */
export const maxDuration = 60;

type AnalyzeRequestBody = {
  mode?: AnalysisInputMode;
  listingText?: string;
  listingUrl?: string;
  imagesBase64?: string[];
  preferences?: Partial<RenterPreferences>;
};

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode ?? "text";
  let listingText = body.listingText ?? "";
  const listingUrl = body.listingUrl ?? "";
  const imageCount = Array.isArray(body.imagesBase64) ? body.imagesBase64.length : 0;
  let listingSourceNote: string | undefined;

  if (mode === "text" && !listingText.trim() && imageCount === 0) {
    return NextResponse.json(
      { error: "Add listing text, a URL with notes, or at least one screenshot." },
      { status: 400 }
    );
  }

  if (mode === "url" && !listingUrl.trim() && !listingText.trim() && imageCount === 0) {
    return NextResponse.json(
      { error: "Paste a listing URL, or add text or a screenshot." },
      { status: 400 }
    );
  }

  if (mode === "screenshots" && imageCount === 0 && !listingText.trim()) {
    return NextResponse.json(
      { error: "Upload at least one screenshot or paste listing text." },
      { status: 400 }
    );
  }

  if (mode === "url" && listingUrl.trim() && !listingText.trim()) {
    const fetched = await fetchListingTextFromUrl(listingUrl);
    listingText = fetched.text;
    if (fetched.note) {
      listingSourceNote = fetched.note;
    }
    if (!listingText.trim() && imageCount === 0) {
      return NextResponse.json(
        {
          error:
            "We couldn’t read listing text from that link (many sites block or require a login). Paste the body of the ad below the URL and run again.",
        },
        { status: 400 }
      );
    }
  }

  const preferences: RenterPreferences = {
    ...defaultRenterPreferences,
    ...body.preferences,
  };

  const hasApiKey = Boolean(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);

  try {
    const result = await analyzeListingPayload({
      mode,
      listingText,
      listingUrl: mode === "url" ? listingUrl : undefined,
      imageCount,
      preferences,
      enableAi: hasApiKey,
      listingSourceNote,
    });

    return NextResponse.json({ ...result, llmConfigured: hasApiKey });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
