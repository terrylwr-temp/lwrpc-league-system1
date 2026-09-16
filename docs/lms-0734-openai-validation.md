# LMS-0734 / 0.1.556 — OpenAI-backed read-only validation

**Overall: FAIL — not ready for deployment.** 16 final cases: 14 PASS (including the expected unsupported-question fallback), 2 FAIL. No deployment or production configuration/business-data/document-status/security changes.

## Scope and method

Local candidate code called the existing official-document hybrid retrieval RPC and real configured OpenAI embedding/planner/relevance/answer models against active production official documents. No member, roster, team or authentication records were queried. Only official document tables, the read-only official search RPC, and temporary official-source link signing were permitted by the harness. Managed Approved Answers were deliberately excluded. No app code was changed during this validation.

The first run blocked four incidental contact-bearing payloads before transmission. Those affected cases were replayed with contact details omitted from outbound validation content. The omissions are a validation-harness filter, not a production application change. Prompt bodies were checked for credentials/session tokens; credentials were used only in normal service-authentication headers and were not sent as model content. Signed source links were not included in the report or model prompts.

## Release blockers

1. **Incorrect calendar rollover:** Saturday end-of-season answer says February 20/27, 2026 instead of 2027. General semantic selection needs the same event-specific chronological year grounding used by the established date selector.
2. **Scoring-sheet question still fails:** relevant guide evidence is found, but the semantic assessor returns an invalid chunk-ID selection and the server fails closed. This also fails on baseline; the new generalized capability has not repaired it.
3. **Rescue diagnostics overstate execution:** several cases set `rescueRan=true` after all generated rescue queries were filtered away. No rescue RPC actually ran for those cases. Report attempted versus executed separately and ensure a valid bounded rescue is available when needed.

## Non-regression comparison

Baseline: unchanged commit e88946c, isolated local source extraction; same active official documents and approved model calls.

| Control | Baseline | LMS-0734 | Finding |
|---|---|---|---|
| Saturday DUPR posting | Answer | Answer | PASS, gender games posted; mixed/Picklebreaker excluded |
| Captains Guide match balls | Answer | Answer | PASS, Franklin Outdoor X-40 optic yellow, regular season and playoffs |
| LMS Match Setup | Answer | Answer | PASS, deadline, pairings/save, updates and score-sheet states supported |
| Season DUPR decimal treatment | Fallback | Answer | Improvement: truncation, source examples preserved |
| Seasons scoring sheet | Fallback | Fallback | Existing failure remains unresolved |
| Saturday season-end paraphrase | Fallback | Wrong year | New incorrect-answer behavior; blocker |

## Case summary

| Case | Result | Original top score | Fallback | Selected source |
|---|---|---|---|
| exact | PASS | 0.7566 | False | 2026 Fall League Important Dates |
| variant_sent | PASS | 0.5112 | False | 2026 Fall League Important Dates |
| variant_available | PASS | 0.5078 | False | 2026 Fall League Important Dates |
| variant_captains | PASS | 0.4934 | False | 2026 Fall League Important Dates |
| weekday_open | PASS | 0.4347 | False | 2026 Fall League Important Dates |
| saturday_close | PASS | 0.4748 | False | 2026 Fall League Important Dates |
| weekday_start | PASS | 0.484 | False | 2026 Fall League Important Dates |
| saturday_end | FAIL | 0.4709 | False | 2026 Fall League Important Dates |
| weekday_championship | PASS | 0.4561 | False | 2026 Fall League Important Dates |
| unknown_paraphrase | PASS | 0.5011 | False | 2026 Fall League Important Dates |
| rules_control | PASS | 0.5687 | False | LWR Pickleball Club DUPR League Rules |
| rules_rating | PASS | 0.5354 | False | LWR Pickleball Club DUPR League Rules |
| captains_control | FAIL | 0.444 | True | None |
| lms_control | PASS | 0.6862 | False | LWR Pickleball Club DUPR League Rules; LWR Pickleball Club DUPR Captains Guide; LWRPC-Captains Guide to the LMS |
| unsupported_control | PASS | 0.4116 | True | None |
| captains_ball | PASS | 0.7304 | False | LWR Pickleball Club DUPR Captains Guide |

## 1. exact — PASS

**1. Original question:** when does the primetime league get their schedules

**2. Interpretation:**
Intent: Find the date or timing when the primetime league receives or is issued schedules.; entities: primetime league; fact type: schedule release timing. Normalized question: When does the primetime league receive their schedules?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **0**.
- expanded: `When does the primetime league receive their schedules?` — completed, 32 candidates.
- expanded: `"primetime league" schedules release timing` — completed, 32 candidates.

**4. Top original evidence:** 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — page 2; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`.
**5. Evidence score:** 0.7566 (unchanged threshold 0.35).
Components: semanticScore=0.6439, keywordScore=0.95, exactScore=0.85, authorityScore=0.9404, contextScore=0.2, combinedScore=0.7566.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": {"reason": "The excerpt directly states the 2026 Fall PrimeTime DUPR League key date for schedules: “Schedules completed and sent” on Oct. 7. Scope is limited to the 2026 Fall season.", "usage": {"input_tokens": 3727, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 401, "output_tokens_details": {"reasoning_tokens": 311}, "total_tokens": 4128}, "candidateIds": ["950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "304529b8-1c7f-4206-b6b6-a36f1cc3d909", "86cd1b2b-55ad-46d2-af2f-9ea3a18f2143", "5b432210-b886-44b6-a6e4-5b2312b07dee", "2eafc19f-f9c2-4b44-9ebd-0b5bb4b4f84e", "98abadef-5153-483a-ab64-51be0c95480b", "b1c966a2-4f36-4446-911c-403c7e850369", "64422f2c-e9ee-40b1-8407-d61abae35e09", "d6b9a348-9118-474d-96d4-1c7fea3b926c", "2d77168a-9cfd-410d-811d-ab419867763d", "9826bba5-359a-4370-9773-6af4d6b973a3", "da71cb2a-e2b8-4198-adee-b91e01bd8919"]}, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 2, rule none, score 0.7617; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

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

**8. Final generated answer:**

For the 2026 Fall PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026.

**9. Fallback:** False

**10. False-positive/questionable selection:** Correct answer and league; broad whole-calendar selection rather than a single event excerpt. This selection pattern needs the rollover correction demonstrated by the Saturday failure.

## 2. variant_sent — PASS

**1. Original question:** when will PrimeTime schedules be sent out

**2. Interpretation:**
Existing validated selection path; no new semantic planner invoked. Recorded legacy interpretation: `{"kind": "policy_date", "object": "schedule_release", "leagues": ["primetime"], "season": null, "policyYear": null, "contextConflict": false, "event": "schedule_release", "matchingQuestion": "when will primetime schedules be sent out"}`.

**3. Expansion/rescue:**
Status `not_needed`; rescue flag `False`; actual rescue searches **0**.
No expanded/rescue search needed.

**4. Top original evidence:** 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — page 2; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`.
**5. Evidence score:** 0.5112 (unchanged threshold 0.35).
Components: semanticScore=0.5908, keywordScore=0.0566, exactScore=0.85, authorityScore=0.8414, contextScore=0.2, combinedScore=0.5112.

**6. Applicability decision:**
{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": null, "scope": ["primetime"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "98abadef-5153-483a-ab64-51be0c95480b", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "d6b9a348-9118-474d-96d4-1c7fea3b926c", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "c5792642-352c-49fa-a5c0-11399754fefe", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}, {"chunkId": "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "282fa8f4-d1bf-4351-902a-29507ea31937", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 112}, "semanticEvidence": null, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 2, rule none, score 0.5112; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

```text
• Oct. 7, Wednesday – Schedules completed and sent
```

**8. Final generated answer:**

PrimeTime DUPR League schedules are listed to be completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League Important Dates season.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## 3. variant_available — PASS

**1. Original question:** what date are the PrimeTime schedules available

**2. Interpretation:**
Existing validated selection path; no new semantic planner invoked. Recorded legacy interpretation: `{"kind": "policy_date", "object": "schedule_release", "leagues": ["primetime"], "season": null, "policyYear": null, "contextConflict": false, "event": "schedule_release", "matchingQuestion": "what date are the primetime schedules available"}`.

**3. Expansion/rescue:**
Status `not_needed`; rescue flag `False`; actual rescue searches **0**.
No expanded/rescue search needed.

**4. Top original evidence:** 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — page 2; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`.
**5. Evidence score:** 0.5078 (unchanged threshold 0.35).
Components: semanticScore=0.6123, keywordScore=0, exactScore=0.85, authorityScore=0.8414, contextScore=0.2, combinedScore=0.5078.

**6. Applicability decision:**
{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": null, "scope": ["primetime"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "98abadef-5153-483a-ab64-51be0c95480b", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "b1c966a2-4f36-4446-911c-403c7e850369", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "d6b9a348-9118-474d-96d4-1c7fea3b926c", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "da71cb2a-e2b8-4198-adee-b91e01bd8919", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 165}, "semanticEvidence": null, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 2, rule none, score 0.5078; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

```text
• Oct. 7, Wednesday – Schedules completed and sent
```

**8. Final generated answer:**

PrimeTime DUPR League schedules are completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League Important Dates season.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## 4. variant_captains — PASS

**1. Original question:** when do captains get the PrimeTime schedule

**2. Interpretation:**
Existing validated selection path; no new semantic planner invoked. Recorded legacy interpretation: `{"kind": "policy_date", "object": "schedule_release", "leagues": ["primetime"], "season": null, "policyYear": null, "contextConflict": false, "event": "schedule_release", "matchingQuestion": "when do captains get the primetime schedule"}`.

**3. Expansion/rescue:**
Status `not_needed`; rescue flag `False`; actual rescue searches **0**.
No expanded/rescue search needed.

**4. Top original evidence:** 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — page 2; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`.
**5. Evidence score:** 0.4934 (unchanged threshold 0.35).
Components: semanticScore=0.5816, keywordScore=0, exactScore=0.85, authorityScore=0.8414, contextScore=0.2, combinedScore=0.4934.

**6. Applicability decision:**
{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": null, "scope": ["primetime"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "98abadef-5153-483a-ab64-51be0c95480b", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2", "versionId": "c0b30100-1d00-42a2-9b0f-9aa97fe23d83", "reason": "NOT_SELECTED"}, {"chunkId": "b1c966a2-4f36-4446-911c-403c7e850369", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "07463ae2-a809-4a86-b77e-4fa022176b07", "versionId": "7ec16cf5-7b9d-4b3b-a847-8dd5767396c7", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 105}, "semanticEvidence": null, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 2, rule none, score 0.4934; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

```text
• Oct. 7, Wednesday – Schedules completed and sent
```

**8. Final generated answer:**

For the 2026 Fall League PrimeTime DUPR League, schedules are completed and sent on Wednesday, Oct. 7, 2026.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## 5. weekday_open — PASS

**1. Original question:** What is the Weekday sign-up opening date?

**2. Interpretation:**
Intent: Find a specific date for when Weekday sign-up opens.; entities: Weekday; fact type: date. Normalized question: What is the Weekday sign-up opening date?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **1**.
- expanded: `Weekday sign-up opening date registration opens` — completed, 32 candidates.
- rescue: `Weekday registration enrollment calendar` — SEARCH_FAILED, 0 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR League Rules — Weekday League Weekday League — page 13; chunk `79bb9ba4-b80b-419a-b631-b041ed00d6e2`.
**5. Evidence score:** 0.4347 (unchanged threshold 0.35).
Components: semanticScore=0.4557, keywordScore=0, exactScore=0.85, authorityScore=0.85, contextScore=0.2, combinedScore=0.4347.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": {"reason": "The Weekday DUPR League key dates directly list the open registration date, which answers the sign-up opening date.", "usage": {"input_tokens": 1352, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 160, "output_tokens_details": {"reasoning_tokens": 88}, "total_tokens": 1512}, "candidateIds": ["c4ab8544-decb-4ea1-b856-2df4a2d196f1", "79bb9ba4-b80b-419a-b631-b041ed00d6e2", "0d247c4a-f519-4c00-a344-3d869ede8fb6", "1bff3b4d-f9a9-4474-9a6c-b5bbe518fa30", "7467dd75-fc62-4ca7-9818-d84057f10edf", "2070049f-fd52-4006-b824-8ce27ea67758"]}, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 1, rule none, score 0.4341; chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

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

**8. Final generated answer:**

The Weekday DUPR League sign-up/open registration date is Monday, Sept. 7, 2026.

**9. Fallback:** False

**10. False-positive/questionable selection:** Correct answer and league; broad whole-calendar selection rather than a single event excerpt. This selection pattern needs the rollover correction demonstrated by the Saturday failure.

## 6. saturday_close — PASS

**1. Original question:** What is the last chance to sign up for the Saturday league?

**2. Interpretation:**
Intent: Find the registration deadline or final opportunity to sign up for the Saturday league.; entities: Saturday league; fact type: date or deadline. Normalized question: What is the last chance to sign up for the Saturday league?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **0**.
- expanded: `"Saturday league" "sign up" deadline registration` — SEARCH_FAILED, 0 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR League Rules — Saturday League PrimeTime League — page 14; chunk `da71cb2a-e2b8-4198-adee-b91e01bd8919`.
**5. Evidence score:** 0.4748 (unchanged threshold 0.35).
Components: semanticScore=0.541, keywordScore=0, exactScore=0.85, authorityScore=0.85, contextScore=0.2, combinedScore=0.4748.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": {"reason": "The excerpt directly lists the Saturday DUPR League key dates and states the last day to register, within the 2026 Fall League scope.", "usage": {"input_tokens": 2633, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 297, "output_tokens_details": {"reasoning_tokens": 218}, "total_tokens": 2930}, "candidateIds": ["da71cb2a-e2b8-4198-adee-b91e01bd8919", "529ef1f0-1fe6-49c0-8ef8-446384c56ec0", "d6b9a348-9118-474d-96d4-1c7fea3b926c", "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "64422f2c-e9ee-40b1-8407-d61abae35e09", "501349dd-afc9-45f5-b510-5d374684ba3f", "3f80e620-9c4a-4fc8-b081-287b1f5fa9c2", "7467dd75-fc62-4ca7-9818-d84057f10edf", "86fa150d-8be3-47fc-9b66-84a0172161eb", "0b92f4df-e069-4937-bf1b-27f9c4da802e"]}, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 1, rule none, score 0.4279; chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

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

**8. Final generated answer:**

The last day to register for the Saturday DUPR League is Sunday, Oct. 4, 2026.

**9. Fallback:** False

**10. False-positive/questionable selection:** Correct answer and league; broad whole-calendar selection rather than a single event excerpt. This selection pattern needs the rollover correction demonstrated by the Saturday failure.

## 7. weekday_start — PASS

**1. Original question:** When does the Weekday competition kick off?

**2. Interpretation:**
Intent: Find the start date or start time for the Weekday competition.; entities: Weekday; fact type: competition schedule date/time. Normalized question: When does the Weekday competition start?

**3. Expansion/rescue:**
Status `completed`; rescue flag `False`; actual rescue searches **0**.
- expanded: `When does the Weekday competition start?` — completed, 32 candidates.
- expanded: `Weekday competition kick off start date time` — completed, 32 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR League Rules — Weekday League Weekday League — page 13; chunk `79bb9ba4-b80b-419a-b631-b041ed00d6e2`.
**5. Evidence score:** 0.484 (unchanged threshold 0.35).
Components: semanticScore=0.5607, keywordScore=0, exactScore=0.85, authorityScore=0.85, contextScore=0.2, combinedScore=0.484.

**6. Applicability decision:**
{"policy": {"correlationId": null, "origin": null, "intent": "policy_date", "object": "league_date", "scope": ["weekday"], "candidateCount": 32, "completionCount": 3, "candidates": [{"chunkId": "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "SELECTED"}, {"chunkId": "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "versionId": "f811e60f-9af8-444f-b009-9594a530acd6", "reason": "NOT_SELECTED"}, {"chunkId": "79bb9ba4-b80b-419a-b631-b041ed00d6e2", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "1bff3b4d-f9a9-4474-9a6c-b5bbe518fa30", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "f1df5af2-d5db-4c0d-809e-54eb1b788a2d", "versionId": "f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9", "reason": "NOT_SELECTED"}, {"chunkId": "de9ab654-63eb-49ef-8450-4f6c84e64510", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}, {"chunkId": "56207e32-1182-4f74-bfb1-b28a0dd6e758", "versionId": "00c2e2bb-6465-4677-b8d5-6debdde8fe70", "reason": "NOT_SELECTED"}], "referencesTruncated": true, "selectedCount": 1, "applicability": "SELECTED", "validation": "VALIDATED", "finalCount": 1, "zeroStage": null, "completion": "complete", "completionStage": null, "completionReason": null, "completionMs": 102}, "semanticEvidence": null, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 1, rule none, score 0.4473; chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

```text
• Oct. 14 (Women)/15(Men) – Weekday DUPR Season Starts
```

**8. Final generated answer:**

The Weekday DUPR Season starts Oct. 14, 2026 for Women and Oct. 15, 2026 for Men.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## 8. saturday_end — FAIL

**1. Original question:** When does the Saturday regular competition wrap up?

**2. Interpretation:**
Intent: Find the end date or concluding time for a Saturday regular competition.; entities: Saturday regular competition; fact type: schedule/date. Normalized question: When does the Saturday regular competition conclude?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **0**.
- expanded: `When does the Saturday regular competition conclude?` — completed, 32 candidates.
- expanded: `"Saturday regular competition" conclude end date schedule` — SEARCH_FAILED, 0 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR League Rules — Saturday League PrimeTime League — page 14; chunk `da71cb2a-e2b8-4198-adee-b91e01bd8919`.
**5. Evidence score:** 0.4709 (unchanged threshold 0.35).
Components: semanticScore=0.5327, keywordScore=0, exactScore=0.85, authorityScore=0.85, contextScore=0.2, combinedScore=0.4709.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": {"reason": "The supplied Saturday DUPR League key dates directly state the end of the regular season as Feb. 20 / 27.", "usage": {"input_tokens": 1449, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 225, "output_tokens_details": {"reasoning_tokens": 149}, "total_tokens": 1674}, "candidateIds": ["da71cb2a-e2b8-4198-adee-b91e01bd8919", "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f", "529ef1f0-1fe6-49c0-8ef8-446384c56ec0", "3f80e620-9c4a-4fc8-b081-287b1f5fa9c2", "d6b9a348-9118-474d-96d4-1c7fea3b926c", "409c67f0-3a33-4755-86ae-9fb80a170429"]}, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 1, rule none, score 0.4332; chunk `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

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

**8. Final generated answer:**

For the 2026 Fall Saturday DUPR League, the regular season ends Feb. 20 / 27, 2026.

**9. Fallback:** False

**10. False-positive/questionable selection:** Wrong generated year: February 20/27 is after January in the fall-2026 chronological timeline, hence 2027. The semantic path selected the whole calendar chunk and did not supply the event-specific rollover metadata. Baseline safely fell back; this candidate instead produced an incorrect definitive date.

## 9. weekday_championship — PASS

**1. Original question:** When is the Weekday title decider?

**2. Interpretation:**
Intent: Find the scheduled date or time for an event referred to as the Weekday title decider.; entities: Weekday; fact type: event date/time. Normalized question: When is the Weekday title decider?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **2**.
- expanded: `"Weekday" "title decider" date time` — completed, 32 candidates.
- rescue: `"Weekday" important dates title championship` — completed, 32 candidates.
- rescue: `"Weekday" league schedule final decider` — completed, 32 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR League Rules — Weekday League Weekday League — page 13; chunk `79bb9ba4-b80b-419a-b631-b041ed00d6e2`.
**5. Evidence score:** 0.4561 (unchanged threshold 0.35).
Components: semanticScore=0.5013, keywordScore=0, exactScore=0.85, authorityScore=0.85, contextScore=0.2, combinedScore=0.4561.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": {"reason": "The supplied key dates for the Weekday DUPR League directly state the Championship Days, which answers when the Weekday title decider occurs.", "usage": {"input_tokens": 2272, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 75, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 2347}, "candidateIds": ["79bb9ba4-b80b-419a-b631-b041ed00d6e2", "c4ab8544-decb-4ea1-b856-2df4a2d196f1", "f1df5af2-d5db-4c0d-809e-54eb1b788a2d", "82e6fc33-a040-4153-b920-cfcd8bab55b5", "1bff3b4d-f9a9-4474-9a6c-b5bbe518fa30", "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "ee133944-bdb5-41ab-994f-d19440b45ddb", "c5792642-352c-49fa-a5c0-11399754fefe", "cbb9ff22-5b51-4391-a81d-fc4c08dba6c4", "c9809c3e-e99c-4b2f-b9d2-c9c5ad804747", "23083b78-255d-4fc6-9a57-2263dd4a5d40", "282fa8f4-d1bf-4351-902a-29507ea31937"]}, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 1, rule none, score 0.4482; chunk `c4ab8544-decb-4ea1-b856-2df4a2d196f1`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

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

**8. Final generated answer:**

The Weekday DUPR Championship Days are Dec. 9/10, 2026, for the 2026 Fall League.

**9. Fallback:** False

**10. False-positive/questionable selection:** Correct answer and league; broad whole-calendar selection rather than a single event excerpt. This selection pattern needs the rollover correction demonstrated by the Saturday failure.

## 10. unknown_paraphrase — PASS

**1. Original question:** When does PrimeTime receive its fixture list?

**2. Interpretation:**
Intent: Find the timing/date when PrimeTime receives its fixture list.; entities: PrimeTime; fact type: schedule timing / fixture list release date. Normalized question: When does PrimeTime receive its fixture list?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **2**.
- expanded: `PrimeTime fixture list receive date schedule` — completed, 32 candidates.
- rescue: `fixture list schedule important dates PrimeTime` — completed, 32 candidates.
- rescue: `league timetable fixtures PrimeTime` — completed, 32 candidates.

**4. Top original evidence:** 2026 Fall League Important Dates — PrimeTime DUPR League Key Dates — page 2; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`.
**5. Evidence score:** 0.5011 (unchanged threshold 0.35).
Components: semanticScore=0.5982, keywordScore=0, exactScore=0.85, authorityScore=0.8414, contextScore=0.2, combinedScore=0.5011.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": {"reason": "The PrimeTime league key dates directly state when schedules are completed and sent, which answers when PrimeTime receives its fixture list.", "usage": {"input_tokens": 2058, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 71, "output_tokens_details": {"reasoning_tokens": 0}, "total_tokens": 2129}, "candidateIds": ["950a54ab-aa3b-4f43-9c51-88ce0ca803ae", "98abadef-5153-483a-ab64-51be0c95480b", "d6b9a348-9118-474d-96d4-1c7fea3b926c", "da71cb2a-e2b8-4198-adee-b91e01bd8919", "483c8e50-3ff0-4ab2-bce9-dbddd91bf75b", "ee133944-bdb5-41ab-994f-d19440b45ddb", "c5792642-352c-49fa-a5c0-11399754fefe", "6a52b72e-29e0-474b-9c0c-10102f67eb59", "23083b78-255d-4fc6-9a57-2263dd4a5d40", "cbb9ff22-5b51-4391-a81d-fc4c08dba6c4", "de9ab654-63eb-49ef-8450-4f6c84e64510", "2acff5ec-8f67-4a41-9320-1eb3cf91cdd8"]}, "fallbackReason": null}

**7. Final selected evidence:**
- 2026 Fall League Important Dates, page 2, rule none, score 0.5068; chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`, version `f811e60f-9af8-444f-b009-9594a530acd6`.

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

**8. Final generated answer:**

PrimeTime’s schedules/fixture list are completed and sent on Wednesday, Oct. 7, 2026, for the 2026 Fall League.

**9. Fallback:** False

**10. False-positive/questionable selection:** Correct answer and league; broad whole-calendar selection rather than a single event excerpt. This selection pattern needs the rollover correction demonstrated by the Saturday failure.

## 11. rules_control — PASS

**1. Original question:** Do all games in the Saturday league post to DUPR

**2. Interpretation:**
Existing validated selection path; no new semantic planner invoked. Recorded legacy interpretation: `{"kind": "unresolved", "object": null, "leagues": ["saturday"], "division": null, "event": "opening", "phase": "unspecified", "currentDate": false, "matchingQuestion": "do all games in the saturday league post to dupr"}`.

**3. Expansion/rescue:**
Status `not_needed`; rescue flag `False`; actual rescue searches **0**.
No expanded/rescue search needed.

**4. Top original evidence:** LWR Pickleball Club DUPR League Rules — DUPR Submission & Eligibility — page 5; chunk `a3ffc4ab-d224-4c32-969f-ce3d69fa9bdc`.
**5. Evidence score:** 0.5687 (unchanged threshold 0.35).
Components: semanticScore=0.7046, keywordScore=0, exactScore=0.95, authorityScore=0.95, contextScore=0, combinedScore=0.5687.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": null, "fallbackReason": null}

**7. Final selected evidence:**
- LWR Pickleball Club DUPR League Rules, page 10, rule 6.2.3.6, score 0.4892; chunk `04bc0faf-3d7f-4123-9e63-61cd081d4d83`, version `f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9`.

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

**8. Final generated answer:**

No. In the Saturday league, all gender-based games are submitted and posted to DUPR, but mixed doubles games and any Picklebreaker™ games are not submitted or posted to DUPR.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## 12. rules_rating — PASS

**1. Original question:** For the Season DUPR rating, do you round up down to the first decimal?

**2. Interpretation:**
Intent: Find whether and how a Season DUPR rating is rounded to the first decimal place, including whether it rounds up or down.; entities: Season DUPR; fact type: rating calculation or rounding policy. Normalized question: For the Season DUPR rating, is the rating rounded up or down to the first decimal place?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **0**.
- expanded: `For the Season DUPR rating, is the rating rounded up or down to the first decimal place?` — completed, 32 candidates.
- expanded: `"Season DUPR" rating rounding first decimal` — completed, 32 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR League Rules — Saturday DUPR League Divisions — page 9; chunk `0b92f4df-e069-4937-bf1b-27f9c4da802e`.
**5. Evidence score:** 0.5354 (unchanged threshold 0.35).
Components: semanticScore=0.6338, keywordScore=0, exactScore=0.95, authorityScore=0.95, contextScore=0, combinedScore=0.5354.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": {"reason": "Rule 4.2 directly states how Season DUPR Ratings are handled to the first decimal: all DUPR ratings are truncated to the nearest tenth, with examples showing no rounding up.", "usage": {"input_tokens": 3310, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 180, "output_tokens_details": {"reasoning_tokens": 95}, "total_tokens": 3490}, "candidateIds": ["f1df5af2-d5db-4c0d-809e-54eb1b788a2d", "01f68c64-fe37-409e-8730-0d86542c7bdc", "0b92f4df-e069-4937-bf1b-27f9c4da802e", "2eafc19f-f9c2-4b44-9ebd-0b5bb4b4f84e", "98abadef-5153-483a-ab64-51be0c95480b", "a3ffc4ab-d224-4c32-969f-ce3d69fa9bdc", "c68850bb-3747-491f-9d16-e33689c16f97", "04bc0faf-3d7f-4123-9e63-61cd081d4d83", "b1c966a2-4f36-4446-911c-403c7e850369", "f18d21e0-ff56-403b-9050-5ebd9f2b8298", "d500ed6e-e9e2-4d22-a432-6bc632d5df9d", "f9f05921-2ee9-46fc-9b44-e5a861d7dd6f"]}, "fallbackReason": null}

**7. Final selected evidence:**
- LWR Pickleball Club DUPR League Rules, page 3, rule 4, score 0.5402; chunk `01f68c64-fe37-409e-8730-0d86542c7bdc`, version `f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9`.

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

**8. Final generated answer:**

No. For the Season DUPR Rating, ratings are truncated to the nearest tenth—not rounded up or down. For example, 3.496 becomes 3.4, and 3.401 also becomes 3.4.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## 13. captains_control — FAIL

**1. Original question:** Where can I find the seasons scoring sheet

**2. Interpretation:**
Intent: Find the location or source of a seasons scoring sheet in the document catalog.; entities: none; fact type: document location / reference. Normalized question: Where can I find the seasons scoring sheet?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **2**.
- expanded: `Where can I find the seasons scoring sheet?` — completed, 32 candidates.
- expanded: `"seasons scoring sheet" OR "season scoring sheet" OR scoresheet` — completed, 32 candidates.
- rescue: `score reporting form sheet` — completed, 32 candidates.
- rescue: `league scoresheet scoring form` — completed, 32 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR Captains Guide — VIEW SCHEDULE/GAME INFORMATION — page 9; chunk `82e6fc33-a040-4153-b920-cfcd8bab55b5`.
**5. Evidence score:** 0.444 (unchanged threshold 0.35).
Components: semanticScore=0.4947, keywordScore=0, exactScore=0.85, authorityScore=0.8328, contextScore=0, combinedScore=0.444.

**6. Applicability decision:**
{"policy": null, "semanticEvidence": {"reason": "INVALID_EVIDENCE_IDS", "usage": {"input_tokens": 2330, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 353, "output_tokens_details": {"reasoning_tokens": 234}, "total_tokens": 2683}, "candidateIds": ["b7ef08d2-387f-4100-8b1c-60af2a258273", "c83dd035-c4f8-440d-b504-7e1f5be14ace", "82e6fc33-a040-4153-b920-cfcd8bab55b5", "8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2", "7320eb54-2cef-4b6b-a452-dc1b259b9f77", "ef66818d-9fe4-4a28-9d45-d5c7ce7166b0", "1b89a6d2-c608-4ada-8a89-bf37dc2dc240", "5e7e1d99-f54b-4edf-a057-824deba750d3", "0a229369-7a54-4ed9-bc9f-8de81b6bedaf", "10752e57-cc3f-4fce-b25d-e0da5aed056f", "3aa22b42-d85b-4357-b676-b78f5a8d5ce0", "208b9c33-b755-4657-aa3a-45f6df0f277d"]}, "fallbackReason": "NO_APPLICABLE_EVIDENCE_AFTER_RESCUE"}

**7. Final selected evidence:**
None.

**8. Final generated answer:**

I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.

**9. Fallback:** True

**10. False-positive/questionable selection:** Evidence-ID validation rejected the assessor output (INVALID_EVIDENCE_IDS); no unsupported evidence was accepted. Correct Match Score Sheet instructions participated in the candidate pool. The same question also falls back on baseline; this is unresolved coverage, not a newly demonstrated regression.

## 14. lms_control — PASS

**1. Original question:** How do I complete Match Setup in the LMS?

**2. Interpretation:**
Existing validated selection path; no new semantic planner invoked. Recorded legacy interpretation: `{"kind": "unresolved", "object": null, "leagues": [], "division": null, "event": "opening", "phase": "unspecified", "currentDate": false, "matchingQuestion": "how do i complete match setup in the lms?"}`.

**3. Expansion/rescue:**
Status `not_needed`; rescue flag `False`; actual rescue searches **0**.
No expanded/rescue search needed.

**4. Top original evidence:** LWR Pickleball Club DUPR Captains Guide — LEAGUE MANAGEMENT SYSTEM (LMS) - (CAPTAINS USER GUIDE) — page 1; chunk `d85ffab8-463c-407f-9ef2-4494ce013ee0`.
**5. Evidence score:** 0.6862 (unchanged threshold 0.35).
Components: semanticScore=0.6251, keywordScore=0.65, exactScore=0.95, authorityScore=0.9308, contextScore=0, combinedScore=0.6862.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": null, "fallbackReason": null}

**7. Final selected evidence:**
- LWR Pickleball Club DUPR League Rules, page 5, rule 5.5, score 0.6838; chunk `86cd1b2b-55ad-46d2-af2f-9ea3a18f2143`, version `f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9`.

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
- LWR Pickleball Club DUPR Captains Guide, page 1, rule none, score 0.6862; chunk `d85ffab8-463c-407f-9ef2-4494ce013ee0`, version `c0b30100-1d00-42a2-9b0f-9aa97fe23d83`.

```text
• Captains User Guide: Everything you need to run your team in the LMS—from roster management
and match setup to score entry and standings tracking. For step-by-step technical instructions on
using the LMS, log in and click the Captains User Guide (question mark icon) in the top header.
```
- LWRPC-Captains Guide to the LMS, page 11, rule none, score 0.671; chunk `5b432210-b886-44b6-a6e4-5b2312b07dee`, version `7ec16cf5-7b9d-4b3b-a847-8dd5767396c7`.

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
- LWR Pickleball Club DUPR Captains Guide, page 7, rule none, score 0.6456; chunk `8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2`, version `c0b30100-1d00-42a2-9b0f-9aa97fe23d83`.

```text
o Lineup Submission: Both captains must enter starting lineups in Match Setup at least 3 days
before match day. It is recommended that the Home Team enter their lineups first.

o Match Score Sheet: Once both teams have entered their lineups in the League Management
System (LMS), the official Match Score Sheet may be printed. Captains can access the Match
Score Sheet button from the “Next Match” section of their Captain Dashboard.
```

**8. Final generated answer:**

To complete Match Setup in the LMS:

1. Log in to the LMS and use the Match Setup button for the upcoming match.
2. Both home and visiting captains must submit their rosters/starting lineups no later than three (3) days before the scheduled match.
3. The Home Team is strongly recommended to enter its lineup first.
4. Assign player pairings and save the lineup using Save Match Setup.
5. The LMS validates entries, including division/rating requirements, duplicates, roster membership, and team-rating maximums; ineligible combinations may show an on-screen warning.
6. If you make any lineup or roster changes after the first submission, enter them through Match Setup; the system automatically notifies the opposing captain.
7. Match Setup is incomplete while the button is red and completed when it is blue. When both teams have completed setup, the Match Score Sheet button turns green and a complete match score sheet can be printed.

For step-by-step technical LMS instructions, log in and click the Captains User Guide question-mark icon in the top header.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## 15. unsupported_control — PASS

**1. Original question:** What is the official league policy on teleporting to matches?

**2. Interpretation:**
Intent: Find the official league policy regarding whether teleporting to matches is permitted, prohibited, or addressed.; entities: none; fact type: league policy or rule. Normalized question: What is the official league policy on teleporting to matches?

**3. Expansion/rescue:**
Status `completed`; rescue flag `True`; actual rescue searches **2**.
- expanded: `teleporting to matches league policy official rules` — completed, 32 candidates.
- rescue: `teleporting matches policy` — completed, 32 candidates.
- rescue: `match attendance arrival participation rules` — completed, 32 candidates.

**4. Top original evidence:** LWR Pickleball Club DUPR Captains Guide — DUPR LEAGUE RULES — page 1; chunk `82a9d022-4428-4c83-bcdc-e8e2ff4cfb72`.
**5. Evidence score:** 0.4116 (unchanged threshold 0.35).
Components: semanticScore=0.4258, keywordScore=0, exactScore=0.85, authorityScore=0.8328, contextScore=0, combinedScore=0.4116.

**6. Applicability decision:**
{"policy": null, "semanticEvidence": {"reason": "The supplied excerpts do not state any official league policy about teleporting to matches; they only reference where league rules may be found and provide unrelated match administration or rulebook content.", "usage": {"input_tokens": 1689, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 0}, "output_tokens": 100, "output_tokens_details": {"reasoning_tokens": 40}, "total_tokens": 1789}, "candidateIds": ["82a9d022-4428-4c83-bcdc-e8e2ff4cfb72", "87132638-e647-4ae7-9a45-ad4b563cfacf", "bff1ee9b-54d0-486f-8938-368e0b730736", "c1eb94d9-7480-4d5e-8db2-f5936605db69", "590d33da-2c06-4087-be0a-15dd7317b998", "8f7a8cf0-4e2c-4a6f-bd58-7e51f0b02bc2", "1859086d-5874-43b5-b162-4cd3152c0eab"]}, "fallbackReason": "NO_APPLICABLE_EVIDENCE_AFTER_RESCUE"}

**7. Final selected evidence:**
None.

**8. Final generated answer:**

I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.

**9. Fallback:** True

**10. False-positive/questionable selection:** PASS: assessor explicitly found no teleporting policy, selected nothing and used the expected fallback. No fabricated policy.

## 16. captains_ball — PASS

**1. Original question:** What type of balls will we be using?

**2. Interpretation:**
Existing validated selection path; no new semantic planner invoked. Recorded legacy interpretation: `{"kind": "unresolved", "object": null, "leagues": [], "division": null, "event": "opening", "phase": "unspecified", "currentDate": false, "matchingQuestion": "what type of balls will we be using?"}`.

**3. Expansion/rescue:**
Status `not_needed`; rescue flag `False`; actual rescue searches **0**.
No expanded/rescue search needed.

**4. Top original evidence:** 2026 USA Pickleball Official Rulebook — 3.C Ball Specifications — Construction — page 13; chunk `4da256ff-d390-47d4-8183-dfa45286f107`.
**5. Evidence score:** 0.7304 (unchanged threshold 0.35).
Components: semanticScore=0.5734, keywordScore=1, exactScore=0.85, authorityScore=0.9899, contextScore=0, combinedScore=0.7304.

**6. Applicability decision:**
{"policy": {"category": "validated_structured_output", "label": "Structured output validated", "responseStatus": "completed"}, "semanticEvidence": null, "fallbackReason": null}

**7. Final selected evidence:**
- LWR Pickleball Club DUPR Captains Guide, page 10, rule none, score 0.646; chunk `c9809c3e-e99c-4b2f-b9d2-c9c5ad804747`, version `c0b30100-1d00-42a2-9b0f-9aa97fe23d83`.

```text
o The League shall provide:
 Match Balls: Franklin Outdoor X-40 optic yellow balls for all regular season and playoƯ
matches.
```

**8. Final generated answer:**

The club will use Franklin Outdoor X-40 optic yellow balls for all regular season and playoff matches.

**9. Fallback:** False

**10. False-positive/questionable selection:** No false-positive or questionable final selection observed in this replay.

## Call audit and usage

Across initial attempts, final replays and baseline comparisons: 104 OpenAI calls; 5 contact-bearing payloads blocked before transmission; 6 contact omissions in approved replays. Token totals: {"responsesInput": 63551, "responsesOutput": 5118, "embeddingTokens": 592}. Embedding tokens counted separately. No deployment or production writes.

## Acceptance decision

Keep LMS-0734 undeployed. Correct event-specific year grounding, invalid-ID handling and truthful rescue execution diagnostics, then rerun the affected real-model cases and the passing non-regression controls. This report does not claim the full generalized capability is production accepted.

### Initial-attempt reliability note

The first unsupported-topic run ended with `SEMANTIC_RETRIEVAL_UNAVAILABLE`; the contact-filtered final replay completed its relevance assessment and correctly selected no evidence. The initial diagnostic does not expose a precise underlying cause, so it should not be attributed to a specific provider error without further evidence. The final pass demonstrates the refusal path, not a guarantee of provider availability.
