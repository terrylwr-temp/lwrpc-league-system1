# LMS-0725 — Ask LWR intent, applicability and clarification quality

**Diagnosis/design complete; STOP FOR REVIEW. September 8, 2026.** Proposed implementation: LMS-0725 / 0.1.547, only after approval. Accepted production baseline remains LMS-0724 / 0.1.546. This pass changes documentation and a reproducible offline diagnostic harness only. No application changes, SQL execution or new SQL, production mutations, deployments, Approved Answers, corpus edits, or version changes.

## Findings and evidence limits

The owner’s two roster failures reproduce in the current deterministic routing code. The scoring selector can accept Rally mechanics as direct evidence for a league applicability question. Rating clarification is serial because the executor returns before discovering seasons when rating type is unspecified; the client then displays the raw selection rather than the resolved question. These are separate defects that need one shared interpretation contract and a bounded clarification protocol.

Evidence collected:

- [Active official evidence snapshot](lms-0725-official-evidence.json): read at **2026-09-08 11:29 UTC**, with adjacent passages subsequently included. Supabase REST GET only against official document tables; no RPC or SQL. Seven active document identities; relevant searchable chunks from current Rules, Important Dates and Guides. Contains source IDs, version IDs, pages, ordinals and original extracted text. These are corpus excerpts, not fresh visual PDF verification or retrieval ranks.
- [63-question benchmark and baseline](lms-0725-benchmark.json): exact owner questions, required controls, natural paraphrases, typo cases and privacy controls. **45/63 local route expectations match; 18/63 mismatch.** This is route agreement, not answer accuracy. A question reaching the document route may still fail interpretation, retrieval or grounding.
- [Reproducible offline baseline](lms-0725-baseline.mjs): run `node docs/lms-0725-baseline.mjs` from the repository root. Imports current classifiers/selectors without calling an API, database or model. Two evidence probes use actual source text with an explicitly artificial score of 0.8 above the existing 0.35 threshold. They do not reproduce Stage 3 ranking.

No production question was replayed: Ask LWR requests can write diagnostics/audit/telemetry, which would conflict with this pass’s no-production-change constraint. Consequently, actual Stage 3 scores/order, the original model request/response, and current end-to-end latency are **not observed**. Owner-reported outputs are identified as such below. Full instrumented replay belongs to approved implementation verification. No genuine source gap was found for the requested roster-opening or scoring-applicability facts.

## 1. Roster and entering-player root causes

[`liveLmsIntent.js`](../lwrpc-admin/app/lib/liveLmsIntent.js) uses personal entity references plus nouns to dispatch supported lookups. Its TEAM_ROSTER branch excludes a small list (`how`, `rule`, `maximum`, `limit`, `add`, `update`) but has no general action/modal/date representation. `needsLive` in [`liveLmsService.js`](../lwrpc-admin/app/lib/liveLmsService.js) runs before the document resolver in both ordinary Ask LWR and View As.

| Question | Observed local interpretation/dispatch | Consequence |
|---|---|---|
| What date can I start entering my roster for weekday league | SELF + roster → TEAM_ROSTER; league not carried as policy scope | Live team lookup; document Stage 3 never reached |
| when can I start entering my players for my team | SELF via “my team”; no supported capability; personal fallback → UNSUPPORTED | Protected result; no retrieval or lookup needed |
| How many players are currently on my roster? | “how” excludes TEAM_ROSTER; personal fallback → UNSUPPORTED | Genuine supported state intent is blocked |
| Who is on the Artisan Lakes roster? | Named-team syntax is not recognized; no personal match | Falls toward documents; must instead authorize a named-team lookup |
| How do I enter players on my roster? | Narrow Live procedural exemption misses this construction | UNSUPPORTED before the document how-to exemption |
| When is my Season DUPR established? | SELF + rating → SELF_RATING | Same architectural defect outside rosters |

The second exact question also fails the **document guard if forced past Live**. [`askLwrPlayerAnswer.js`](../lwrpc-admin/app/lib/askLwrPlayerAnswer.js) recognizes some roster operations, but its player-entry exemption lacks a generic entering/building/filling representation. Fixing only the first routing branch would leave a second blocker. Current Live normalization also bypasses the shared contextual typo interpreter. A typo that happens to avoid Live is not successful interpretation.

Commissioner visibility is not an authorization defect. Many authorized team choices are legitimate for genuine roster-state questions. Policy/date questions should never enumerate those teams to establish a league-wide date. Preserve existing Commissioner permissions and do not redefine “my” merely to hide the symptom.

## 2. Trace by failing family

| Stage | Roster opening, exact first question | Entering players, exact second question | Weekday Rally applicability | DUPR → type → season → 1 |
|---|---|---|---|---|
| Interpretation | Raw personal roster match; action/date unrepresented | “my team” becomes SELF; “entering players” lacks shared concept | `kind=scoring`, `phase=rally`; no applicability axis | SELF_RATING with rating=clarify; followups depend on Live receipt |
| Intent and scope | TEAM_ROSTER; Weekday remains text only | UNSUPPORTED; no league stated | Weekday detected; division unset | Personal rating, then type and selected authorized season |
| Route | Live | Live protected | Official document | Live |
| Stage 3 | Not reached | Not reached | Original rankings unavailable; active mechanics and default/exception chunks independently inspected | Not reached |
| Applicability | Policy not evaluated | Policy not evaluated; latent document guard also blocks | General mechanics accepted despite requested league; default is not mandatory | Database authorization governs subject/context; this is not document applicability |
| Selection | No official evidence | No official evidence | Offline mechanics-only probe selects one chunk as “Direct scoring proposition with trusted object and scope” | Choices from protected executor; receipt retains IDs, not a semantic display question |
| Model evidence | None; model/embedding zero | None; model/embedding zero | Exact original payload unavailable. Selector probe demonstrates mechanics can enter selection without Rule 5.3. Nonempty scoring selection can skip concept assistance | None; model/embedding zero |
| Final classification | Owner reports no_team, rendered as Live answer; actual current DB result not replayed | Owner reports protected UNSUPPORTED; code agrees | Owner reports incorrect Yes grounded in mechanics; offline probe does not execute generation | Owner reports final QUESTION: 1; client stores raw submitted input |
| Clarification state | Would ask authorized team if multiple, or no_team; wrong policy dependency | No useful policy clarification | No missing applicability obligation triggers clarification/repair | First type, then numbered season; raw numeral survives in card heading |

Relevant selection code: [`aiOfficialApplicability.js`](../lwrpc-admin/app/lib/aiOfficialApplicability.js), [`aiQuestionConcepts.js`](../lwrpc-admin/app/lib/aiQuestionConcepts.js), [`aiAnswerGeneration.js`](../lwrpc-admin/app/lib/aiAnswerGeneration.js), [`aiRetrieval.js`](../lwrpc-admin/app/lib/aiRetrieval.js). `selectAnswerEvidenceWithAssistance` accepts nonempty scoring selection without requiring the governing default and exception set. Prompt instructions already ask for material qualifications, but cannot restore evidence never selected.

## 3. Proposed shared deterministic intent contract

Represent a question as **request kind + action + object + temporal/modal intent + scope**, with raw text retained separately and confidence/ambiguity recorded. This is an interpretation design, not a date or answer lookup table.

| Axis | Examples |
|---|---|
| Request kind | entity_state, action_policy, policy_date, procedure, scoring_applicability, scoring_mechanics, unresolved |
| Action | view/count, add/enter, remove/update, establish/record, submit/save |
| Object | team membership/roster, match lineup, rating value/rating establishment, match scores |
| Temporal/modal | current fact, opening/closing/start, permission (“may/can…yet”), instruction, completed action |
| Scope | explicitly named league, division, format, game, season; authenticated semantic continuation if valid |

Use bounded token/morphological recognition within the existing interpretation architecture: entering/entered/enter and adding/add share actions; players/team players in an entry-to-team construction map to roster membership. Build/fill/start modify that object. Words alone do not determine routing: “Who did I add?” is completed state; “How many currently?” is a count; “How do I add?” is procedure. “Can you show my roster?” is a request wrapper, not permission policy.

Order: authenticate as currently required → reject protected field/bulk/mixed personal requests → validate any immediate continuation → interpret supported intent → choose Live or document path → apply scope and evidence obligations. A clear public procedure may pass the privacy guard (e.g. password reset instructions), but arbitrary personal data, tokens, unsupported eligibility and mixed state/policy must not escape to RAG under a “how” or “when” wrapper. Preserve fail-closed unsupported handling; do not merely return null for every unmatched personal phrase.

Apply one shared descriptor in both Live dispatch and the legacy document operational guard; do not add a second divergent exemption list. Keep names, numeric ratings, dates, rule numbers and identifiers unchanged by typo normalization. Accepted bounded typo corrections must feed routing, concept search and scope consistently; uncertain object meaning produces clarification. No model classifies protected requests.

Roster list and roster count remain TEAM_ROSTER projections with server authorization; count must be a total authorized roster count, not the length of a 25-player page. Named-team syntax must resolve via the existing protected team resolver. Historical completion or mutation requests do not become new Live capabilities.

## 4. Current official roster evidence and scope

**Controlling date source:** *2026 Fall League Important Dates*, version `f811e60f-9af8-444f-b009-9594a530acd6`.

| League | Page / chunk | Current published opening |
|---|---|---|
| Weekday | p1, `c4ab8544-decb-4ea1-b856-2df4a2d196f1` | September 28, Monday — can start updating rosters |
| Saturday | p1, `f9f05921-2ee9-46fc-9b44-e5a861d7dd6f` | September 28, Monday — can start updating rosters |
| PrimeTime | p2, `950a54ab-aa3b-4f43-9c51-88ce0ca803ae` | September 28, Monday — can start updating rosters |

The year **2026** comes from the active document title/context. September 7 registration opening and September 27 rating recording are different events; October 4 registration deadline is not a roster-entry closing date. Never substitute these neighboring bullets or hardcode any date in application logic.

Material qualifications and procedures:

- *DUPR Captains Guide*, version `5d1dd639-d77f-4ecc-8d56-14d7f70f491d`, p5, chunk `1b88b1d6-cabd-4aab-ba26-cb0b34aeb1fa`: League Management activates teams/assigns Captains and notifies them when league rosters are unlocked. Cite this alongside the date when describing actual ability to begin; do not assert a particular team is already unlocked.
- Same guide p7, `c524d6d2-34d8-41ed-8fd6-40cf4c5e0e09`: Captains manage rosters; additions/deletions during the season depend on valid membership, DUPR ID and division eligibility. The opening is not a one-day-only window.
- *LWRPC-Captains Guide to the LMS*, version `7ec16cf5-7b9d-4b3b-a847-8dd5767396c7`, p8 `61269c81-f09f-44af-adbd-3da3065e22a7`, p9 `aaedf4ae-3936-4d8c-ae6c-23435bd27105`: Captain Tools → Manage Roster → Add Player, with eligibility handling. Use for procedures, not as the date authority.
- Active Rules p5, Rule 5.6: roster presence before play and qualified retroactive additions. Rule 5.5’s three-day Match Setup requirement is **match-lineup timing**, not the league roster opening.

Explicit Weekday/Saturday/PrimeTime must survive dispatch and remain a hard applicability scope. A public policy question does not require the requester to have a team. “My” does not infer league from the Commissioner’s broad population. A prior explicit league can be used only in a valid immediate semantic continuation; browser-supplied team/role IDs remain untrusted.

**Current equal-date behavior:** answer a generic roster-opening question with the shared date and applicable scope/qualification; no league clarification is necessary. Existing `plausibleRosterTimingLeagues` checks multiple plausible leagues rather than whether the requested facts differ. The offline current-source probe reproduces a needless three-league clarification. Compare event, season/year, date and material conditions before deciding equivalence. If future active dates/conditions differ, show “Which league do you mean?” with bounded choices. If the requested season is unclear or not covered, ask for season or report the source limitation; never apply 2026 dates indefinitely. “Can I add yet?” may compare the published opening with server current date in the club timezone, but cannot certify actual team unlock or personal eligibility.

## 5. Rally applicability and Rule 5.3

All following findings are from active *LWR Pickleball Club DUPR League Rules*, version **`5e8efa91-4f6c-47eb-9747-b122f0ebf656`**.

| Obligation | Governing evidence | Expected substance |
|---|---|---|
| General default | Rule 5.3, pp4–5; chunks `7a09f29b-f9ea-4bb0-99bb-08183b02f94f` + `80d9c2f5-8b5d-4009-b00c-04e116f84b5f` | Standard unless a specific game/match format expressly requires Rally |
| Ordinary Weekday | 6.1.3 p7, `f17bbdff-6a32-4861-b506-93694731d706` + 5.3 | Standard; format is one game to 15, win by 1 |
| Weekday 9.1 | Division heading 6.1.9 p8, `1dfe3d62-af28-4c5d-9b07-1e444511e643`; regular format 6.1.9.2; exception 6.1.9.7 `77cebfac-54ac-4199-8d6a-233c439a0a69` | Regular games Standard; only the Picklebreaker after a 2–2 tie uses Rally, to 15 win by 2 |
| Saturday regular games | 6.2.3.1 p9, `49b68f73-d7a5-435c-9c50-b98a59180774` | Express Rally, to 15 win by 1 |
| Saturday Picklebreaker | 6.2.3.5 pp9–10, preceding chunk + `66a8e74d-bfa1-4ba3-a8e0-9f3824a315db` | Only after 12–12 tie; Rally to 25 win by 2 |
| PrimeTime | 6.3.3 p12 `1b949abe-51d8-4f35-80fb-f1481722d1c6`; 6.3.6 pp12–13 `4193818c-5dcb-4ee6-9f03-249f18d5d38c` + `413ec35d-6bf2-4f72-a753-f20b2246abb3` | Regular games Standard; after 2–2 tie, Picklebreaker Rally to 15 win by 2 |
| Rally mechanics | pp15, `dd088f2f-6f6d-4deb-b4d9-66369e51f29b` + `e0d311b0-18b3-46b1-8f23-008dbe41e569` | Winning point must be on serve; preserve freeze/unfreeze rules in win-by-two play |

Rule 5.3 and some exceptions span chunks/pages. Join logical provisions with immutable version/ordinal provenance before evaluating meaning. Rule numbers are legal hierarchy, not rating numbers: Weekday division 9.1 is nested under Rule **6.1.9**. The flattened comparison table on p13 is not needed to infer column applicability; prefer the explicit numbered provisions. Mechanics chunks retain an inherited “DUPR LEAGUE MANAGERS” heading, which is not league applicability.

Design evidence roles: **default**, **express applicability**, **conditional exception**, **mechanics**, **qualification**. For applicability, require governing default plus scoped express provisions and material exceptions. A mechanics passage alone never establishes applicability. For a broad Weekday question, do not discard the 9.1 exception simply because the question has no division; preserve it as a conditional narrower exception without promoting it to the whole league. For an explicitly different division, exclude 9.1. Preserve league → division → match format → game throughout selection and generation.

Do not select only a positive-looking keyword. Require a complete evidence obligation before accepting a nonempty selection. Bounded same-version structural retrieval must cover the default and relevant descendants/continuations, not just ancestors of whichever mechanics chunk ranked first. Use existing thresholds and authority ordering; no global threshold lowering or corpus edit. Pack logical provisions within the existing evidence budget while retaining all underlying citations. If the complete bundle cannot fit or contains a genuine conflict, return insufficient/conflicting evidence rather than omit a qualification.

For “How does Rally work?”, select mechanics and the full winning-point/freeze qualification. For “How does it work in a Picklebreaker?”, additionally use the format/rotation scope; do not choose 15 or 25 without league scope. A generic explanation may state both conditional formats or ask a bounded league question when a precise score is requested. Cross-league comparison questions may cite multiple leagues only with separately labeled scopes; this is not permission for cross-league leakage.

## 6. DUPR clarification and presentation design

The protected executor’s rating branch currently returns `rating_clarification` before building season choices. After type selection, it may return `ambiguous` seasons. `runLive` turns choices into numbered answer text and stores subject/team/season IDs in an encrypted receipt. The client stores `question: nextQuestion` and does not replace it with a server-resolved display question. These explain both serial turns and QUESTION: 1. `liveMessage` supplies the generic missing/authorized-context wording.

Proposed response contract (design, not code): `clarification {kind, prompt, options[{opaqueKey,label}], hasMore}`, `conversationReceipt`, `resolvedQuestion`, plus current result classification. A rating option resolves a **rating type + applicable authorized season** tuple. Determine these together at the protected boundary when practical, using the same authorization rules as the final lookup. Do not query every combination’s rating value to build labels. Do not hide an otherwise authorized context merely because its rating is missing. If subject identity is ambiguous, resolve that first; a combined choice is not justification to expose unidentified people.

Use self-contained labels such as “Season DUPR — 2026 Fall Season” or “PrimeTime Season DUPR — [actual season name]”. These are label examples, not a claim about the signed-in user’s available seasons. Do not infer rating type from a season’s name or create a Cartesian product of unsupported contexts. Preserve the existing authority definition; no narrowing Commissioner visibility and no broadening Player/View-As visibility.

The browser submits an opaque option key with the short-lived receipt, never authoritative IDs or role claims. Server resolves the key only from that receipt, then reauthenticates, reauthorizes and refetches current data. Bind receipts to actor/session and, in View As, effective target/context/mode. Keep existing expiry/purpose checks. Handle expired, tampered, wrong-user, wrong-target and revoked-context choices without disclosure. An old receipt is never an authorization grant. Reject stale UI generations and superseded selection responses; typed numbers/labels work only against a valid current menu. Do not interpret an isolated “1” as a new lookup. Pagination needs an accessible More button and bounded opaque cursor; typed “next page” remains supported.

Use native buttons, visible focus, meaningful labels, keyboard Enter/Space, a labeled choice group, live status announcements, disabled duplicate submission and mobile wrapping. Announce the next prompt/result and restore sensible focus. Do not require color, hover or typing a number. Share the renderer/protocol between ordinary Ask LWR and View As while retaining their separate security transports.

On completion display the server-resolved meaning, e.g. **“What's my Season DUPR for the 2026 Fall Season?”** Keep raw selection separate in memory; do not add protected raw text, names, option labels or rating values to privacy telemetry or persistent history. A document league choice similarly displays the resolved policy question.

| Status | Proposed player language |
|---|---|
| Self Season rating missing | You don't currently have a Season DUPR recorded for [season]. |
| Self PrimeTime rating missing | You don't currently have a PrimeTime Season DUPR recorded for [season]. |
| Authorized named player rating missing | [Player] doesn't currently have a [rating type] recorded for [season]. |
| Ambiguous season/team/league | Which season/team/league do you mean? |
| Current official DUPR | Current official DUPR is not currently available through this Live LMS lookup. |
| No active season | No active season is available for this lookup. |
| Authorization denial | Retain an access-denial message; never recast it as missing data. |

Keep distinct no-team, no-match, empty-roster, missing-contact and technical-error messages; do not invent a name/context if it was not authorized. No official/current DUPR substitution with Season DUPR. No Live model/embedding calls for wording.

New Question clears pending menu, receipt, selected rating type/season, selected team/league, subject/referents, history and in-flight generation. The ordinary conversation state already has generation/reset protections; extend them to the new fields. View As currently lacks an equivalent New Question control: add local conversation reset without ending the View-As session. Exit, expiry, target switch and identity switch must purge everything. Preserve View-As target-effective lookup, context locking, diagnostic-only behavior and absence of feedback receipts/buttons; Commissioner authority must not broaden target choices.

## 7. Benchmark and security acceptance plan

The JSON contains stable question IDs and measured baseline dispatch. Required scoring answer assertions are in the evidence matrix above. Route agreement alone is insufficient: every document case must be scored for intended concept/scope, Stage 3 recall, selection completeness, final support and cited provenance.

| Cases | Additional acceptance assertions |
|---|---|
| Q01–Q06 | Live roster list/count/named-team; existing population authorization; total count across pages; no model/embedding |
| Q07–Q23 | Roster policy/date; preserve explicit league; active date source + unlock qualification; current equal dates avoid league menu; typo handling must actually preserve concept/scope |
| Q24 | Match-lineup entry policy, not roster opening; retrieve Rule 5.5 |
| Q25–Q29 | Official procedure, no mutation; correct roster vs score-entry guide |
| Q30–Q44 | Applicability obligations in scoring matrix; Weekday 9.1 exception conditional; Saturday independently affirmative; PrimeTime exception conditional |
| Q45–Q49 | Mechanics and freeze/serve-to-win qualifications; Q48 needs scoring-context clarification if absent; Q49 needs valid contextual followup or full-question clarification |
| Q50–Q53 | Rating lookup; Q50 combined bounded menu when feasible; Q53 protected unsupported official DUPR, no fallback substitution |
| Q54–Q57 | Rating policy/date in documents, including possessive “my” wording |
| Q58–Q63 | Privacy/mixed/unsupported state remains protected; no document/model leakage |

Run these stateful scenarios as a separate acceptance matrix:

1. Player: one/multiple/no eligible rating contexts; missing Season and missing PrimeTime values; one/multiple/no teams; count spanning pages.
2. Captain and Commissioner: retain exact existing authorized populations; no team menu for roster policy. Unauthorized named-team query returns no private detail.
3. Combined menu: every offered tuple selectable; typed number, exact label, button and More equivalent; invalid/out-of-range selection; subject ambiguity before rating menu. Missing value is not denial.
4. Followup: expire receipt, revoke membership/role, deactivate season, change team, sign out/in, change session, tamper option/receipt, reuse a different user's receipt; reauthorization/refetch on every selection. No stale response resurrects context after New Question.
5. View As Player: compare choices and answers with target-effective authorized fixtures, never actor population; target change/expiry/Exit invalidates menu; no feedback or persisted protected interaction.
6. Current equal-date source fixture, future deliberately differing date/condition fixture, missing season, conflicting or incomplete source fixture. No hardcoded 2026 date and no unnecessary team lookup.
7. Scoring evidence mutation fixtures: mechanics only, default only with incomplete exception coverage, wrong league, wrong division, omitted second half of 5.3, omitted 2–2/12–12 condition, split freeze continuation, ambiguous flattened table, expired source. Reject unsupported answers and preserve all material qualifications.
8. Keyboard/screen reader/mobile: focus order, announcements, long labels, paging, error retry and New Question in both interfaces. Keep document citation/viewer and normal feedback regressions covered.

Implementation gates: **Cross-League Leakage = 0; unsupported grounded answers = 0; material qualifications omitted = 0; mechanics-as-applicability errors = 0; required-control Live-policy misrouting = 0; Live answer-model calls = 0; Live embedding calls = 0.** These are required targets, not achievements of this diagnosis. Record every failure, not only aggregate percentages. For each replay retain authorized, privacy-safe stage classifications, scope, source IDs/ranks, selected obligations and reason codes. Protected data must not enter model evidence or diagnostic question storage.

## 8. Performance

Measured existing `liveIntent` only, Node local process: 100 warmup batches and 1,000 timed batches of 63 questions. Median per-question batch mean **0.00323 ms**; p95 per-question batch mean **0.00485 ms**. These are CPU microbenchmark values, not individual-request p95, database latency or production timings. Module-import startup is excluded; Node emitted the existing module-type warning. No package change is proposed for this diagnosis.

**Added overhead is not measurable until implementation exists.** Proposed acceptance budget: new deterministic routing/interpretation adds no network/provider call and targets <1 ms p95 incremental CPU on the same fixed workload. Measure warm and cold separately; compare before/after distributions and report actual results, not assumed compliance. Keep input/option/candidate bounds.

Combined rating discovery should require one protected discovery call, not one per type/season, reducing a feasible ambiguous flow from type + season selection to one selection. Capture auth, discovery/lookup, formatting and overall time separately. Reauthorization on selection is mandatory, even if caching would be faster. Retain the current Live lookup timeout; report slow-query regressions separately. No rating values should be prefetched just to label menus.

For documents, preserve current model/embedding bounds; use scoped same-version structural assistance only when evidence obligations remain incomplete. Do not rerun embeddings for UI wording. Measure Stage 3, structural completion, selection and generation independently on the benchmark. If completion exceeds the evidence budget, fail clearly rather than expanding retrieval without bounds. Full production latency measurements remain deferred.

## 9. Exact proposed implementation scope for review

1. Extend shared deterministic interpretation/concepts with state/policy/date/procedure and scoring mechanics/applicability axes; consistent safe typo handling; bounded semantic descriptors.
2. Consume that contract in Live dispatch and document operational guards; fix required named-roster/count controls without adding unsupported Live capabilities or mutations.
3. Preserve league/season/action scope through document resolution/retrieval; compare applicable date facts before league clarification; select Important Dates plus material qualifying guide/rule passages.
4. Add explicit scoring evidence obligations, same-version logical continuation/structural completion, scoped default/exception selection and generation support checks. No fixed source IDs, dates or answer strings in routing.
5. Extend protected rating context discovery to combine authorized type/season choices where feasible and return natural context labels; maintain exact role/population rules and server-only access. The existing executor discovers type before seasons, so a frontend-only change cannot fully meet this requirement. **Any database function changes need a separately prepared, reviewed migration during implementation; this document contains no SQL and grants no production execution approval.** Preserve LMS-0724 locking, RLS, grants and maintenance.
6. Extend encrypted receipts/results for opaque structured choices and resolved questions; reauthenticate/reauthorize/refetch all selections; privacy-safe telemetry remains allowlisted.
7. Shared accessible choice rendering and semantic question headings in ordinary Ask LWR and View As; capability-specific missing messages; complete New Question/reset semantics in both.
8. Add focused benchmark/stateful security/evidence/UX tests, local end-to-end replay and timing instrumentation. Read applicable local Next.js documentation before app edits. Run required `npm run lint` and `npm run build` plus relevant existing LMS-0722/0723/0724 suites after implementation.
9. Only after design approval, assign implementation version 0.1.547, prepare reviewable release artifacts and update roadmap. Production changes/deployment require their subsequent authorized release step.

Excluded: roster/rating writes, external official DUPR integration, new Live data capabilities beyond existing projections, role/population redesign, View-As lifecycle/maintenance redesign, broad refactors, RLS relaxation, Approved Answer patches, active PDF/corpus modification and threshold lowering. If implementation exposes a genuine official source gap/conflict, stop and report it separately.

**Review status:** ready for design review; implementation has not begun. Actual production Stage 3/model replay and added-overhead measurement remain explicit implementation-verification gates, not evidence claimed in this diagnosis.
