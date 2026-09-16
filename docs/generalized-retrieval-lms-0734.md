# Ask LWR generalized retrieval — LMS-0734 / 0.1.556

Status: **OpenAI-backed validation FAIL; not deployed.** Owner-approved validation completed. See [per-case results and blockers](lms-0734-openai-validation.md). Earlier local-test evidence below is retained as history.

## Reproduced baseline

Question: **when does the primetime league get their schedules**

The correct Important Dates evidence was already rank 1 and passed the unchanged 0.35 retrieval threshold. Final applicability selection returned zero chunks. The existing schedule-release matcher did not understand “get their schedules”; the general date matcher excludes “their.” This is an interpretation/applicability failure after successful retrieval, not missing source evidence.

### Active catalog considered

- LWR Pickleball Club Code of Conduct (`other`), active version `1ea2ccf1-598e-4d0c-b0a4-b20f833805f0`.
- LWRPC-Players Guide to the LMS (`player_guide`), active version `939baf3b-f0b9-4c17-86be-68b85fd1b0de`.
- 2026 Fall League Important Dates (`league_supplement`), active version `f811e60f-9af8-444f-b009-9594a530acd6`.
- 2026 USA Pickleball Official Rulebook (`usap_rulebook`), active version `00c2e2bb-6465-4677-b8d5-6debdde8fe70`.
- LWR Pickleball Club DUPR Captains Guide (`captain_guide`), active version `c0b30100-1d00-42a2-9b0f-9aa97fe23d83`.
- LWR Pickleball Club DUPR League Rules (`league_rules`), active version `f4c0e95b-e6c9-4c2a-bf26-a24d10c329d9`.
- LWRPC-Captains Guide to the LMS (`captain_guide`), active version `7ec16cf5-7b9d-4b3b-a847-8dd5767396c7`.

### Original retrieved candidates and score components

Scores below are the stored RPC components exposed by Stage 3. Combined weighting: semantic .47, keyword .24, exact .19, authority .06, context .04.

| Rank | Document / heading | Page | Semantic | Keyword | Exact | Authority | Context | Combined |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026 Fall League Important Dates / PrimeTime DUPR League Key Dates | 2 | 0.6439 | 0.95 | 0.85 | 0.9404 | 0.2 | 0.7566 |
| 2 | 2026 USA Pickleball Official Rulebook / End Change Time-Out | 57 | 0.2586 | 0.95 | 0.85 | 0.9404 | 0 | 0.5675 |
| 3 | 2026 Fall League Important Dates / Weekday DUPR League Key Dates | 1 | 0.5125 | 0.95 | 0 | 0.9404 | 0 | 0.5253 |
| 4 | 2026 Fall League Important Dates / Saturday DUPR League Key Dates | 1 | 0.493 | 0.95 | 0 | 0.9404 | 0 | 0.5162 |
| 5 | LWRPC-Captains Guide to the LMS /  | 11 | 0.4041 | 0.95 | 0 | 0.9308 | 0.2 | 0.4818 |
| 6 | LWR Pickleball Club DUPR League Rules / Match Setup and Roster Exchange | 5 | 0.3804 | 0.95 | 0 | 0.95 | 0 | 0.4638 |
| 7 | LWR Pickleball Club DUPR League Rules / DUPR RATINGS/DIVISIONS | 4 | 0.3727 | 0.95 | 0 | 0.95 | 0 | 0.4602 |
| 8 | LWR Pickleball Club DUPR League Rules / PrimeTime DUPR League Divisions | 12 | 0.5026 | 0 | 0.85 | 0.85 | 0.2 | 0.4567 |
| 9 | LWR Pickleball Club DUPR League Rules / 6.3 | 12 | 0.4996 | 0 | 0.85 | 0.85 | 0.2 | 0.4553 |
| 10 | LWR Pickleball Club DUPR Captains Guide / CREATE/UPDATE TEAM ROSTER | 7 | 0.3565 | 0.95 | 0 | 0.9308 | 0 | 0.4514 |
| 11 | LWR Pickleball Club DUPR League Rules / CLUB LEAGUE FORMAT | 2 | 0.4422 | 0.0639 | 0.85 | 0.85 | 0.2 | 0.4437 |
| 12 | LWR Pickleball Club DUPR Captains Guide / ENTER/VERIFY SCORES | 9 | 0.3284 | 0.95 | 0 | 0.9308 | 0 | 0.4382 |
| 13 | LWR Pickleball Club DUPR League Rules / Saturday League PrimeTime League | 13 | 0.4521 | 0 | 0.85 | 0.85 | 0.2 | 0.433 |
| 14 | LWR Pickleball Club DUPR Captains Guide / HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM) | 4 | 0.313 | 0.95 | 0 | 0.9308 | 0 | 0.4309 |
| 15 | LWRPC-Players Guide to the LMS /  | 7 | 0.3091 | 0.95 | 0 | 0.9212 | 0 | 0.4286 |
| 16 | LWRPC-Players Guide to the LMS /  | 9 | 0.3042 | 0.95 | 0 | 0.9212 | 0 | 0.4263 |
| 17 | LWR Pickleball Club DUPR League Rules / Saturday League PrimeTime League | 14 | 0.4234 | 0 | 0.85 | 0.85 | 0.2 | 0.4195 |
| 18 | LWRPC-Captains Guide to the LMS /  | 14 | 0.2752 | 0.95 | 0 | 0.9308 | 0 | 0.4132 |
| 19 | LWR Pickleball Club DUPR Captains Guide / VIEW SCHEDULE/GAME INFORMATION | 9 | 0.4103 | 0 | 0.85 | 0.8328 | 0 | 0.4043 |
| 20 | LWR Pickleball Club DUPR Captains Guide / VIEW SCHEDULE/GAME INFORMATION | 8 | 0.4102 | 0 | 0.85 | 0.8328 | 0 | 0.4043 |
| 21 | 2026 USA Pickleball Official Rulebook / Partner Change (Doubles) | 48 | 0.2528 | 0.95 | 0 | 0.9404 | 0 | 0.4032 |
| 22 | LWR Pickleball Club DUPR League Rules / 1.2 | 17 | 0.2364 | 0.95 | 0 | 0.95 | 0 | 0.3961 |
| 23 | LWRPC-Captains Guide to the LMS /  | 7 | 0.2329 | 0.95 | 0 | 0.9308 | 0 | 0.3933 |
| 24 | LWRPC-Players Guide to the LMS /  | 8 | 0.3769 | 0 | 0.85 | 0.8242 | 0 | 0.3881 |
| 25 | 2026 USA Pickleball Official Rulebook / 25.C Hybrid Doubles Play — Adaptive Standing Players | 76 | 0.2201 | 0.95 | 0 | 0.9404 | 0 | 0.3879 |
| 26 | 2026 USA Pickleball Official Rulebook / Notice of Schedule Changes | 43 | 0.366 | 0 | 0.85 | 0.8414 | 0 | 0.384 |
| 27 | LWRPC-Captains Guide to the LMS /  | 5 | 0.2096 | 0.95 | 0 | 0.9308 | 0 | 0.3824 |
| 28 | 2026 USA Pickleball Official Rulebook / 15.A Event Categories. — Open Gender and Age Events | 37 | 0.2074 | 0.95 | 0 | 0.9404 | 0 | 0.3819 |
| 29 | LWRPC-Players Guide to the LMS /  | 5 | 0.2095 | 0.95 | 0 | 0.9212 | 0 | 0.3818 |
| 30 | 2026 USA Pickleball Official Rulebook / Time Between Matches | 61 | 0.3411 | 0 | 0.85 | 0.8414 | 0 | 0.3723 |
| 31 | LWR Pickleball Club Code of Conduct / 1 | 1 | 0.1843 | 0.95 | 0 | 0.9404 | 0 | 0.3711 |
| 32 | 2026 USA Pickleball Official Rulebook / 21.F Time-Out Between Games — Change of Starting Server | 61 | 0.3346 | 0 | 0.85 | 0.8414 | 0 | 0.3692 |

### Verified source context

Chunk `950a54ab-aa3b-4f43-9c51-88ce0ca803ae`, version `f811e60f-9af8-444f-b009-9594a530acd6`, page 2. Both the league heading and date line are present in the same searchable chunk. No corpus reprocessing is needed.

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

## Implementation

- Model-derived structured query interpretation with free-form topic/fact type, extracted entities/nouns, concepts, equivalent question and bounded generated searches. No PrimeTime-specific application phrase or date.
- Existing validated selections retain their existing path. When those paths reject evidence, the semantic layer searches two equivalent variants with fresh embeddings; if still unsuccessful it tries two broader rescue queries.
- All searches use the same protected hybrid RPC and original role/scope/context. Results merge by chunk ID, retaining the best raw score. A 0.025 document-type affinity changes ranking only; it never qualifies a below-threshold candidate.
- The equivalent question feeds existing applicability and policy-completion checks, while the original question remains unchanged for the user, answer generation and conversation history.
- Existing same-version searchable policy completion and passage continuation supply context. The verified Important Dates chunk already retains its heading. No embedding or document mutations.
- Invalid plans, changed policy/scope, dropped protected constraints, unavailable providers, weak evidence and failed applicability remain fail-closed.
- Admin diagnostics expose the original path, interpretation, generated queries, active catalog, per-path score components, context completion, final evidence, rescue flag and exact fallback reason.

## Validation and release state

Full test suite: **1,224 passed, zero failures/skips**. Final affected tests after diagnostic refinement: **42 passed**. Lint: zero errors, 11 existing warnings. Production build: passed after the Windows Next.js cache write required an elevated local build. No deployment.

The semantic relevance fallback handles still-unrecognized terminology after expansion and rescue. It can select at most four supplied qualifying chunk IDs, not invent evidence or source text. It uses existing governing-source selection and material-qualification handling. It cannot override an existing recognized policy or concept rejection. All selected sources still undergo the existing final active/searchable source revalidation. Planner and relevance outputs are bounded structured JSON; provider failures are fail-closed.

Recorded production-data replay with mocked model interpretation/search results selects **one** chunk after the change, versus **zero** before. The selected excerpt is exactly “• Oct. 7, Wednesday – Schedules completed and sent,” bound to the original PrimeTime league heading and active version. See [local evidence](generalized-retrieval-local-evidence.json). This is deterministic local evidence, **not live model acceptance**.

Live planner testing was blocked by automatic approval review because it would disclose the question and active internal document metadata to OpenAI. No workaround was used. Existing read-only baseline retrieval was completed before that block. Pending approval: actual model-backed interpretation, fresh expanded hybrid searches, and answer generation against active official sources, using only document metadata/excerpts and test questions. No business data is needed.

Version history: source at e88946c still labels itself LMS-0732 / 0.1.554, but LMS-0733 / 0.1.555 was already used for the documented Season Ratings release. This new change uses the next unused identity, LMS-0734 / 0.1.556.

No SQL, RLS, authorization, business-data, corpus or production deployment changes. Application rollback is restoration of the scoped application diff; database recovery is not required because no database changes were made.

## Corrected successor

LMS-0735 / 0.1.557 resolves these validation blockers and passes the final full automated suite and sixteen OpenAI-backed cases. It remains local and undeployed. See [correction report](lms-0735-validation.md).
