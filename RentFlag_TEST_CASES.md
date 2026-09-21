# RentFlag: Manual Test Cases

**App:** https://rentflag.vercel.app
**Tester:** Khushbu Bhatia
**Scope:** Input, extraction, checklist, scoring, AI fallback and export
**How to use:** Run each case, then change "Not run" to Pass or Fail. Log every failure in RentFlag_BUG_REPORTS.md.
**Priority:** High cases are the core flow. Run those first.

| ID | Priority | Area | Scenario | Steps | Expected result | Result |
|----|----------|------|----------|-------|-----------------|--------|
| RF-01 | High | Input | Detailed listing sample | Tap "Try detailed ad", run the analysis | Fact table is filled, three scores show between 0 and 100, fit summary is shown | Not run |
| RF-02 | High | Input | Messy listing sample | Tap "Try messy ad", run the analysis | Analysis finishes with no error, checklist shows several items, missing fields show "Not in text" | Not run |
| RF-03 | High | Input | Empty input | Leave the paste box empty, run the analysis | No crash, a clear message asks for listing text, no scores are shown | Not run |
| RF-04 | Medium | Input | Very short text | Paste "2 bed apartment" and run | No crash, most fields show "Not in text", disclosure score is low | Not run |
| RF-05 | Medium | Input | Link plus pasted notes | Open the link tab, enter a URL, paste listing text, run | Analysis uses the pasted text, the link is not scraped | Not run |
| RF-06 | Medium | Input | Screenshot upload limit | Upload 1, then 3, then try a 4th screenshot | 1 to 3 files are accepted, the 4th is blocked or ignored with clear feedback | Not run |
| RF-07 | Low | Input | Special characters | Paste a listing with $, emoji and line breaks | No crash, rent is still read correctly | Not run |
| RF-08 | Low | Input | Very long text | Paste about 10,000 characters and run | Finishes in a reasonable time, page does not freeze | Not run |
| RF-09 | High | Extraction | Rent | Paste "Rent: $1,850/month" with other text | Rent shows as 1,850 with a confidence label | Not run |
| RF-10 | High | Extraction | Missing fields | Paste a listing with no deposit and no parking | Missing fields show "Not in text", no error and no guessed value | Not run |
| RF-11 | Medium | Extraction | Beds, baths, size | Paste "2 bed / 1.5 bath, 900 sq ft" | All three values are read correctly | Not run |
| RF-12 | Medium | Extraction | Deposit and fees | Paste "Security deposit $1,000, pet fee $50/month" | Deposit and pet fee are shown as separate items | Not run |
| RF-13 | Medium | Extraction | Concessions | Paste "1 month free on a 12 month lease" | The concession is detected and shown | Not run |
| RF-14 | High | Checklist | Net-effective wording | Paste a listing that says "net effective rent" | Checklist flags the net-effective pricing | Not run |
| RF-15 | High | Checklist | Missing deposit | Paste a listing that never mentions a deposit | Checklist flags the missing deposit | Not run |
| RF-16 | Medium | Checklist | Vague location | Paste a listing with no address or neighborhood | Checklist flags the vague location | Not run |
| RF-17 | Medium | Checklist | Hedge phrases | Paste "starting at $1,500, subject to change" | Hedge phrases are detected and the disclosure score goes down | Not run |
| RF-18 | Medium | Checklist | Repeatable result | Run the same listing twice | Checklist and scores are identical both times | Not run |
| RF-19 | High | Scoring | Score range | Run five different listings | All three scores stay between 0 and 100 | Not run |
| RF-20 | High | Scoring | Budget fit with max rent | Set max rent to $1,500, analyze a $2,200 listing, then a $1,000 listing | Budget fit is lower for the $2,200 listing | Not run |
| RF-21 | Medium | Scoring | Take-home pay | Enter take-home pay, analyze rent above 40% of it, then below 28% | Budget fit is lower for the higher share | Not run |
| RF-22 | Medium | Scoring | Complete vs incomplete | Compare the detailed sample with the messy sample | Detailed sample has a higher disclosure score and a lower verification load | Not run |
| RF-23 | Medium | Scoring | Overall fit message | Run a clean listing and a messy listing | Messy one gives a stronger "verify more" message than the clean one | Not run |
| RF-24 | High | AI fallback | No API key | Run an analysis with no API key set | Extraction, checklist, scores and template tour questions all still work | Not run |
| RF-25 | High | AI fallback | No invented amounts | Run with AI on, using a listing that lists no fees | Tour questions and notes show no dollar amounts that are not in the listing | Not run |
| RF-26 | Medium | Output | Separate sections | Read a full result | Parsed facts, checklist items and AI notes are in separate sections | Not run |
| RF-27 | Medium | Export | Copy tour questions | Tap the copy button | Questions are copied and a confirmation shows | Not run |
| RF-28 | Medium | Export | Download summary | Tap the download button | A plain-text summary downloads and matches the screen | Not run |
| RF-29 | Low | UI | Mobile layout | Open the live site on a phone | No sideways scrolling and all buttons can be tapped | Not run |
| RF-30 | Low | UI | Double tap | Tap the analyze button twice quickly | It runs once, with no duplicate or broken result | Not run |
| RF-31 | Medium | Checklist | Must-have mismatch | Add "parking" as a must-have, analyze a listing with no parking | Checklist flags the mismatch with the renter's must-have | Not run |

**Notes**
- Test cases were written from the RentFlag feature list. If the app words a result differently, change the expected result to match what the app should do.
- Total: 31 cases, 11 High priority.
