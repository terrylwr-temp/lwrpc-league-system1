# LMS-0735 / 0.1.557 — local correction validation

**PASS — 1,236/1,236 automated tests; 16/16 final-code OpenAI cases. Not deployed.**

LMS-0735 is the corrected local candidate following the failed LMS-0734 / 0.1.556 validation. Full lint passes with zero errors and 11 existing warnings; production build passes. No SQL, RLS/security, document activation, production configuration or business-data changes. Only active official-document reads and model calls were used. Incidental contact details were omitted from outbound validation payloads.

## Exact corrections

### Temporal context

The source has no explicit year on the Saturday February date. Its title is **2026 Fall League Important Dates**. The same active chunk contains October season starts, December end-of-first-half dates, January second-half dates and then **Feb. 20 / 27 — End of Regular Season**. The old generic semantic path supplied the document-wide 2026 year but lacked event-level chronology; generation incorrectly used that year for February.

A shared temporal-context function now reads revalidated source text and records each dated event with its source offsets, anchor, calendar year and derivation. Explicit event years override inherited years. Section/source headings override a document-wide anchor when they provide a year. Ordered year-boundary transitions advance the year; ambiguous unordered dates remain unknown. The established date selector and generic semantic path use the same chronology. No system clock or league-specific dates are used. Original source wording remains intact. Chronology is included in the generation prompt and admin diagnostics.

Tests cover same-year dates, December-to-January rollover, explicit years, heading-only years, two-year timelines, unknown/unordered dates, nullable stored headings and exact source offsets. A null-heading edge case found in the full suite was corrected; the final full suite passes.

### Evidence-reference contract

Previously `chunkIds` was an unconstrained array of arbitrary strings. Candidate IDs were already server-owned UUIDs and deduplication preceded assessment; there was no numerical-index-to-ID conversion. The previous failure diagnostic discarded the rejected list, so it is not possible to retrospectively distinguish a fabricated/malformed UUID, duplicate or excessive selection from that historical record. There is no demonstrated stale-ID/reranking bug. The confirmed upstream weakness was the unconstrained schema and lack of a bounded repair path.

The OpenAI schema now enumerates only the exact current candidate IDs and limits selection to four. The server independently rejects unknown, duplicate, malformed, excessive, empty-supported or unsupported-with-IDs results. One repair attempt reassesses the same candidate snapshot and receives only a validation reason; it never maps or fabricates an ID. A second invalid result still fails closed. Diagnostics retain attempt counts, rejected IDs and precise rejection categories. Tests verify schema allowlisting, rejection and successful repair of an invalid ID without discarding a valid qualifying source.

### Rescue diagnostics

Rescue now records considered, triggered, queries executed, candidates returned, evidence selected and selected candidate IDs. `rescueRan` is true only when a protected hybrid search call is initiated after embedding, including an attempted call that returns an error; each path separately records completed/failed status. It is not set by evaluating a branch or generating terms. Candidate/evidence counts are checked against actual path results. If all model rescue variants are filtered out, one bounded query can be built from the interpreted entities/nouns/concepts. No example-specific phrase is added.

The final 16-case audit verifies execution counts, returned candidate counts and selected-ID membership against the recorded paths. Known successful legacy cases continue to show no rescue considered/triggered/executed.

## Before / after

### Saturday regular-season end

**Question:** When does the Saturday regular competition wrap up?

**Before answer:** For the 2026 Fall Saturday DUPR League, the regular season ends Feb. 20 / 27, 2026.

**After answer:** The Saturday DUPR regular season wraps up on Feb. 20 / 27, 2027, for the 2026 Fall League season.

**Same authoritative source:**
2026 Fall League Important Dates, page 1; chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`, active version `f811e60f-9af8-444f-b009-9594a530acd6`.

```text
Saturday DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 17 - Saturday DUPR7 Season Starts
• Oct. 24 - Saturday DUPR6 / DUPR8 Season Starts
• Nov. 25 / 26 Break Week
• Dec. 5 / 12 - Last games of 1st half / break
• Jan. 9 / 16 - Start of 2nd half
• Feb. 20 / 27 - End of Regular Season
• Mar. 6 / 13 - Championship Days (PlayoƯs with top 4 teams)
• Jamboree - Mar. 20 / 27
Note:
No games the week of Nov. 22 for Thanksgiving Break
No games after Dec. 13 – Jan. 8 for Christmas Break
```

**Verified year trace:**
```json
[
  {
    "chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f",
    "events": [
      {
        "sourceText": "\u2022 Sept. 7, Monday \u2013 Open Registration",
        "start": 31,
        "end": 68,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Sept. 27, Sunday \u2013 Season DUPR ratings recorded",
        "start": 69,
        "end": 118,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Sept. 28, Monday - Can start updating rosters",
        "start": 119,
        "end": 166,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Oct. 4, Sunday \u2013 Last day to register",
        "start": 167,
        "end": 206,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Oct. 7, Wednesday \u2013 Schedules completed and sent",
        "start": 207,
        "end": 257,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Oct. 17 - Saturday DUPR7 Season Starts",
        "start": 258,
        "end": 298,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Oct. 24 - Saturday DUPR6 / DUPR8 Season Starts",
        "start": 299,
        "end": 347,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Nov. 25 / 26 Break Week",
        "start": 348,
        "end": 373,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Dec. 5 / 12 - Last games of 1st half / break",
        "start": 374,
        "end": 420,
        "calendarYear": "2026",
        "derivation": "source_heading_year",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 0
      },
      {
        "sourceText": "\u2022 Jan. 9 / 16 - Start of 2nd half",
        "start": 421,
        "end": 454,
        "calendarYear": "2027",
        "derivation": "ordered_source_month_rollover",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 1
      },
      {
        "sourceText": "\u2022 Feb. 20 / 27 - End of Regular Season",
        "start": 455,
        "end": 493,
        "calendarYear": "2027",
        "derivation": "ordered_source_month_rollover",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 1
      },
      {
        "sourceText": "\u2022 Mar. 6 / 13 - Championship Days (Playo\u01afs with top 4 teams)",
        "start": 494,
        "end": 554,
        "calendarYear": "2027",
        "derivation": "ordered_source_month_rollover",
        "anchorYears": [
          2026
        ],
        "anchor": {
          "source": "document_title",
          "calendarYear": "2026"
        },
        "rollovers": 1
      }
    ]
  }
]
```

### Scoring sheet

**Before:** fallback; `INVALID_EVIDENCE_IDS`. This was also a baseline defect, not a newly introduced regression.

**After:** Captains can find it in the League Management System on the Captain Dashboard, in the “Next Match” / “Upcoming Matches” area. Use the “Print Match Score Sheet” button.

It is ready to print once both teams have completed Match Setup/entered their lineups; until then, the button stays red and the sheet may be incomplete or unavailable.

Validated selected IDs: `8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2`, `1b89a6d2-c608-4ada-8a89-bf37dc2dc240`.

### Rescue reporting

**Before exact-question diagnostic:** `rescueRan=true`, but zero rescue queries were executed.

**After exact-question diagnostic:**
```json
{
  "considered": true,
  "triggered": true,
  "queriesExecuted": 1,
  "candidatesReturned": 32,
  "evidenceSelected": true,
  "selectedCandidateIds": [
    "950a54ab-aa3b-4f43-9c51-88ce0ca803ae"
  ]
}
```

## Final 16-case results

| Case | Result | Fallback | Rescue queries | Answer |
|---|---|---|---|---|
| exact | PASS | False | 1 | For the 2026 Fall PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026. |
| variant_sent | PASS | False | 0 | PrimeTime schedules are to be completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League Important Dates season. |
| variant_available | PASS | False | 0 | PrimeTime schedules are completed and sent on Oct. 7, 2026, for the 2026 Fall League Important Dates season. |
| variant_captains | PASS | False | 0 | For the 2026 Fall PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026. |
| weekday_open | PASS | False | 1 | Weekday DUPR League open registration begins Monday, Sept. 7, 2026. |
| saturday_close | PASS | False | 1 | The last day to sign up for the Saturday DUPR League is Sunday, Oct. 4, 2026. |
| weekday_start | PASS | False | 0 | The Weekday DUPR Season starts Oct. 14, 2026 for Women and Oct. 15, 2026 for Men, for the 2026 Fall League. |
| saturday_end | PASS | False | 1 | The Saturday DUPR regular season wraps up on Feb. 20 / 27, 2027, for the 2026 Fall League season. |
| weekday_championship | PASS | False | 1 | The Weekday DUPR title decider is on the Championship Days: Dec. 9/10, 2026, for the 2026 Fall League. |
| unknown_paraphrase | PASS | False | 1 | PrimeTime’s fixture list is scheduled to be completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League. |
| rules_control | PASS | False | 0 | No. In the Saturday league, all gender-based games are submitted and posted to DUPR, but mixed doubles games and any Picklebreaker™ games are not submitted or posted to DUPR. |
| rules_rating | PASS | False | 1 | No. Season DUPR ratings are not rounded up or down. They are truncated to the nearest tenth: for example, 3.496 becomes 3.4, and 3.401 also becomes 3.4. |
| captains_control | PASS | False | 2 | Captains can find it in the League Management System on the Captain Dashboard, in the “Next Match” / “Upcoming Matches” area. Use the “Print Match Score Sheet” button.  It is ready to print once both teams have completed Match Setup/entered their lineups; until then, the button stays red and the sheet may be incomplete or unavailable. |
| captains_ball | PASS | False | 0 | The league will provide Franklin Outdoor X-40 optic yellow balls for all regular-season and playoff matches. |
| lms_control | PASS | False | 0 | To complete Match Setup in the LMS:  1. Log in to the LMS and use the Match Setup button for the upcoming match. 2. Enter your match roster/starting lineup by assigning player pairings. 3. Save the lineup using Save Match Setup. 4. Do this no later than three (3) days before the scheduled match. Both home and visiting captains must submit their lineups; it is strongly recommended that the Home Team submit first. 5. If you make any lineup or roster changes after the initial submission, enter them through Match Setup. The LMS will automatically notify the opposing captain(s). 6. Watch the button/status indicators: Match Setup shows red if incomplete and blue once completed. When both teams have completed Match Setup, the Match Score Sheet button turns green and a complete match score sheet can be printed.  The LMS validates entries, including division/rating requirements, roster membership, duplicates, and team-rating maximums. Repeated failure to complete Match Setup on time may result in forfeiture of the current or future matches, at League Management’s discretion. |
| unsupported_control | PASS | True | 2 | I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification. |

The unsupported-topic case passes by selecting no evidence and returning the expected fallback. Rules posting/rounding, Captains Guide ball, LMS Match Setup and all four PrimeTime questions pass. No false-positive answer or unsupported evidence selection was observed in the final run.

## Per-case retrieval and evidence details

### exact

**Original:** when does the primetime league get their schedules

**Interpretation:** `{"intent": "Find the date or timing when the primetime league receives or is issued its schedules.", "factType": "schedule release timing/date", "entities": ["primetime league"], "nouns": ["schedules"], "concepts": ["schedule release", "schedule publication", "league schedule availability", "important dates", "timeline"], "normalizedQuestion": "When does the primetime league receive its schedules?", "queries": ["\"primetime league\" schedules release date timing", "\"primetime league\" schedule publication availability"], "rescueQueries": ["primetime league important dates schedule"], "documentAffinities": ["league_supplement", "league_rules"]}`

**Top original evidence:** `{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "documentVersionId": "f811e60f-9af8-444f-b009-9594a530acd6", "documentTitle": "2026 Fall League Important Dates", "heading": "PrimeTime DUPR League Key Dates", "ruleNumber": "", "pageNumber": 2, "score": 0.7566, "content": "PrimeTime DUPR League Key Dates\n• Sept. 7, Monday – Open Registration\n• Sept. 27, Sunday – Season DUPR ratings recorded\n• Sept. 28, Monday - Can start updating rosters\n• Oct. 4, Sunday – Last day to register (4 weeks)\n• Oct. 7, Wednesday – Schedules completed and sent\n• Oct. 16 - PrimeTime League Starts\n• Nov. 25/26 Break Week\n• Dec. 4 - PrimeTime League Regular Season Ends\n• Dec. 11 - PrimeTime League Championship Day\nNote: No games the week of Nov. 22 (Thanksgiving Break)"}`

**Executed expansion/rescue paths:**
- expanded: When does the primetime league receive its schedules?; query executed=True; completed; 32 candidates.
- expanded: "primetime league" schedules release date timing; query executed=True; completed; 32 candidates.
- rescue: primetime league important dates schedule; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "304529b8-1c7f-4206-b6b6-a36f1cc3d909", "86cd1b2b-55ad-46d2-af2f-9ea3a18f2143", "5b432210-b886-44b6-a6e4-5b2312b07dee", "2eafc19f-f9c2-4b44-9ebd-0b5bb4b4f84e", "98abadef-5153-483a-ab64-51be0c95480b", "b1c966a2-4f36-4446-911c-403c7e850369", "64422f2c-e9ee-40b1-8407-d61abae35e09", "da71cb2a-e2b8-4198-adee-b91e01bd8919", "bddfae38-0a1b-47da-b1a4-d66e26bfb479", "2d77168a-9cfd-410d-811d-ab419867763d", "d6b9a348-9118-474d-96d4-1c7fea3b926c"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["950a54ab-aa3b-4f43-9c51-88ce0ca803ae"], "usage": {"input_tokens": 4069, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 464, "output_tokens_details": {"reasoning_tokens": 393}, "total_tokens": 4533}}], "reason": "The excerpt directly states the 2026 Fall PrimeTime DUPR League key date when schedules are completed and sent.", "usage": {"input_tokens": 4069, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 464, "output_tokens_details": {"reasoning_tokens": 393}, "total_tokens": 4533}}, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / PrimeTime DUPR League Key Dates / page 2 / `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` / score 0.7656.

```text
PrimeTime DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register (4 weeks)
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 16 - PrimeTime League Starts
• Nov. 25/26 Break Week
• Dec. 4 - PrimeTime League Regular Season Ends
• Dec. 11 - PrimeTime League Championship Day
Note: No games the week of Nov. 22 (Thanksgiving Break)
```

**Generated answer:** For the 2026 Fall PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026.

**Fallback:** False; **review:** supported by selected active official evidence.

### variant_sent

**Original:** when will PrimeTime schedules be sent out

**Interpretation:** `{"kind": "policy_date", "object": "schedule_release", "leagues": ["primetime"], "season": null, "policyYear": null, "contextConflict": false, "event": "schedule_release", "matchingQuestion": "when will primetime schedules be sent out"}`

**Top original evidence:** `{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "documentVersionId": "f811e60f-9af8-444f-b009-9594a530acd6", "documentTitle": "2026 Fall League Important Dates", "heading": "PrimeTime DUPR League Key Dates", "ruleNumber": "", "pageNumber": 2, "score": 0.5112, "content": "PrimeTime DUPR League Key Dates\n• Sept. 7, Monday – Open Registration\n• Sept. 27, Sunday – Season DUPR ratings recorded\n• Sept. 28, Monday - Can start updating rosters\n• Oct. 4, Sunday – Last day to register (4 weeks)\n• Oct. 7, Wednesday – Schedules completed and sent\n• Oct. 16 - PrimeTime League Starts\n• Nov. 25/26 Break Week\n• Dec. 4 - PrimeTime League Regular Season Ends\n• Dec. 11 - PrimeTime League Championship Day\nNote: No games the week of Nov. 22 (Thanksgiving Break)"}`

**Executed expansion/rescue paths:**

**Applicability:** `{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": null, "scope": ["primetime"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "98abadef-5153-483a-ab64-51be0c95480b", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "d6b9a348-9118-474d-96d4-1c7fea3b926c", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "c5792642-352c-49fa-a5c0-11399754fefe", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}, {"chunkId": "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "282fa8f4-d1bf-4351-902a-29507ea31937", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 115}, "semantic": null, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / PrimeTime DUPR League Key Dates / page 2 / `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` / score structural completion.

```text
• Oct. 7, Wednesday – Schedules completed and sent
```

**Generated answer:** PrimeTime schedules are to be completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League Important Dates season.

**Fallback:** False; **review:** supported by selected active official evidence.

### variant_available

**Original:** what date are the PrimeTime schedules available

**Interpretation:** `{"kind": "policy_date", "object": "schedule_release", "leagues": ["primetime"], "season": null, "policyYear": null, "contextConflict": false, "event": "schedule_release", "matchingQuestion": "what date are the primetime schedules available"}`

**Top original evidence:** `{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "documentVersionId": "f811e60f-9af8-444f-b009-9594a530acd6", "documentTitle": "2026 Fall League Important Dates", "heading": "PrimeTime DUPR League Key Dates", "ruleNumber": "", "pageNumber": 2, "score": 0.5078, "content": "PrimeTime DUPR League Key Dates\n• Sept. 7, Monday – Open Registration\n• Sept. 27, Sunday – Season DUPR ratings recorded\n• Sept. 28, Monday - Can start updating rosters\n• Oct. 4, Sunday – Last day to register (4 weeks)\n• Oct. 7, Wednesday – Schedules completed and sent\n• Oct. 16 - PrimeTime League Starts\n• Nov. 25/26 Break Week\n• Dec. 4 - PrimeTime League Regular Season Ends\n• Dec. 11 - PrimeTime League Championship Day\nNote: No games the week of Nov. 22 (Thanksgiving Break)"}`

**Executed expansion/rescue paths:**

**Applicability:** `{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": null, "scope": ["primetime"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "98abadef-5153-483a-ab64-51be0c95480b", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "b1c966a2-4f36-4446-911c-403c7e850369", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "d6b9a348-9118-474d-96d4-1c7fea3b926c", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "da71cb2a-e2b8-4198-adee-b91e01bd8919", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 116}, "semantic": null, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / PrimeTime DUPR League Key Dates / page 2 / `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` / score structural completion.

```text
• Oct. 7, Wednesday – Schedules completed and sent
```

**Generated answer:** PrimeTime schedules are completed and sent on Oct. 7, 2026, for the 2026 Fall League Important Dates season.

**Fallback:** False; **review:** supported by selected active official evidence.

### variant_captains

**Original:** when do captains get the PrimeTime schedule

**Interpretation:** `{"kind": "policy_date", "object": "schedule_release", "leagues": ["primetime"], "season": null, "policyYear": null, "contextConflict": false, "event": "schedule_release", "matchingQuestion": "when do captains get the primetime schedule"}`

**Top original evidence:** `{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "documentVersionId": "f811e60f-9af8-444f-b009-9594a530acd6", "documentTitle": "2026 Fall League Important Dates", "heading": "PrimeTime DUPR League Key Dates", "ruleNumber": "", "pageNumber": 2, "score": 0.4934, "content": "PrimeTime DUPR League Key Dates\n• Sept. 7, Monday – Open Registration\n• Sept. 27, Sunday – Season DUPR ratings recorded\n• Sept. 28, Monday - Can start updating rosters\n• Oct. 4, Sunday – Last day to register (4 weeks)\n• Oct. 7, Wednesday – Schedules completed and sent\n• Oct. 16 - PrimeTime League Starts\n• Nov. 25/26 Break Week\n• Dec. 4 - PrimeTime League Regular Season Ends\n• Dec. 11 - PrimeTime League Championship Day\nNote: No games the week of Nov. 22 (Thanksgiving Break)"}`

**Executed expansion/rescue paths:**

**Applicability:** `{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": null, "scope": ["primetime"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "98abadef-5153-483a-ab64-51be0c95480b", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "b1c966a2-4f36-4446-911c-403c7e850369", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "07463ae2-a809-4a86-b77e-4fa022176b07", "versionId": "7ec16cf5-7b9d-4b3b-a847-8dd5767396c7", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 112}, "semantic": null, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / PrimeTime DUPR League Key Dates / page 2 / `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` / score structural completion.

```text
• Oct. 7, Wednesday – Schedules completed and sent
```

**Generated answer:** For the 2026 Fall PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026.

**Fallback:** False; **review:** supported by selected active official evidence.

### weekday_open

**Original:** What is the Weekday sign-up opening date?

**Interpretation:** `{"intent": "Find the date when Weekday sign-up opens.", "factType": "date", "entities": ["Weekday"], "nouns": ["sign-up", "opening date"], "concepts": ["registration", "enrollment", "signup opens", "registration opens", "important dates", "schedule", "calendar"], "normalizedQuestion": "What is the Weekday sign-up opening date?", "queries": ["Weekday sign-up opening date registration opens", "Weekday signup opens important dates schedule"], "rescueQueries": ["Weekday registration enrollment dates"], "documentAffinities": ["league_supplement", "player_guide"]}`

**Top original evidence:** `{"chunkId": "79bb9ba4-b80b-419a-b631-b041ed00d6e2", "documentVersionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "documentTitle": "LWR Pickleball Club DUPR League Rules", "heading": "Weekday League Weekday League", "ruleNumber": "", "pageNumber": 13, "score": 0.4347, "content": "Weekday League Weekday League\n(9.1)"}`

**Executed expansion/rescue paths:**
- expanded: Weekday sign-up opening date registration opens; query executed=True; completed; 32 candidates.
- rescue: Weekday registration enrollment dates; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["c4ab8544-decb-4ea1-b856-2df4a2d196f1", "79bb9ba4-b80b-419a-b631-b041ed00d6e2", "0d247c4a-f519-4c00-a344-3d869ede8fb6", "1bff3b4d-f9a9-4474-9a6c-b5bbe518fa30", "7467dd75-fc62-4ca7-9818-d84057f10edf", "f1df5af2-d5db-4c0d-809e-54eb1b788a2d", "2070049f-fd52-4006-b824-8ce27ea67758"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["c4ab8544-decb-4ea1-b856-2df4a2d196f1"], "usage": {"input_tokens": 1704, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 154, "output_tokens_details": {"reasoning_tokens": 75}, "total_tokens": 1858}}], "reason": "The Weekday DUPR League Key Dates excerpt directly lists “Sept. 7, Monday – Open Registration,” which establishes the sign-up opening date.", "usage": {"input_tokens": 1704, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 154, "output_tokens_details": {"reasoning_tokens": 75}, "total_tokens": 1858}}, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / Weekday DUPR League Key Dates / page 1 / `c4ab8544-decb-4ea1-b856-2df4a2d196f1` / score 0.4488.

```text
Weekday DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register (4 weeks)
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 14 (Women)/15(Men) – Weekday DUPR Season Starts
• Nov. 25/26 Break Week
• Dec. 2/3 - End of Regular Season
• Dec. 9/10 - Championship Days (All 3 lines at the Premier Sports Center - hopefully will
be completed!)
Note: No games the week of Nov. 22 (Thanksgiving Break)
```

**Generated answer:** Weekday DUPR League open registration begins Monday, Sept. 7, 2026.

**Fallback:** False; **review:** supported by selected active official evidence.

### saturday_close

**Original:** What is the last chance to sign up for the Saturday league?

**Interpretation:** `{"intent": "Find the deadline or final opportunity to register for a Saturday league.", "factType": "registration deadline / important date", "entities": ["Saturday league"], "nouns": ["chance", "sign up", "league"], "concepts": ["registration", "signup", "enrollment", "deadline", "last day", "important dates", "Saturday league"], "normalizedQuestion": "What is the last chance to sign up for the Saturday league?", "queries": ["\"Saturday league\" sign up registration deadline last chance", "\"Saturday league\" signup enrollment deadline important dates"], "rescueQueries": ["Saturday league registration signup"], "documentAffinities": ["league_supplement", "league_rules"]}`

**Top original evidence:** `{"chunkId": "da71cb2a-e2b8-4198-adee-b91e01bd8919", "documentVersionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "documentTitle": "LWR Pickleball Club DUPR League Rules", "heading": "Saturday League PrimeTime League", "ruleNumber": "", "pageNumber": 14, "score": 0.4748, "content": "End of Season PlayoƯs/Championship Day (All Leagues)"}`

**Executed expansion/rescue paths:**
- expanded: "Saturday league" sign up registration deadline last chance; query executed=True; SEARCH_FAILED; 0 candidates.
- rescue: Saturday league registration signup; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["da71cb2a-e2b8-4198-adee-b91e01bd8919", "64422f2c-e9ee-40b1-8407-d61abae35e09", "d6b9a348-9118-474d-96d4-1c7fea3b926c", "0d247c4a-f519-4c00-a344-3d869ede8fb6", "529ef1f0-1fe6-49c0-8ef8-446384c56ec0", "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "3f80e620-9c4a-4fc8-b081-287b1f5fa9c2", "501349dd-afc9-45f5-b510-5d374684ba3f", "7467dd75-fc62-4ca7-9818-d84057f10edf", "0b92f4df-e069-4937-bf1b-27f9c4da802e", "86fa150d-8be3-47fc-9b66-84a0172161eb"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["f9f05921-2ee9-46fc-9b44-e5a861d7dd6f"], "usage": {"input_tokens": 3124, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 67, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 3191}}], "reason": "The excerpt directly identifies Saturday DUPR League key dates and states the last day to register.", "usage": {"input_tokens": 3124, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 67, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 3191}}, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / Saturday DUPR League Key Dates / page 1 / `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f` / score 0.4279.

```text
Saturday DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 17 - Saturday DUPR7 Season Starts
• Oct. 24 - Saturday DUPR6 / DUPR8 Season Starts
• Nov. 25 / 26 Break Week
• Dec. 5 / 12 - Last games of 1st half / break
• Jan. 9 / 16 - Start of 2nd half
• Feb. 20 / 27 - End of Regular Season
• Mar. 6 / 13 - Championship Days (PlayoƯs with top 4 teams)
• Jamboree - Mar. 20 / 27
Note:
No games the week of Nov. 22 for Thanksgiving Break
No games after Dec. 13 – Jan. 8 for Christmas Break
```

**Generated answer:** The last day to sign up for the Saturday DUPR League is Sunday, Oct. 4, 2026.

**Fallback:** False; **review:** supported by selected active official evidence.

### weekday_start

**Original:** When does the Weekday competition kick off?

**Interpretation:** `{"intent": "Find the start date or start time for a named competition.", "factType": "competition kickoff date/time", "entities": ["Weekday"], "nouns": ["competition", "kick off"], "concepts": ["start date", "start time", "opening date", "schedule", "important dates", "league calendar"], "normalizedQuestion": "When does the Weekday competition start?", "queries": ["Weekday competition kickoff start date time", "Weekday competition schedule important dates"], "rescueQueries": ["Weekday league calendar start", "Weekday opening date schedule"], "documentAffinities": ["league_supplement", "league_rules"]}`

**Top original evidence:** `{"chunkId": "79bb9ba4-b80b-419a-b631-b041ed00d6e2", "documentVersionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "documentTitle": "LWR Pickleball Club DUPR League Rules", "heading": "Weekday League Weekday League", "ruleNumber": "", "pageNumber": 13, "score": 0.484, "content": "Weekday League Weekday League\n(9.1)"}`

**Executed expansion/rescue paths:**
- expanded: When does the Weekday competition start?; query executed=True; completed; 32 candidates.
- expanded: Weekday competition kickoff start date time; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": "league_date", "scope": ["weekday"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "79bb9ba4-b80b-419a-b631-b041ed00d6e2", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "1bff3b4d-f9a9-4474-9a6c-b5bbe518fa30", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "f1df5af2-d5db-4c0d-809e-54eb1b788a2d", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "de9ab654-63eb-49ef-8450-4f6c84e64510", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}, {"chunkId": "56207e32-1182-4f74-bfb1-b28a0dd6e758", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 121}, "semantic": null, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / Weekday DUPR League Key Dates / page 1 / `c4ab8544-decb-4ea1-b856-2df4a2d196f1` / score structural completion.

```text
• Oct. 14 (Women)/15(Men) – Weekday DUPR Season Starts
```

**Generated answer:** The Weekday DUPR Season starts Oct. 14, 2026 for Women and Oct. 15, 2026 for Men, for the 2026 Fall League.

**Fallback:** False; **review:** supported by selected active official evidence.

### saturday_end

**Original:** When does the Saturday regular competition wrap up?

**Interpretation:** `{"intent": "Find the date or time when the Saturday regular competition ends or concludes.", "factType": "schedule/date", "entities": ["Saturday regular competition"], "nouns": ["Saturday", "regular competition", "wrap up", "end", "conclusion"], "concepts": ["competition schedule", "regular season end date", "important dates", "league calendar", "final regular competition day"], "normalizedQuestion": "When does the Saturday regular competition conclude?", "queries": ["\"Saturday regular competition\" conclude end date", "Saturday regular competition wrap up end schedule"], "rescueQueries": [], "documentAffinities": ["league_supplement", "league_rules"]}`

**Top original evidence:** `{"chunkId": "da71cb2a-e2b8-4198-adee-b91e01bd8919", "documentVersionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "documentTitle": "LWR Pickleball Club DUPR League Rules", "heading": "Saturday League PrimeTime League", "ruleNumber": "", "pageNumber": 14, "score": 0.4709, "content": "End of Season PlayoƯs/Championship Day (All Leagues)"}`

**Executed expansion/rescue paths:**
- expanded: When does the Saturday regular competition conclude?; query executed=True; completed; 32 candidates.
- expanded: "Saturday regular competition" conclude end date; query executed=True; completed; 32 candidates.
- rescue: Saturday regular competition Saturday regular competition wrap up end conclusion competition schedule regular season end date important dates; query executed=True; SEARCH_FAILED; 0 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["da71cb2a-e2b8-4198-adee-b91e01bd8919", "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "529ef1f0-1fe6-49c0-8ef8-446384c56ec0", "3f80e620-9c4a-4fc8-b081-287b1f5fa9c2", "d6b9a348-9118-474d-96d4-1c7fea3b926c", "409c67f0-3a33-4755-86ae-9fb80a170429"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["f9f05921-2ee9-46fc-9b44-e5a861d7dd6f"], "usage": {"input_tokens": 1602, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 203, "output_tokens_details": {"reasoning_tokens": 118}, "total_tokens": 1805}}], "reason": "The Saturday DUPR League key dates directly list the 'End of Regular Season' as Feb. 20 / 27, answering when the Saturday regular competition wraps up.", "usage": {"input_tokens": 1602, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 203, "output_tokens_details": {"reasoning_tokens": 118}, "total_tokens": 1805}}, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / Saturday DUPR League Key Dates / page 1 / `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f` / score 0.4332.

```text
Saturday DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 17 - Saturday DUPR7 Season Starts
• Oct. 24 - Saturday DUPR6 / DUPR8 Season Starts
• Nov. 25 / 26 Break Week
• Dec. 5 / 12 - Last games of 1st half / break
• Jan. 9 / 16 - Start of 2nd half
• Feb. 20 / 27 - End of Regular Season
• Mar. 6 / 13 - Championship Days (PlayoƯs with top 4 teams)
• Jamboree - Mar. 20 / 27
Note:
No games the week of Nov. 22 for Thanksgiving Break
No games after Dec. 13 – Jan. 8 for Christmas Break
```

**Generated answer:** The Saturday DUPR regular season wraps up on Feb. 20 / 27, 2027, for the 2026 Fall League season.

**Fallback:** False; **review:** supported by selected active official evidence.

### weekday_championship

**Original:** When is the Weekday title decider?

**Interpretation:** `{"intent": "Find the scheduled date or time for an event referred to as the Weekday title decider.", "factType": "event schedule/date", "entities": ["Weekday"], "nouns": ["title decider"], "concepts": ["championship match", "final match", "league final", "playoff", "important date", "schedule"], "normalizedQuestion": "When is the Weekday title decider?", "queries": ["Weekday title decider date schedule", "Weekday championship final playoff important dates"], "rescueQueries": ["Weekday title date"], "documentAffinities": ["league_supplement", "league_rules"]}`

**Top original evidence:** `{"chunkId": "79bb9ba4-b80b-419a-b631-b041ed00d6e2", "documentVersionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "documentTitle": "LWR Pickleball Club DUPR League Rules", "heading": "Weekday League Weekday League", "ruleNumber": "", "pageNumber": 13, "score": 0.4562, "content": "Weekday League Weekday League\n(9.1)"}`

**Executed expansion/rescue paths:**
- expanded: Weekday title decider date schedule; query executed=True; completed; 32 candidates.
- rescue: Weekday title date; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["79bb9ba4-b80b-419a-b631-b041ed00d6e2", "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "1bff3b4d-f9a9-4474-9a6c-b5bbe518fa30", "f1df5af2-d5db-4c0d-809e-54eb1b788a2d", "c5792642-352c-49fa-a5c0-11399754fefe", "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["c4ab8544-decb-4ea1-b856-2df4a2d196f1"], "usage": {"input_tokens": 1465, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 225, "output_tokens_details": {"reasoning_tokens": 145}, "total_tokens": 1690}}], "reason": "The Weekday DUPR League key dates directly list Dec. 9/10 as Championship Days, which establishes when the Weekday title decider occurs.", "usage": {"input_tokens": 1465, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 225, "output_tokens_details": {"reasoning_tokens": 145}, "total_tokens": 1690}}, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / Weekday DUPR League Key Dates / page 1 / `c4ab8544-decb-4ea1-b856-2df4a2d196f1` / score 0.4084.

```text
Weekday DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register (4 weeks)
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 14 (Women)/15(Men) – Weekday DUPR Season Starts
• Nov. 25/26 Break Week
• Dec. 2/3 - End of Regular Season
• Dec. 9/10 - Championship Days (All 3 lines at the Premier Sports Center - hopefully will
be completed!)
Note: No games the week of Nov. 22 (Thanksgiving Break)
```

**Generated answer:** The Weekday DUPR title decider is on the Championship Days: Dec. 9/10, 2026, for the 2026 Fall League.

**Fallback:** False; **review:** supported by selected active official evidence.

### unknown_paraphrase

**Original:** When does PrimeTime receive its fixture list?

**Interpretation:** `{"intent": "Find the timing/date when PrimeTime receives its fixture list.", "factType": "date or schedule timing", "entities": ["PrimeTime"], "nouns": ["fixture list"], "concepts": ["schedule", "match schedule", "league fixtures", "important dates", "timeline"], "normalizedQuestion": "When does PrimeTime receive its fixture list?", "queries": ["PrimeTime fixture list receive schedule", "PrimeTime match schedule fixture list timing"], "rescueQueries": [], "documentAffinities": ["league_supplement", "league_rules"]}`

**Top original evidence:** `{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "documentVersionId": "f811e60f-9af8-444f-b009-9594a530acd6", "documentTitle": "2026 Fall League Important Dates", "heading": "PrimeTime DUPR League Key Dates", "ruleNumber": "", "pageNumber": 2, "score": 0.5012, "content": "PrimeTime DUPR League Key Dates\n• Sept. 7, Monday – Open Registration\n• Sept. 27, Sunday – Season DUPR ratings recorded\n• Sept. 28, Monday - Can start updating rosters\n• Oct. 4, Sunday – Last day to register (4 weeks)\n• Oct. 7, Wednesday – Schedules completed and sent\n• Oct. 16 - PrimeTime League Starts\n• Nov. 25/26 Break Week\n• Dec. 4 - PrimeTime League Regular Season Ends\n• Dec. 11 - PrimeTime League Championship Day\nNote: No games the week of Nov. 22 (Thanksgiving Break)"}`

**Executed expansion/rescue paths:**
- expanded: PrimeTime fixture list receive schedule; query executed=True; completed; 32 candidates.
- rescue: PrimeTime fixture list schedule match schedule league fixtures; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "d6b9a348-9118-474d-96d4-1c7fea3b926c", "98abadef-5153-483a-ab64-51be0c95480b", "da71cb2a-e2b8-4198-adee-b91e01bd8919", "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "cbb9ff22-5b51-4391-a81d-fc4c08dba6c4", "ee133944-bdb5-41ab-994f-d19440b45ddb", "82e6fc33-a040-4153-b920-cfcd8bab55b5", "c5792642-352c-49fa-a5c0-11399754fefe", "de9ab654-63eb-49ef-8450-4f6c84e64510", "bddfae38-0a1b-47da-b1a4-d66e26bfb479", "98ca9f86-2eee-4ac2-9c0d-9b91f7df8b18"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["950a54ab-aa3b-4f43-9c51-88ce0ca803ae"], "usage": {"input_tokens": 2744, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 144, "output_tokens_details": {"reasoning_tokens": 64}, "total_tokens": 2888}}], "reason": "The PrimeTime DUPR League key dates directly state that schedules are completed and sent on Oct. 7, which answers when PrimeTime receives its fixture list.", "usage": {"input_tokens": 2744, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 144, "output_tokens_details": {"reasoning_tokens": 64}, "total_tokens": 2888}}, "fallbackReason": null}`

**Selected evidence:**
- 2026 Fall League Important Dates / PrimeTime DUPR League Key Dates / page 2 / `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` / score 0.5012.

```text
PrimeTime DUPR League Key Dates
• Sept. 7, Monday – Open Registration
• Sept. 27, Sunday – Season DUPR ratings recorded
• Sept. 28, Monday - Can start updating rosters
• Oct. 4, Sunday – Last day to register (4 weeks)
• Oct. 7, Wednesday – Schedules completed and sent
• Oct. 16 - PrimeTime League Starts
• Nov. 25/26 Break Week
• Dec. 4 - PrimeTime League Regular Season Ends
• Dec. 11 - PrimeTime League Championship Day
Note: No games the week of Nov. 22 (Thanksgiving Break)
```

**Generated answer:** PrimeTime’s fixture list is scheduled to be completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League.

**Fallback:** False; **review:** supported by selected active official evidence.

### rules_control

**Original:** Do all games in the Saturday league post to DUPR

**Interpretation:** `{"kind": "unresolved", "object": null, "leagues": ["saturday"], "division": null, "event": "opening", "phase": "unspecified", "currentDate": false, "matchingQuestion": "do all games in the saturday league post to dupr"}`

**Top original evidence:** `{"chunkId": "a3ffc4ab-d224-4c32-969f-ce3d69fa9bdc", "documentVersionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "documentTitle": "LWR Pickleball Club DUPR League Rules", "heading": "DUPR Submission & Eligibility", "ruleNumber": "5.7", "pageNumber": 5, "score": 0.5687, "content": "5.7. DUPR Submission & Eligibility: All qualifying games will be automatically entered into\nthe DUPR rating system. Games that are forfeited, incomplete, or deemed ineligible will\nnot be recorded in DUPR (unless otherwise specified by a rule). Individuals/Players are\nnot authorized to independently submit any Club League scheduled games to DUPR."}`

**Executed expansion/rescue paths:**

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": null, "fallbackReason": null}`

**Selected evidence:**
- LWR Pickleball Club DUPR League Rules / DUPR Posting / page 10 / `04bc0faf-3d7f-4123-9e63-61cd081d4d83` / score 0.4892.

```text
6.2.3.6. DUPR Posting: All gender-based games will be submitted and posted to the
DUPR system. Mixed doubles games and any Picklebreaker™ games will not be
submitted or posted to DUPR.
Teams are numbered 1–3 for Men’s Doubles, 4–6 for Women’s Doubles, and 7–12 for Mixed
Doubles. These team numbers correspond directly to the Match Score Sheet printed from the system.
We highly recommend assigning higher team numbers to teams with higher combined skill levels and
ratings (for instance, Team 6 should have a higher combined DUPR rating than Team 4 in Women’s or
Team 12 should be a higher team rating than Team 7 in Mixed Doubles).
```

**Generated answer:** No. In the Saturday league, all gender-based games are submitted and posted to DUPR, but mixed doubles games and any Picklebreaker™ games are not submitted or posted to DUPR.

**Fallback:** False; **review:** supported by selected active official evidence.

### rules_rating

**Original:** For the Season DUPR rating, do you round up down to the first decimal?

**Interpretation:** `{"intent": "Find policy on how Season DUPR rating values are rounded or truncated to one decimal place.", "factType": "rounding rule for rating calculation/display", "entities": ["Season DUPR rating"], "nouns": ["rating", "season", "decimal", "round up", "round down"], "concepts": ["DUPR", "season rating", "rating precision", "one decimal place", "rounding", "truncation", "ceiling", "flooring"], "normalizedQuestion": "For the Season DUPR rating, is the rating rounded up or down to the first decimal place?", "queries": ["\"Season DUPR rating\" rounding first decimal round up down", "\"Season DUPR rating\" one decimal place truncation rounding"], "rescueQueries": [], "documentAffinities": ["league_rules", "captain_guide"]}`

**Top original evidence:** `{"chunkId": "0b92f4df-e069-4937-bf1b-27f9c4da802e", "documentVersionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "documentTitle": "LWR Pickleball Club DUPR League Rules", "heading": "Saturday DUPR League Divisions", "ruleNumber": "", "pageNumber": 9, "score": 0.5354, "content": "Saturday DUPR League Divisions\nDivision Name Individual Rating\nRange\nMax Team\nAggregate\nSDUPR 5 2.0 to 2.899 5.1\nSDUPR 6 2.3 to 3.399 6.1\nSDUPR 7 2.8 to 3.899 7.1\nSDUPR 8 3.3 to 4.399 8.1\nSDUPR 9 3.8 to 4.899 9.1"}`

**Executed expansion/rescue paths:**
- expanded: For the Season DUPR rating, is the rating rounded up or down to the first decimal place?; query executed=True; completed; 32 candidates.
- expanded: "Season DUPR rating" rounding first decimal round up down; query executed=True; completed; 32 candidates.
- rescue: Season DUPR rating rating season decimal round up round down DUPR season rating rating precision; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["0b92f4df-e069-4937-bf1b-27f9c4da802e", "f1df5af2-d5db-4c0d-809e-54eb1b788a2d", "01f68c64-fe37-409e-8730-0d86542c7bdc", "2eafc19f-f9c2-4b44-9ebd-0b5bb4b4f84e", "98abadef-5153-483a-ab64-51be0c95480b", "a3ffc4ab-d224-4c32-969f-ce3d69fa9bdc", "c68850bb-3747-491f-9d16-e33689c16f97", "04bc0faf-3d7f-4123-9e63-61cd081d4d83", "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "d500ed6e-e9e2-4d22-a432-6bc632d5df9d", "b1c966a2-4f36-4446-911c-403c7e850369", "f18d21e0-ff56-403b-9050-5ebd9f2b8298"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["01f68c64-fe37-409e-8730-0d86542c7bdc"], "usage": {"input_tokens": 3610, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 337, "output_tokens_details": {"reasoning_tokens": 266}, "total_tokens": 3947}}], "reason": "The excerpt directly states that Season DUPR Ratings are truncated to the nearest tenth and gives examples showing no rounding up.", "usage": {"input_tokens": 3610, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 337, "output_tokens_details": {"reasoning_tokens": 266}, "total_tokens": 3947}}, "fallbackReason": null}`

**Selected evidence:**
- LWR Pickleball Club DUPR League Rules / DUPR RATINGS/DIVISIONS / page 3 / `01f68c64-fe37-409e-8730-0d86542c7bdc` / score 0.5442.

```text
4. DUPR RATINGS/DIVISIONS
4.1. Season DUPR Ratings: A player's Season DUPR Rating is established on the date
communicated to all captains prior to the first scheduled league match and remains in
eƯect for the duration of the season.
4.1.1. A player with a DUPR Reliability Factor of 29 or below will be classified as “Not
Rated” (NR) for League purposes and will be subject to the provisions of Rule 4.5.
This classification recognizes that a player’s current DUPR rating may not yet
provide a suƯiciently reliable indication of skill level, particularly for newer or less-
established players or those who have not recently recorded matches in DUPR.
Players classified as “NR” may be placed on a team in the division that most
appropriately reflects their current skill level while they record additional matches
and establish a more reliable DUPR rating. These players are strongly encouraged
to consult with a local Certified DUPR Coach, pickleball professional, or
knowledgeable team captain for guidance regarding appropriate division
placement.
4.2. All DUPR ratings will be truncated to the nearest tenth to establish a player's “Season's
DUPR Rating”. For example, a rating of 3.496 will be truncated to 3.4, as will a rating of
3.401.
4.3. Some of our Leagues use the “Age-based” DUPR sub-rating but will still follow all DUPR
Rating/Division Rules. If a player hasn’t established their 65+ Age-based rating as of the
start of a season, their 50+ Age-based rating will be used.
4.4. Any player or team that is found to be cheating, tanking, game-fixing or any kind of data
manipulation, including intentionally creating multiple DUPR accounts, will be banned
from the League for one calendar year.
4.5. Players with a DUPR Rating of "NR" (Not Rated): Players with a DUPR rating of NR (Not
```

**Generated answer:** No. Season DUPR ratings are not rounded up or down. They are truncated to the nearest tenth: for example, 3.496 becomes 3.4, and 3.401 also becomes 3.4.

**Fallback:** False; **review:** supported by selected active official evidence.

### captains_control

**Original:** Where can I find the seasons scoring sheet

**Interpretation:** `{"intent": "Find the location or source for a season's scoring sheet.", "factType": "document location or procedural guidance", "entities": [], "nouns": ["seasons scoring sheet", "scoring sheet", "season"], "concepts": ["score sheet", "season scorecard", "league scoring form", "match score entry", "LMS scoring"], "normalizedQuestion": "Where can I find the season's scoring sheet?", "queries": ["\"season's scoring sheet\" OR \"seasons scoring sheet\" \"scoring sheet\"", "\"scoring sheet\" \"season\" \"LMS\""], "rescueQueries": ["\"score sheet\" \"league\"", "\"match score\" \"LMS\""], "documentAffinities": ["player_guide", "captain_guide"]}`

**Top original evidence:** `{"chunkId": "82e6fc33-a040-4153-b920-cfcd8bab55b5", "documentVersionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "documentTitle": "LWR Pickleball Club DUPR Captains Guide", "heading": "VIEW SCHEDULE/GAME INFORMATION", "ruleNumber": "", "pageNumber": 9, "score": 0.444, "content": "o League Communication: For scheduling issues or other league questions, contact the league\nmanagers by clicking the Contact League (email icon) button at the top of the screen.\no Match Balls & Score Sheets: The home team captain must bring league-provided balls to the\nmatch and record all scores on a printed Match Score Sheet. Keep these physical score sheets\non file for the remainder of the season."}`

**Executed expansion/rescue paths:**
- expanded: Where can I find the season's scoring sheet?; query executed=True; completed; 32 candidates.
- expanded: "season's scoring sheet" OR "seasons scoring sheet" "scoring sheet"; query executed=True; completed; 32 candidates.
- rescue: "score sheet" "league"; query executed=True; completed; 32 candidates.
- rescue: "match score" "LMS"; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": {"candidateIds": ["82e6fc33-a040-4153-b920-cfcd8bab55b5", "8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2", "5b432210-b886-44b6-a6e4-5b2312b07dee", "3da026ae-c66d-4c48-9c68-895f7d2cb811", "2d77168a-9cfd-410d-811d-ab419867763d", "9826bba5-359a-4370-9773-6af4d6b973a3", "cd1d10ca-c3c1-4059-9a90-b064f76a8e38", "448c6e29-a524-4549-8a79-c8271d394fa5", "d85ffab8-463c-407f-9ef2-4494ce013ee0", "c83dd035-c4f8-440d-b504-7e1f5be14ace", "1b89a6d2-c608-4ada-8a89-bf37dc2dc240", "b7ef08d2-387f-4100-8b1c-60af2a258273"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": ["8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2", "1b89a6d2-c608-4ada-8a89-bf37dc2dc240"], "usage": {"input_tokens": 3741, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 127, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 3868}}], "reason": "The excerpts directly state that captains can access/print the Match Score Sheet from the “Next Match” section of the Captain Dashboard, and describe the Print Match Score Sheet button in Upcoming/Next Match, including when it is ready to print.", "usage": {"input_tokens": 3741, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 127, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 3868}}, "fallbackReason": null}`

**Selected evidence:**
- LWR Pickleball Club DUPR Captains Guide / CAPTAINS NORMAL WEEKLY PROCESS / page 7 / `8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2` / score 0.5353.

```text
CAPTAINS NORMAL WEEKLY PROCESS
o Captain Match Duties: For every match, captains or co-captains must set their lineup (Match
Setup), print the score sheet, and enter or validate final scores.
o Lineup Submission: Both captains must enter starting lineups in Match Setup at least 3 days
before match day. It is recommended that the Home Team enter their lineups first.
 Updates: You can modify your lineup until match day. The system automatically emails
changes to the opposing captain.
 Penalties: Repeated incomplete or late lineup submissions may result in match
forfeiture, subject to League Management discretion.
o Match Score Sheet: Once both teams have entered their lineups in the League Management
System (LMS), the official Match Score Sheet may be printed. Captains can access the Match
Score Sheet button from the “Next Match” section of their Captain Dashboard.
 The completed Match Score Sheet will include all available match information,
including player names, team information, and game formats. If either team has not
entered its lineup, that team’s lineup information will appear blank on the score
sheet.
 The LMS-generated Match Score Sheet is the official score sheet and must be used
for each scheduled match. Captains should retain all completed Match Score
Sheets for the duration of the season as a backup record of match results.
```
- LWRPC-Captains Guide to the LMS /  / page 10 / `1b89a6d2-c608-4ada-8a89-bf37dc2dc240` / score 0.4314.

```text
Upcoming Matches
Your Next Match appears at the top of the Captain Dashboard. From this section, captains
can view match details, email the opposing captains, print Match Score Sheet and enter final
scores. If this is a “flex league” you are also able to modify the match date/time and notify
opposing captains.
You can also manage your match lineup and score sheets here:
• Match Setup block: The Match Setup button turns red if your team hasn't entered
its lineup yet, and blue once you have. The system will email you a reminder to
complete this a few days before the actual match.
• Print Match Score Sheet button: Stays red until both teams complete their Match
Setup, turning green and ready to print once both lineups are in.
The Upcoming matches & byes section shows all upcoming match details, scheduling
information, and setup status. You can also click on a match for all available tools/options
for that match.
Upcoming / Unverified Matches Screen
```

**Generated answer:** Captains can find it in the League Management System on the Captain Dashboard, in the “Next Match” / “Upcoming Matches” area. Use the “Print Match Score Sheet” button.

It is ready to print once both teams have completed Match Setup/entered their lineups; until then, the button stays red and the sheet may be incomplete or unavailable.

**Fallback:** False; **review:** supported by selected active official evidence.

### captains_ball

**Original:** What type of balls will we be using?

**Interpretation:** `{"kind": "unresolved", "object": null, "leagues": [], "division": null, "event": "opening", "phase": "unspecified", "currentDate": false, "matchingQuestion": "what type of balls will we be using?"}`

**Top original evidence:** `{"chunkId": "4da256ff-d390-47d4-8183-dfa45286f107", "documentVersionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "documentTitle": "2026 USA Pickleball Official Rulebook", "heading": "3.C Ball Specifications — Construction", "ruleNumber": "3.C.5", "pageNumber": 13, "score": 0.7304, "content": "3.C.5 Construction. The ball must be made of durable material molded\nwith a smooth surface and free of texturing. The ball may have a\nslight ridge at the seam, as long as it does not significantly impact\nthe ball’s flight characteristics. (See Figure 3-2.)\nThe ball with larger holes is customarily used\nfor indoor play (pictured on the left). The ball\nwith smaller holes is customarily used for\noutdoor play (pictured on the right).\nFigure 3-2: Approved Balls – Examples"}`

**Executed expansion/rescue paths:**

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": null, "fallbackReason": null}`

**Selected evidence:**
- LWR Pickleball Club DUPR Captains Guide / LEAGUE FEES AND WAIVER / page 10 / `c9809c3e-e99c-4b2f-b9d2-c9c5ad804747` / score 0.6461.

```text
o The League shall provide:
 Match Balls: Franklin Outdoor X-40 optic yellow balls for all regular season and playoƯ
matches.
```

**Generated answer:** The league will provide Franklin Outdoor X-40 optic yellow balls for all regular-season and playoff matches.

**Fallback:** False; **review:** supported by selected active official evidence.

### lms_control

**Original:** How do I complete Match Setup in the LMS?

**Interpretation:** `{"kind": "unresolved", "object": null, "leagues": [], "division": null, "event": "opening", "phase": "unspecified", "currentDate": false, "matchingQuestion": "how do i complete match setup in the lms?"}`

**Top original evidence:** `{"chunkId": "d85ffab8-463c-407f-9ef2-4494ce013ee0", "documentVersionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "documentTitle": "LWR Pickleball Club DUPR Captains Guide", "heading": "LEAGUE MANAGEMENT SYSTEM (LMS) - (CAPTAINS USER GUIDE)", "ruleNumber": "", "pageNumber": 1, "score": 0.6862, "content": "LEAGUE MANAGEMENT SYSTEM (LMS) - (CAPTAINS USER GUIDE)\n• Captains User Guide: Everything you need to run your team in the LMS—from roster management\nand match setup to score entry and standings tracking. For step-by-step technical instructions on\nusing the LMS, log in and click the Captains User Guide (question mark icon) in the top header.\n• Getting Started: “League Management System (LMS) – Login Instructions” (Page 6) – Provides\nstep-by-step instructions specifically for logging into the League Management System for the first\ntime."}`

**Executed expansion/rescue paths:**

**Applicability:** `{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semantic": null, "fallbackReason": null}`

**Selected evidence:**
- LWR Pickleball Club DUPR League Rules / Match Setup and Roster Exchange / page 5 / `86cd1b2b-55ad-46d2-af2f-9ea3a18f2143` / score 0.6838.

```text
5.5. Match Setup and Roster Exchange: Home and visiting Captains must submit their
upcoming match rosters through the League Management System (LMS) using the Match
Setup button no later than three (3) days prior to the scheduled match. It is strongly
recommended that the Home Team submit its lineup first. Automated reminder emails
will be sent to all Captains. Any lineup or roster changes made after the initial submission
must be entered through Match Setup, which will automatically notify the opposing
Captain(s) of the change. Teams that have not completed Match Setup will not be able to
print a completed Match Score Sheet. Repeated failure to complete Match Setup within
the required timeframe may result in forfeiture of the current or future matches, at the
discretion of League Management.
```
- LWR Pickleball Club DUPR Captains Guide / LEAGUE MANAGEMENT SYSTEM (LMS) - (CAPTAINS USER GUIDE) / page 1 / `d85ffab8-463c-407f-9ef2-4494ce013ee0` / score 0.6862.

```text
• Captains User Guide: Everything you need to run your team in the LMS—from roster management
and match setup to score entry and standings tracking. For step-by-step technical instructions on
using the LMS, log in and click the Captains User Guide (question mark icon) in the top header.
```
- LWRPC-Captains Guide to the LMS /  / page 11 / `5b432210-b886-44b6-a6e4-5b2312b07dee` / score 0.671.

```text
Match Setup Process
Captains must assign player pairings and save their lineups before the match date. To
ensure fair play, the system automatically checks entries against division ranges, team
totals, and Season DUPR ratings, displaying an on-screen warning if a combination is
ineligible. It is highly recommended that the Home Team enter their lineup first. Lineups
can be changed prior to match day with all changes automatically emailed to opposing
captains.

• Before saving, it refreshes the season ratings and validates again. The save API
repeats that validation server-side, including roster membership, individual rating
range, duplicates, and team-rating maximum.
The rating source is selected by the division’s rating_type: standard divisions use Season
DUPR; PrimeTime/Age-based divisions use the Season PrimeTime rating.
The Match Setup button will show as red if your setup is incomplete, and blue once it is
completed. When both teams have completed their setup, the Match Score Sheet button
will turn green, allowing you to print a complete match score sheet.
Saving a lineup (press the Save Match Setup button) automatically notifies the opposing
captain of the update. From this screen, you can also use the Email Players button to notify
all selected players or the entire team.
For any questions regarding player ratings or eligibility, contact
[contact detail omitted].
Match Setup Window
```
- LWR Pickleball Club DUPR Captains Guide / CAPTAINS NORMAL WEEKLY PROCESS / page 7 / `8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2` / score 0.6456.

```text
o Lineup Submission: Both captains must enter starting lineups in Match Setup at least 3 days
before match day. It is recommended that the Home Team enter their lineups first.

o Match Score Sheet: Once both teams have entered their lineups in the League Management
System (LMS), the official Match Score Sheet may be printed. Captains can access the Match
Score Sheet button from the “Next Match” section of their Captain Dashboard.
```

**Generated answer:** To complete Match Setup in the LMS:

1. Log in to the LMS and use the Match Setup button for the upcoming match.
2. Enter your match roster/starting lineup by assigning player pairings.
3. Save the lineup using Save Match Setup.
4. Do this no later than three (3) days before the scheduled match. Both home and visiting captains must submit their lineups; it is strongly recommended that the Home Team submit first.
5. If you make any lineup or roster changes after the initial submission, enter them through Match Setup. The LMS will automatically notify the opposing captain(s).
6. Watch the button/status indicators: Match Setup shows red if incomplete and blue once completed. When both teams have completed Match Setup, the Match Score Sheet button turns green and a complete match score sheet can be printed.

The LMS validates entries, including division/rating requirements, roster membership, duplicates, and team-rating maximums. Repeated failure to complete Match Setup on time may result in forfeiture of the current or future matches, at League Management’s discretion.

**Fallback:** False; **review:** supported by selected active official evidence.

### unsupported_control

**Original:** What is the official league policy on teleporting to matches?

**Interpretation:** `{"intent": "Find the official league policy governing whether players may teleport to matches.", "factType": "league policy/rule", "entities": [], "nouns": ["league", "policy", "teleporting", "matches"], "concepts": ["official rules", "match attendance", "arrival at matches", "presence at scheduled matches", "forfeit", "default", "player eligibility"], "normalizedQuestion": "What is the official league policy on teleporting to matches?", "queries": ["official league policy teleporting to matches", "teleporting matches attendance arrival forfeit default"], "rescueQueries": ["league rules match attendance arrival presence", "official rules matches forfeit default player eligibility"], "documentAffinities": ["league_rules", "player_guide"]}`

**Top original evidence:** `{"chunkId": "82a9d022-4428-4c83-bcdc-e8e2ff4cfb72", "documentVersionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "documentTitle": "LWR Pickleball Club DUPR Captains Guide", "heading": "DUPR LEAGUE RULES", "ruleNumber": "", "pageNumber": 1, "score": 0.4116, "content": "DUPR LEAGUE RULES\n• The DUPR League Mission and League Rules contain the official policies and requirements for\nteam creation, player eligibility, roster requirements, and specific rules for each of our leagues.\nYou can access the most current version of this document at any time by logging into the LMS and\nselecting League Documents → League Rules from the sidebar menu. The direct link to the current\nleague rules is DUPR League Rules (https://tinyurl.com/LWRPC-DUPRRules)."}`

**Executed expansion/rescue paths:**
- expanded: official league policy teleporting to matches; query executed=True; completed; 32 candidates.
- rescue: league rules match attendance arrival presence; query executed=True; completed; 32 candidates.
- rescue: official rules matches forfeit default player eligibility; query executed=True; completed; 32 candidates.

**Applicability:** `{"policy": null, "semantic": {"candidateIds": ["395fdfa5-38ac-4714-9209-6b51817995d0", "e05db4f0-e98a-4336-8ca0-895bf80fb21f", "3814d8a0-290e-460c-9140-1509738e7292", "d500ed6e-e9e2-4d22-a432-6bc632d5df9d", "2543e4af-1810-482c-a685-488d5cec1b55", "4018c683-e2c0-440c-a02b-8288faaefe2a", "c47a2c96-9d6a-41ec-86be-7694f5872557", "577601f5-47a1-4ae1-a264-08fbd18ec5f4", "ff7c5696-e496-41bf-a228-b75712664188", "b8a2213f-32e7-48cf-9c3c-41fb9c28815b", "2be43ec1-5da0-4a6c-b3f7-542f29d33c1b", "8f5bd3dc-8b0c-4852-925c-d4799b25f0e7"], "attempts": [{"attempt": 1, "rejection": null, "returnedIds": [], "usage": {"input_tokens": 2296, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 98, "output_tokens_details": {"reasoning_tokens": 42}, "total_tokens": 2394}}], "reason": "The supplied excerpts address forfeits, no-shows, weather, apparel, and related scoring, but none directly states any policy about teleporting to matches.", "usage": {"input_tokens": 2296, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 98, "output_tokens_details": {"reasoning_tokens": 42}, "total_tokens": 2394}}, "fallbackReason": "NO_APPLICABLE_EVIDENCE_AFTER_RESCUE"}`

**Selected evidence:**
None.

**Generated answer:** I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.

**Fallback:** True; **review:** expected safe refusal.

## Audit and recommendation

Final run: 77 OpenAI calls; 111 allowed document/search/source-link operations; 0 blocked secret/session payloads; 5 incidental contact omissions. No business-record access or mutation.

All requested validation gates pass. No remaining validation blocker. Recommend a controlled application deployment review when the owner authorizes proceeding. The candidate remains local and undeployed; production acceptance is not claimed.

Final-code replay was completed in two read-only batches: the first local process ended after eight completed cases without an application error report; the remaining eight completed separately. The combined final record contains exactly sixteen unique questions, all passing. Source identity hashes are recorded in [the local manifest](lms-0735-local-identity.json).
