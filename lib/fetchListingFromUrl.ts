/**
 * Best-effort HTML → text for listing URLs. Many sites block bots, require JS, or rate-limit;
 * callers should always allow the user to paste text as a fallback.
 *
 * Order of attempts:
 *   1. Firecrawl (if FIRECRAWL_API_KEY is set) — handles JS-rendered pages like Zillow.
 *   2. Plain server-side fetch — works for simple HTML listings (Craigslist, small portals).
 */

const MAX_HTML_BYTES = 512_000;
const FETCH_TIMEOUT_MS = 12_000;
const FIRECRAWL_TIMEOUT_MS = 30_000;
const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v1/scrape";

function stripHtmlToPlainText(html: string): string {
  let fragment = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  fragment = fragment.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  fragment = fragment.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");
  fragment = fragment.replace(/<[^>]+>/g, " ");
  fragment = fragment.replace(/&nbsp;/gi, " ");
  fragment = fragment.replace(/&amp;/g, "&");
  fragment = fragment.replace(/&lt;/g, "<");
  fragment = fragment.replace(/&gt;/g, ">");
  fragment = fragment.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  fragment = fragment.replace(/\s+/g, " ").trim();
  return fragment;
}

export type ListingUrlFetchResult = {
  text: string;
  /** Shown in UI when fetch is partial or unreliable */
  note?: string;
};

async function fetchViaFirecrawl(url: string): Promise<ListingUrlFetchResult | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS);

  try {
    const response = await fetch(FIRECRAWL_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: FIRECRAWL_TIMEOUT_MS - 2_000,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as {
      success?: boolean;
      data?: { markdown?: string };
    };

    const markdown = data?.data?.markdown?.trim() ?? "";
    if (!data?.success || markdown.length < 120) return null;

    return {
      text: markdown.slice(0, 80_000),
      note: "Loaded via Firecrawl (handles JS-heavy listing sites). If something looks off, paste the ad text yourself.",
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export async function fetchListingTextFromUrl(listingUrl: string): Promise<ListingUrlFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(listingUrl.trim());
  } catch {
    return { text: "", note: "That URL doesn’t look valid. Check the link or paste the listing text." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { text: "", note: "Only http(s) links are supported." };
  }

  const viaFirecrawl = await fetchViaFirecrawl(parsed.toString());
  if (viaFirecrawl) return viaFirecrawl;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RentFlag/1.0; +https://github.com/) AppleWebKit-like listing preview",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        text: "",
        note: `The site responded with ${response.status}. Paste the listing text manually—many portals block automated requests.`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        text: "",
        note: "The URL didn’t return HTML we can parse. Copy the listing text from the page instead.",
      };
    }

    const buffer = await response.arrayBuffer();
    const clipped = buffer.byteLength > MAX_HTML_BYTES ? buffer.slice(0, MAX_HTML_BYTES) : buffer;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(clipped);
    const text = stripHtmlToPlainText(html).slice(0, 80_000);

    if (text.length < 120) {
      return {
        text,
        note: "Very little text came back—the page may need JavaScript or a login. Pasting the ad body below will give a full RentFlag review.",
      };
    }

    return {
      text,
      note: "Loaded text from the URL automatically. If anything looks off, paste the listing yourself—some sites trim or block scrapers.",
    };
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : "Request failed";
    const aborted =
      (error instanceof Error && error.name === "AbortError") || message.toLowerCase().includes("abort");
    return {
      text: "",
      note: aborted
        ? "Fetching the page timed out. Paste the listing text, or try again on a faster connection."
        : `Could not load the page (${message}). Paste the listing text—this is common for rental sites.`,
    };
  }
}
