# RentFlag

**RentFlag** is a renter-focused web app that helps you make sense of apartment listings before you tour or pay application fees. It extracts structured facts from pasted text, runs a transparent checklist of common gaps and marketing patterns, and optionally uses an LLM to suggest tour questions—without treating the model as the source of truth.

---

## Project overview

RentFlag accepts listing content in three ways: **paste text**, **URL + pasted copy** (scraping-ready for later), or **screenshots** (with OCR stubbed for future work). It returns:

- A **structured fact table** (rent, fees, layout, utilities, etc.) with **confidence labels**
- Three **0–100 scores** plus a plain-language **fit summary**
- A **deterministic checklist** of patterns worth clarifying
- **Missing-field** memo and **tour questions** (templates ± optional AI)

The UI separates **facts parsed from your paste**, **inferred checklist items**, and **optional model notes** so outputs stay trustworthy and easy to explain.

---

## Why it exists

Rental listings are uneven: some ads hide fees, use net-effective rent math, or show “similar unit” photos. Renters lose time and money when they discover those details after a tour or at lease-signing. RentFlag is **decision-support**, not a chatbot: it combines **fast local parsing**, **repeatable rules**, and **light AI assist** so users walk in with a **short verification list** and **smarter questions**—without hallucinated dollar amounts.

---

## Main features

| Area | What it does |
|------|----------------|
| **Input** | Tabs: paste listing, link + notes, or 1–3 screenshot uploads (base64 to API; text still drives analysis). |
| **Extraction** | Regex/heuristics in `lib/extraction.ts` for rent, deposits, fees, beds/baths, sq ft, amenities, concessions, and common marketing phrases. Missing fields → *Not in text*, not errors. |
| **Checklist** | `lib/redFlags.ts` · `evaluateDeterministicConcerns()` flags issues (e.g. vague location, net-effective wording, missing deposit in text, preference mismatches). |
| **Scoring** | Three scores + overall fit tier (see below). Optional small deltas from the LLM (`±15` each), capped and merged with rules. |
| **AI (optional)** | `lib/llmClient.ts` — OpenAI or Groq chat completions for normalization patches, extra concerns grounded in text, `narrativeConcerns`, and question wording. **No API key** → rules + templates only. |
| **Renter profile** | Budget, take-home pay, move-in date, must-haves — used for **budget fit** and preference checks. |
| **Export** | Copy tour questions; download a plain-text summary. |

---

## Tech stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **React 18**
- **Serverless API**: `POST /app/api/analyze/route.ts` (Node runtime, Vercel-friendly)
- **LLM**: OpenAI or Groq via OpenAI-compatible `/v1/chat/completions` (`fetch`, no SDK required)

**Notable modules**

- `lib/analysis.ts` — Orchestrates extraction → concerns → scores → questions
- `lib/scoring.ts` + `lib/scoringModel.ts` — Scoring math and documented constants
- `lib/concernMerge.ts` — Rule-based concerns win on id; model adds new ids only
- `lib/tourQuestionFallbacks.ts` — Template tour questions when AI is off
- `lib/imageExtraction.ts` — Placeholder for future OCR/vision

---

## How the scoring works

All weights and thresholds live in **`lib/scoringModel.ts`** (easy to walk through in interviews).

### 1. Disclosure completeness (`transparencyScore`)

- Starts at **100**.
- Subtracts for **missing core fields** (rent, deposit, utilities, laundry, parking, lease term, sq ft, location)—capped so one bad listing cannot go infinitely negative.
- Subtracts for **marketing / hedge phrases** detected in text (e.g. “subject to change”, “starting at”)—again capped.
- Subtracts extra when specific **checklist ids** indicate opaque pricing or missing fees (see `CONCERN_IDS_AFFECTING_TRANSPARENCY`).
- **+ optional** `transparencyDelta` from the LLM (clamped).

### 2. Budget fit (`affordabilityScore`)

- Starts from a **neutral baseline** (`BUDGET_FIT_START`).
- If the user entered **max rent**: bonuses when rent is comfortably below max; penalties when over max or **near** the ceiling.
- If **take-home pay** is provided: adjustments using common **rent-to-income** bands (~28% / 33% / 40% as rough guardrails).
- Small penalty when the listing mentions **net-effective rent** or **fees without numbers** (harder to compare all-in cost).
- **+ optional** `affordabilityDelta` from the LLM (clamped).

### 3. Verification load (`riskScore` in JSON/API)

- Labeled **verification load** in the product: **higher = more to confirm with the landlord**, not a fraud score.
- Starts from a **baseline**, then adds points per **checklist severity** (low / medium / high weights) and per **marketing phrase** hit.
- **+ optional** `riskDelta` from the LLM (clamped).

### 4. Overall fit (`overallRecommendation`)

Derived from scores + **count of high-severity checklist items** (`FIT_ASSESSMENT_THRESHOLDS` in `scoringModel.ts`):

- **Needs deeper verification** — high verification load or several serious checklist items together.
- **Extra verification worth it** — moderate load, lower disclosure score, or budget stress.
- Otherwise **reasonable to keep exploring** (still: confirm material terms in writing).

Copy in the UI is intentionally **non-alarmist**; the math is transparent in code.

---

## How to run locally

**Requirements:** Node.js 18+ recommended.

```bash
git clone <your-repo-url>
cd RentFlag
npm install
cp .env.example .env.local
```

Add to **`.env.local`** (optional):

```env
# Use one or the other (Groq is checked first if both are set in code path)
GROQ_API_KEY=your_key
# GROQ_MODEL=llama-3.3-70b-versatile

# or
OPENAI_API_KEY=your_key
# OPENAI_MODEL=gpt-4o-mini
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **“Try messy ad”** / **“Try detailed ad”** to load samples without an API key.

**Production build**

```bash
npm run build
npm start
```

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Enables LLM enrichment (OpenAI) |
| `OPENAI_MODEL` | Optional (default `gpt-4o-mini`) |
| `GROQ_API_KEY` | Enables LLM enrichment (Groq) |
| `GROQ_MODEL` | Optional (default `llama-3.3-70b-versatile`) |

If **no** key is set, **extraction and the full rule checklist still run**; tour questions use **built-in templates** only.

---

## Deploy (e.g. Vercel)

1. Connect the repository.
2. Set the same env vars in the project settings.
3. Deploy — `app/api/analyze` runs as a serverless function (`runtime = nodejs`).

---

## Future improvements

- **URL scraping** — Replace “paste under URL” with resilient fetch + HTML/markdown extraction per source.
- **OCR / vision** — Wire `lib/imageExtraction.ts` to Textract, Vision API, or a multimodal model; keep the same analysis contract.
- **Persistence** — Saved analyses, PDF export, shareable links (with privacy controls).
- **Localization** — City-specific fee norms and copy.
- **Testing** — Snapshot tests for extraction + scoring given fixture listings; contract tests for API responses.
- **Accessibility & motion** — Reduced-motion variants, stronger focus states.

---

## Resume-ready project summary (short)

**RentFlag — Renter listing analysis tool (personal / portfolio)**  
Full-stack **Next.js 14** app with **TypeScript** and **Tailwind**: deterministic **regex extraction** and **rule engine** for apartment listings, three **documented scoring dimensions** (disclosure, budget fit, verification load), optional **OpenAI/Groq** enrichment for questions and soft copy, **Vercel-ready** serverless API, and a product UI that **separates facts from inferences**. Demonstrates **pragmatic ML use** (assistive, not sole source of truth), **clean module boundaries**, and **interview-friendly** scoring constants.

---

## License

MIT
