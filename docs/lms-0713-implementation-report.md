# LMS-0713 implementation report

Prepared 2026-09-05. **Local implementation for review; not deployed. Stage 7 remains paused.** LMS-0713 is the final bounded Stage 6 production cleanup. LMS-0712 remains the prior implementation/revision; its historical reports are retained.

## Production acceptance carried forward from LMS-0712

The user confirmed production PASS for personal DUPR protection, completed-lineup status protection, personal Friday opponent protection, NR and Season DUPR official answers, kitchen Rule 11.A, contextual kitchen momentum Rule 11.A.2, the LWR-selected Franklin Outdoor X-40 Optic match ball, the mobile full-screen panel, and feedback eligibility/rendering. These paths are preserved. The earlier production kitchen context-loss concern is now resolved by the user's successful production acceptance sequence; LMS-0713 does not alter conversation receipts or kitchen handling.

Feedback append-only database event acceptance is still pending after LMS-0713 deployment. Overall Stage 6 acceptance remains pending the final roster answer and feedback event checks.

## Why this revision exists

The roster troubleshooting question now correctly enters document RAG, but the production answer asserted “Most likely” without live player information. General prerequisites establish checks, not the actual reason a particular player is absent. The old selection also admitted a tangential upcoming-match passage.

## Read-only production-corpus replay before editing

Exact test question: `I'm changing my roster but I can't find a player in the list, why?`

This is a fresh replay against the configured active official corpus, using the pre-correction selector and the unchanged retrieval implementation. It is **not a recovered historical production request**: its original page context, receipt and exact production scores were not supplied. Replay context was `askAbout: all`, authenticated-role hint `captain`, empty path/module and no scope IDs or conversation history. Local retrieval enablement was set only for this diagnostic process; no configuration file or deployed environment was changed. Only the test question was sent for query embedding. No member tables were read.

Stage 3 top eight enter the ordinary Stage 4 handoff; ranks 1–12 enter bounded authority review. No additional retrieval probe was introduced. Scores from this replay:

| Rank | Document / page / rule | Score | Old GPT/citations | LMS-0713 GPT/citations |
| --- | --- | ---: | --- | --- |
| 1 | LWRPC-Captains Guide to the LMS / p8 | 0.4740 | Selected | Selected |
| 2 | LWRPC-Players Guide to the LMS / p8 | 0.4252 | Excluded | Excluded |
| 3 | LWR Pickleball Club DUPR Captains Guide / p7 | 0.4182 | Selected | Selected |
| 4 | LWRPC-Players Guide to the LMS / p13 | 0.4169 | Selected | Excluded |
| 5 | LWR Pickleball Club DUPR League Rules / p5 / 5 | 0.4117 | Selected | Excluded |
| 6 | LWRPC-Players Guide to the LMS / p9 | 0.3801 | Excluded | Excluded |
| 7 | LWR Pickleball Club DUPR League Rules / p6 / 5.13.3 | 0.3741 | Excluded | Excluded |
| 8 | LWR Pickleball Club DUPR League Rules / p12 / 6.3.1 | 0.3585 | Excluded | Excluded |
| 9 | LWR Pickleball Club DUPR League Rules / p4 / 5 | 0.3485 | Excluded | Excluded |
| 10 | LWR Pickleball Club DUPR League Rules / p9 / 6.2.1 | 0.3381 | Excluded | Excluded |
| 11 | LWR Pickleball Club DUPR League Rules / p7 / 6.1.1 | 0.3319 | Excluded | Excluded |
| 12 | LWRPC-Captains Guide to the LMS / p9 | 0.2802 | Excluded | Excluded |

Active versions observed: LMS Captains Guide `7ec16cf5-7b9d-4b3b-a847-8dd5767396c7`; Players Guide `939baf3b-f0b9-4c17-86be-68b85fd1b0de`; DUPR Captains Guide `5d1dd639-d77f-4ecc-8d56-14d7f70f491d`; League Rules `8d64618d-6078-4be2-9484-cf11395f1c21`. These were read, never changed.

The regression fixture `lwrpc-admin/test/fixtures/lms0713-roster-retrieval.json` contains the exact official passage text, chunk/version IDs and scores for the top-eight handoff and twelve-candidate review, with no credentials, signed URLs, member records, embeddings or raw conversation history.

### Selected and excluded evidence

- **DUPR Captains Guide page 7**, chunk `c524d6d2-34d8-41ed-8fd6-40cf4c5e0e09`: selected. Direct CREATE/UPDATE TEAM ROSTER requirements: active membership, DUPR ID, joining the club's DUPR club for rating sync, and division eligibility. It supports documented checks and conditional substitute requirements, not a finding about a live player.
- **LMS Captains Guide page 8**, chunk `61269c81-f09f-44af-adbd-3da3065e22a7`: selected. Direct Captain Tools → Manage Roster procedure for adding, changing and removing players. It does not establish why a dropdown omits a player.
- **Players Guide page 13**, chunk `7d12396b-f172-4180-af01-56a80fbf52ce`: previously selected; now excluded before generation and citation resolution. Viewing Upcoming Matches and buttons for viewing rosters do not explain Manage Roster eligibility. The defect reached both GPT input and trusted citations; it was not merely a display issue.
- **Players Guide pages 8 and 9**: viewing teams, schedules, results and play history are tangential. Excluded.
- **League Rules page 5**, chunk `7a1fb421-89d9-4ddd-b089-b6ec12b2c3c9`: previously selected; now excluded. Retroactive additions, match submission, forfeits and scoring eligibility do not explain present Manage Roster availability. General membership terms inside those different contexts are insufficient applicability.
- **League Rules pages 6, 7, 9 and 12**: rescheduled-lineup continuity or particular league scheduling/roster formats are not direct support for this generic missing-player question. Excluded.
- **League Rules page 4**: Match Setup and match roster exchange are a different workflow; also below .350 here. Excluded.
- **LMS Captains Guide page 9**, chunk `aaedf4ae-3936-4d8c-ae6c-23435bd27105`: relevant selection guidance, but rank 12 and .2802 in this replay. It was not promoted or sent to GPT; the threshold and ordinary top-eight handoff remain unchanged. No claim from that excluded passage is added to the answer.

## Bounded implementation

The old roster intent recognized `change` but missed `changing`; the generic fallback then retained a near-scoring upcoming-match passage on loose lexical contribution. The existing guard's bounded troubleshooting detector is now shared unchanged with Stage 4 through `aiRosterTroubleshooting.js`.

For that detected intent only, Stage 4 requires direct Manage Roster procedure, player eligibility/requirements or selection support within a passage. It excludes match-lineup/Match Setup, retroactive, scheduling and roster-format contexts and rejects evidence below the configured .350 threshold. The existing intent selector reserves the strongest applicable evidence and permits materially applicable procedural support. No document title, chunk ID, sentence answer or source citation is hardcoded in the selector. The four-evidence cap and governing hierarchy remain intact. If no applicable evidence survives, generation is skipped with normal insufficient evidence.

The existing answer prompt already prohibited assumptions, but did not explicitly distinguish documented prerequisites from a diagnosis of live player status. A conditional roster-troubleshooting instruction now explains that no player/account/roster has been inspected, requires supported checks, forbids converting prerequisites into unsupported probability/causation (“most likely”, “the reason is”, “this means” or equivalents), preserves conditional documented causes, forbids transferring Match Setup restrictions to Manage Roster, and permits escalation to League Management. It also explicitly forbids claiming missing DUPR or other-team membership necessarily hides a player. This instruction is absent for direct rule questions; the clear affirmative/negative rule-answer instruction remains unchanged.

The correction changes selected evidence and prompt grounding; it does not rewrite generated answers or hide citations in the UI. Model output remains probabilistic, so production acceptance checks the generated response as well as selection. No live-data service is implemented.

## Generated-answer replay

The configured model (`gpt-5.5-2026-04-23`) was called four times with only the selected official passages and each test question. The exact question used the fresh Stage 3 replay above. The three natural variants intentionally reused that same evidence snapshot to isolate Stage 4 selection/prompt behavior; these are **not four independent Stage 3 retrieval traces**. Active sources were revalidated. No feedback or database events were written, and model storage remained disabled.

All four selected only the two Captain Guide passages, returned no conflict, and avoided an unsupported live-cause diagnosis. Actual responses:

### `I'm changing my roster but I can't find a player in the list, why?`

The documentation doesn’t state a single reason why a player may be missing from the Manage Roster list, but it does list roster requirements to check:

- The player must be an active Lakewood Ranch Pickleball Club member before playing.
- DUPR League players must have a free DUPR ID.
- Players must join the Lakewood Ranch Pickleball Club DUPR club so ratings can sync.
- A captain may add players only if the player is a current, valid LWR PC member, has a DUPR ID, and is eligible for that division.
- Substitutes on your roster should not already be on another team.

Use Captain Dashboard → Captain Tools → Manage Roster to add, change, or remove players. If those documented checks do not resolve why the player is not appearing, contact League Management.

### `Why can't I find a player when changing my roster?`

I can’t see your live LMS roster, so I can’t identify the exact reason a specific player is not appearing. Documented checks for roster availability are:

- Use Captain Dashboard → Captain Tools → Manage Roster to add, change, or remove players.
- The player must be an active Lakewood Ranch Pickleball Club member before playing.
- DUPR League players must have a free DUPR ID.
- Players must join the Lakewood Ranch Pickleball Club DUPR club so ratings can sync.
- Captains may add/delete players during the season if the player is a current, valid LWR PC member, has a DUPR ID, and is eligible for that division.
- Teams should roster players/substitutes who are not already on another team; substitutes from other teams in the same community may be used if they meet DUPR division rating requirements.

If those checks don’t resolve it, contact League Management.

### `Why won't a player show up when I try to add them?`

I can’t tell the exact reason without inspecting the player/account/roster, but the documented checks are:

- Use Captain Dashboard → Captain Tools → Manage Roster to add players.
- The player must be an active Lakewood Ranch Pickleball Club member before playing.
- DUPR League players must have a free DUPR ID.
- Players must join the Lakewood Ranch Pickleball Club DUPR club so ratings can sync.
- Captains may add players if the player is a current, valid LWR PC member, has a DUPR ID, and is eligible for that division.
- Rosters/substitutes should account for players who are not already on another team; substitutes from other teams in the same community may be used if they meet DUPR division rating requirements.

If those documented checks look correct and the player still does not appear, contact League Management.

### `What should I check if a player isn't available to add to my roster?`

Check these documented roster requirements:

- The player is an active Lakewood Ranch Pickleball Club member.
- For DUPR League, the player has a free DUPR ID.
- The player has joined the Lakewood Ranch Pickleball Club DUPR club so ratings can sync.
- The player is eligible for that division.
- If you are trying to roster substitutes, they are not already on another team, unless using the documented option for additional substitutes from other teams in the same community who meet the DUPR division rating requirements.

Use Captain Dashboard → Captain Tools → Manage Roster to add, change, or remove players. If those checks do not resolve it, contact League Management.

## Version and files changed

- `lwrpc-admin/app/lib/version.js`: `LMS-0712` → **`LMS-0713`**. Existing shared UI/version consumers and new feedback snapshots use this value.
- `lwrpc-admin/package.json`: `0.1.534` → `0.1.535`.
- `lwrpc-admin/package-lock.json`: root and root-package version synchronized to `0.1.535`; no dependency change.
- `lwrpc-admin/app/lib/aiRosterTroubleshooting.js`: shared unchanged question detector and bounded evidence applicability helper.
- `lwrpc-admin/app/lib/askLwrPlayerAnswer.js`: imports the same detector instead of defining it locally; guard semantics are unchanged.
- `lwrpc-admin/app/lib/aiAnswerGeneration.js`: roster-only evidence intent and confidence/causation prompt.
- `lwrpc-admin/test/aiRosterTroubleshooting.test.mjs`: six new tests covering four variants, evidence reaching GPT/citations, empty/below-threshold selection and direct-rule prompt isolation.
- `lwrpc-admin/test/fixtures/lms0713-roster-retrieval.json`: read-only official-corpus regression snapshot.
- `docs/project-roadmap.md`: current version, reported production passes and pending future work.
- `docs/lms-0713-implementation-report.md`: this report. Historical LMS-0712 documentation remains historical.

## Regression and validation

Full `npm test`: **172 passed, zero failed**, including all 166 prior tests. Existing regressions retain personal rating/status/opponent/roster protection, ordinary official-rule eligibility, valid and invalid kitchen contexts, 11.A/11.A.2 selection, color → Ball → 3.C.3, legal and damaged balls, selected LWR match equipment, feedback eligibility, mobile layout and conversation semantics. New tests inspect the actual model request and trusted sources to exclude tangential evidence; they do not pretend a mocked answer proves live model behavior. The four real model replays above supply the separate generated-answer observation.

Additional required validation results are recorded in the final validation section below.

## Deployment instructions

After review approval, deploy the reviewed LMS-0713 application revision through the established deployment workflow. Verify the visible application version is LMS-0713. No SQL/migration, environment change, reprocessing, re-embedding or corpus activation is required. Do not use the ignored isolated build directory as the source revision. Nothing has been deployed by this task.

## Exact final production acceptance sequence

1. Confirm LMS-0713 in the deployed UI. In fresh conversations, submit the four roster troubleshooting questions printed above. Each must enter document RAG, explain only selected documented checks, avoid an actual cause/probability claim, and cite only materially useful evidence. Inspect manager selection diagnostics: no upcoming-match/viewing/history passage may reach generation or citations. Scores may vary with page context; do not require identical numerical replay scores. Escalation to League Management is appropriate if the checks do not resolve the issue.
2. Separately ask `Who is on my roster?`, `Who is on my team?`, `Show me my roster.`, and `Is John Smith on my roster?`. Require `protected`, no Stage 3/4, no sources and no feedback.
3. Ask `What is my DUPR?`, `Did I already submit my lineup?`, and `Who am I playing Friday?`. Require the same protected behavior and unchanged visible fallback.
4. Ask `What does NR mean?` and `How is Season DUPR determined?`. Require grounded LWR answers with sources. NR must preserve the League's below-29 Reliability Factor rule.
5. Ask `Can I volley in the kitchen?` → direct No and 11.A; immediately ask `What if I step in the kitchen after I hit it?` → valid inherited context, 11.A.2 / page 30 and the supported momentum answer.
6. Ask `what kind of ball are we using` → Franklin Outdoor X-40 Optic from the active LWR DUPR Captains Guide page 10.
7. In a fresh sequence ask `Are there any color considerations?` → `Ball.` → USAP 3.C.3. Separately ask `What are the USA Pickleball requirements for a legal ball?` and `What happens if the ball is damaged during play?`; retain applicable official sources.
8. Check the established phone full-screen panel and desktop drawer without redesign; verify feedback appears only on eligible grounded answers.
9. On ONE new grounded LMS-0713 answer, click Helpful; wait for success; click Helpful again; wait; change to Not Helpful; wait; click Not Helpful again. Expect exactly two append-only events: Helpful then Not Helpful. Repeat-state clicks must create no event (the UI may suppress a redundant request).

### Safe feedback-event verification using existing tools

No manager feedback-reporting UI exists yet. Use the existing authorized Supabase Table Editor for `ai_answer_feedback_events`, or the established trusted server read-only query workflow. The existing feedback response returns `feedbackId`, `changed`, and `helpful`; use the successful first event ID to locate that row, then filter by its `answer_id` AND `auth_user_id`. Inspect only `id`, `answer_id`, `helpful`, `created_at`, `assistant_version`; sort oldest first. For the fresh answer there must be exactly two rows, true then false, both LMS-0713. The second/fourth click must not add rows; if a request is sent, it returns `changed: false`. Do not copy receipt tokens or unrelated member/answer records into reports. This procedure requires no schema or reporting-dashboard change and is still pending production execution.

## Explicit boundaries and future roadmap

No SQL, feedback schema, corpus, active documents, embeddings, metadata, PDF processing or activation changes. The active 666-chunk USAP version is untouched. Stage 3 weights, .350 gate, top-eight handoff, twelve-candidate authority review, four-evidence model cap, hierarchy, LMS-0711 equipment probe, protected fallback, conversation receipts and mobile layout are unchanged.

Stage 7 remains paused. Future documentation retains Helpful/Not Helpful management reporting, automatic insufficient-evidence/no-source capture and review, recurring unanswered question identification, rule/guide clarification workflow and statuses New / Reviewing / Rule or Guide Update Needed / Resolved / Dismissed.

Future live LMS intelligence/navigation remains separate: authorized personal/other-player ratings, team rosters/standings, next opponent/match, Friday lineup, and navigation to Match Setup/roster/standings must use existing roles and deterministic permission-aware server services. None is implemented in LMS-0713.


## Final validation results

- `npm test` from `lwrpc-admin`: 172/172 passed. An initial invocation from the repository root hit that unrelated package's “no test specified” script; the required app suite above passed.
- `npm run lint`: passed, zero errors and six existing warnings (captain-dashboard router hook dependency, two unused player-dashboard functions, three source-ID destructuring bindings in the player response mapping).
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed against both main build output and the isolated completed build.
- Normal `npm run build`: compiled successfully in 16.4 seconds, then failed only while writing `.next/cache/.tsbuildinfo` with the known EPERM lock.
- Authorized isolated clean production build at `.next/lms0713-clean-build`: passed compilation (21.1 seconds), TypeScript, all 70 static pages and final optimization. The temporary copy excludes `.env` files, uses existing dependencies and inherited environment, and changes only its temporary tracing root to the repository. No repository build configuration was altered.
- `git diff --check`: passed.

No deployment performed. Final roster production acceptance and the exactly-two-event feedback test remain pending. Stage 7 remains paused.
