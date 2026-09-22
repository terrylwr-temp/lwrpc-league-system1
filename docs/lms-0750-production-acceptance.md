# LMS-0750 / 0.1.573 — production acceptance

**PRODUCTION ACCEPTED — 2026-09-20.** The owner authorized the controlled release, the full Rules PDF reprocess to OpenAI embeddings and a new Supabase version, and the same controlled reprocess for Captains Guide and Important Dates. All corpus, application, normal LMS, Ask LWR, and data-integrity gates below passed. No production business-data, SQL, grant, or RLS change was made.

## Deployment and recovery

| Item | Verified value |
| --- | --- |
| Production | https://league.lwrpickleballclub.com |
| Version | LMS-0750 / 0.1.573 |
| Exact commit | `ebe215ee2c085ec39c04053f24106c7104f50d0e` |
| READY deployment | `dpl_7TCcZGcsr7Y8UMfsoBk2puvBHnbe` |
| Immutable deployment | https://lwrpc-admin-e2r70x9gh-terry-lwrpc.vercel.app |
| READY time | 2026-09-20 16:21:01 UTC |
| Retained READY rollback | `dpl_EP8usAGHkKhqmCMBLkTVbdi6pb1B`, commit `dfec4e81b947ce8f4d368e7d030d6607cbc4b41f` |
| Rollback URL | https://lwrpc-admin-eeo82cbwz-terry-lwrpc.vercel.app |

GitHub main matched `dfec4e8` immediately before the push. Vercel built `ebe215e` from main, reported READY, and assigned the production domain to that deployment. Both candidate and rollback were rechecked READY. There is no migration to roll back; application recovery is the retained deployment. The PDF source versions remain in Supabase history and were never patched in place.

## Root cause and correction

The original question **“Can we have players on multiple teams?”** retrieved the operative multiple-team provision too weakly: on the then-active Rules corpus, the Rule 5.1.2 chunk ranked **14 / 0.2455**, below the unchanged **0.35** evidence threshold. A nearby Captains Guide passage about registering multiple teams could instead be selected. The generalized correction recognizes player membership on plural teams or rosters, runs a bounded concept-aligned query through the existing hybrid search when direct evidence is missing, and requires a matching operative League Rules passage at final selection. It does not name Rule 5.1.2, assert a policy outcome, or lower evidence standards. The original question vector is reused for the extra lexical search.

The release review also found PDF extraction mapping visual `ff` to U+01AF (`Ư`), including `suƯicient` in Rule 5.1.1 beside the operative Rule 5.1.2 passage. Stage 2.2 now repairs the glyph only in English PDF text normalization, before chunk construction, storage, FTS, and embeddings. User-entered Unicode and other application paths remain unchanged.

## Exact corpus review

The prior Rules corpus change during diagnosis added the general multiple-roster provision at **Rule 5.1.2**, renumbered the former Section 5 provisions, and left **Rule 3.7** as a distinct same-community join/substitute rule. [The first release review](ai-multiple-team-controlled-release-review.md) records previous/current IDs, changed and unchanged chunks, and the extraction gate that stopped deployment. The owner-authorized normalization then reprocessed the same PDFs through the normal workflow. Each new chunk was compared with the reviewed source preflight before activation; the only text changes were `Ư` → `ff`:

| PDF | Previously active version | New active ready version | Corrected glyphs | Chunks | Searchable with embeddings |
| --- | --- | --- | ---: | ---: | ---: |
| Rules | `2b548146-006e-4f66-853e-e1e61430a50e` | `efe8e0ff-9e8e-40c3-88f4-cb6bf068ddbf` | 23 | 68 | 66/66 |
| Captains Guide | `a6ad6df1-0432-4abc-873c-75b7ad4b48d0` | `bfe6d170-a683-4a43-9a1d-c59244012173` | 3 | 18 | 17/17 |
| Important Dates | `d8f9b2a9-a804-48d4-88e7-a26d80948456` | `af622e44-b128-45a5-919f-29a3901af0c9` | 1 | 4 | 4/4 |

The initial complete processed corpus audit found **537** malformed glyphs: **27 in active** PDF versions and **510 already historical**. The final audit found **zero active** occurrences; all **537** stored occurrences now belong to superseded historical versions. All seven active AI documents are ready and have an embedding for every searchable chunk. Rules 5.1.1 reads `sufficient`; Rules 5.1.2 and 3.7, numbering, headings, chunk boundaries, and source citations are intact. The Captains Guide retains 23 preexisting private-use glyph warnings in unchanged text. [The PDF review](ai-pdf-ff-normalization-review.md) and `.local-validation/ai-pdf-glyph-audit-{before,final}.json` contain the per-occurrence audit and processing receipts.

## Verification before release

The final protected automated suite passed **1,409/1,409**. Focused PDF/document processing tests passed **11/11**. Lint passed with **zero errors and 11 existing warnings**; the production build passed. Lint/build passed again after the version bump. No protected retrieval fingerprint was regenerated, no evidence threshold or search weight was changed, and no SQL/schema/security file is in the release commit.

Against the final active corpus, six differently worded general questions all selected and cited Rule **5.1.2**; the same-community control selected and cited Rule **3.7**. A separate read-only citation pass returned one empty selection once for “Can a player be rostered on more than one team?” Three focused reruns and a complete seven-case rerun passed. This isolated transient did not recur in the production UI and no threshold change was made to mask it. The [retrieval diagnosis](ai-multiple-team-retrieval-correction.md), [final trace](ai-multiple-team-final.json), and `.local-validation/ai-pdf-glyph-final-retrieval.json` retain candidate and evidence details.

## Normal LMS first

The real Commissioner production session loaded the LMS-0750 dashboard before Ask LWR testing. All Seasons showed **1,836 active members**, **16 roster assignments**, **102 selected-scope teams**, and **3.854** average Season DUPR. Teams & Rosters loaded **102 of 121 teams** with ordinary controls; Members loaded **1,836 of 2,016** members with paging and role-aware actions. No member, team, roster, match, score, schedule, or rating write was submitted. Active Seasons showing zero teams before season start remains expected. Other-role real sessions and populated match workflows were not available for this acceptance; the protected automated suite covers their code paths.

## Live Ask LWR acceptance

The real Commissioner opened Ask LWR in production and asked each question as a new conversation, without feedback votes:

| Question | Observed answer | Official citation |
| --- | --- | --- |
| Can we have players on multiple teams? | Yes; independent eligibility for every team, league, and division | Rule 5.1.2, page 4 |
| Can I play on two teams? | Yes; same independent eligibility qualification | Rule 5.1.2, page 4 |
| Are players limited to only one roster? | No; more than one roster if independently eligible | Rule 5.1.2, page 4 |
| Can a player be rostered on more than one team? | Yes; same independent eligibility qualification | Rule 5.1.2, page 4 |
| Can a player join or substitute for multiple community teams within the same community? | Yes, subject to League and DUPR rating regulations | Rule 3.7, page 3 |

All five generated responses were `answer` outcomes under **LMS-0750**, source family `lwr`, one selected evidence item, stage 3 sufficient, unchanged **0.35** threshold, and no model skip or technical error. The five GPT-5.5 generations recorded **8,047 input / 258 output tokens**; embedding usage is not included. The UI citations bind to the newly active Rules version. Vercel reported **zero error-level runtime events** after the requests; browser warnings/errors after sign-in were zero. An earlier browser session-expired error occurred before the owner signed in and before acceptance.

## Data and security integrity

All **21 protected operational table fingerprints** matched the predeployment read-only snapshot exactly, including members, roles, teams, rosters, ratings, seasons, schedules, matches, scores, and standings. Counts remained **2,016 members**, **218 user-role rows**, **121 teams**, **16 team-member rows**, and **1,422 season-rating rows**. The Ask LWR checks created five normal AI outcome telemetry rows; no operational business rows changed. The release commit contains no SQL migration, RLS/grant change, authentication change, or business-data write path. Final read-only catalog checks again found the seven active documents ready, all searchable chunks embedded, and zero active malformed glyphs.

Evidence remains in `.local-validation/ai-pdf-glyph-*` and `.local-validation/lms0750-final-{lint,build}.txt`; generated logs and raw PDF source files are kept local. The final acceptance report and roadmap status were written after the application release and are retained locally to avoid a second deployment.
