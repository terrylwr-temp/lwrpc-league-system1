# LMS-0712 — Stage 6 correction, mobile panel, and welcome screen

## Status

LMS-0712 is deployed but **not production accepted**. This correction is implemented locally and has **not been deployed**. Stage 7 remains paused. Keep the visible version at LMS-0712. No SQL/migration, feedback schema, corpus, metadata, stored embedding, document processing, activation, or deployment change is included.

## Production findings and correction

Production sequences Color → Ball/Paddle → kitchen/follow-up/match-ball repeated an unrelated color clarification. Diagnosis and the unchanged answer-model replay separated three causes:

1. `AskLwrAssistant.js` searched display history for the newest non-null receipt. An insufficient-evidence response's null was skipped, resurrecting the old pending clarification.
2. The resolver processed pending clarification before standalone completeness. New independent questions were rejected as subject fragments and the old color clarification repeated. The old question also replaced actual raw-question diagnostics.
3. Ball/color correctly retrieved active USAP 3.C.3 at .5191, but Stage 4 required framing terms (`there`, `any`, `considerations`) in the evidence sentence and rejected it. Paddle had no explicit general color evidence; its fallback was defensible.

### Authoritative context

`app/lib/askLwrConversationState.js` owns one browser-session context, separate from the newest-first eight-exchange display history. It persists `{ receipt: string | null }` under `lwr-ask-ai-current-context-v1`. Missing, malformed, or legacy state starts null; it never imports historical exchange receipts. Every successful server completion replaces current context with its returned receipt, including null. Submission captures and clears the current dependency immediately, so errors and remounts cannot reuse it. Request revisions prevent an older asynchronous completion from overwriting a newer request's context. A module singleton retains in-memory state if sessionStorage is unavailable.

### Resolver, consumption, and diagnostics

Order: raw personal/live guard → validate receipt → independent standalone check (excluding bounded noun fragments and contextual follow-ups) → consume valid color clarification subject → current missing-color-subject check → valid ordinary follow-up → generic full-question request for unresolved contextual/expired input → effective personal/live guard → unchanged Stage 3 → effective-question ambiguity check → Stage 4.

Ball, Paddle, and bounded multiword noun fragments such as `the outdoor ball` remain valid clarification answers. Their effective questions preserve the original color issue and supplied subject. `clarificationConsumed` is true for accepted clarification answers. They produce a normal follow-up receipt only for sufficient evidence; insufficient evidence produces null. A complete standalone question supersedes either pending clarification or normal follow-up context.

The actual current `rawQuestion` is retained separately from `effectiveQuestion`. Diagnostics now expose validated `priorContextPurpose`, `receiptValidation`, `clarificationConsumed`, classification, supersession, and both guards. Null effective guard means not evaluated after an early return. Non-color full-question prompts do not issue pending color receipts. Post-retrieval ambiguity inspects the effective question.

The manager answer route uses the same guarded resolver. Previously it calculated guard booleans for diagnostics but still retrieved/generated on protected input; it now short-circuits protected input as the player route does. Its existing diagnostic JSON displays the new fields.

### Bounded Stage 4 change

For an explicit color + recognized subject issue only, `issueTerms()` removes conversational framing (`there`, `any`, consideration/requirement/restriction variants). It retains color, the subject, and remaining qualifiers. Existing same-sentence operative evidence checks, score gates, hierarchy, and selection windows remain. There is no rule-number routing, hardcoded answer, broad ball-intent expansion, or additional resolver model call.

Negative controls retain rejection for paddle color, red-specific ball color, ball color at night, arbitrary ball pressure, and unrelated legal/damaged-ball selection. Paddle finish/marking provisions are not promoted into a general color answer.

## Mobile production finding

An actual phone showed a large wrapped header, clipped close button, partially covered composer, and dashboard overlap. The drawer was rendered beneath its trigger's ancestors; fixed positioning/z-index could remain trapped in their stacking/containing contexts.

The assistant now portals to `document.body`. The phone breakpoint remains the existing Tailwind `sm` boundary: below 640px, an opaque full-width/full-height panel owns scrolling above the dashboard. CSS uses 100dvh with VisualViewport height/offset updates for keyboard resize/pan. Body/root scroll is locked; mobile body position and scroll offset are restored on close. Portal siblings are temporarily inert, then restored. Existing Escape, Tab containment, focus entry and return behavior remain. Backdrop is outside the Tab sequence.

Mobile header uses 14px title, 11px subtitle, 28px icon container/17px sparkle, compact spacing, and a 44px close target inside safe-area padding. The composer has min-width:0, visible margins, and 16px input typography to avoid phone input zoom. Safe-area top/left/right/bottom are accounted for. The scroll container has contained overscroll and remains usable after keyboard closure. No Player Dashboard changes were made. At >=640px, the existing right drawer dimensions and desktop typography remain.

## Welcome screen

“How can I help?” remains. Introductory copy is exactly:

> Ask me about LWR Pickleball Club leagues, DUPR requirements, scoring, Match Setup, Captain procedures, league formats, and more. You also have access to the complete USA Pickleball Rulebook, so you can ask me about pickleball rules, faults, serving, the kitchen (NVZ), equipment, and other rules of play.

The four suggestions on all entry pages are:

- When does Match Setup need to be completed?
- What kind of ball are we using?
- Can I volley in the kitchen?
- What are the rules for a legal serve?

Suggestions wrap with at least 44px button height and use the same submit handler as manual entry. Page/module context still derives from the current path. No answer or retrieval change is driven by suggestion clicks.

## Validation

- Full `npm test`: **128 passed, 0 failed**, including existing LMS-0705–0711 regressions and 30 new correction tests.
- `npm run lint`: zero errors; six existing warnings (Captain Dashboard dependency, two Player Dashboard unused declarations, three player-result destructured source IDs).
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: application compiled successfully, then encountered the known EPERM writing `.next/cache/.tsbuildinfo`. This is recorded separately from application compilation/type errors.
- Clean isolated build: passed, including TypeScript, static generation, and route output. Used `.next/lms0712-clean-build` with the current source, linked existing node_modules, and a fresh build cache. Only the temporary copy's tracing root points back to the real repository so dependency tracing stays valid. No type-check bypass or tracked configuration change.
- `npm run verify:ai-pdf-server-bundle`: passed; also checked the isolated completed build.
- `git diff --check`: passed.

### Browser verification

`scripts/verify-ask-lwr-ui.mjs` bundles the actual component, actual Tailwind utilities, and actual panel CSS in an isolated fixture with a transformed header and high-z-index dashboard. Auth/navigation/guide dependencies and API responses are mocked; no production browser session or member data is involved. The optional `PLAYWRIGHT_MODULE_PATH` points to an available Playwright installation and `PLAYWRIGHT_CHANNEL=msedge` uses installed Edge. Output lives in ignored `.next/ask-ui-check`.

Passed at 390×844 and 320×568: panel equals viewport, 68px header, composer fully visible, close 44×44 and inside viewport, hit-testing selects assistant rather than dashboard, background inert, and assistant scrolling. Passed 1280×800 desktop: right drawer 640px wide with 18px title. Passed simulated VisualViewport shrink to 330px with usable composer and restoration after keyboard-close simulation. Also passed null-receipt close/remount, normal suggestion request, grounded feedback before sources, absent feedback for clarification/insufficient, Escape/focus restoration, and zero page errors. Screenshots were visually inspected. This is keyboard simulation, **not physical iOS/Android keyboard acceptance**.

### Authorized live-corpus/model check

Used the unchanged query embedding/retrieval services and configured answer model with only effective test questions and selected official passages. No member data or database writes. Active USAP source remained the existing 666-chunk version.

- Color → Ball: effective `Are there any color considerations for Ball?`; consumed clarification; selected USAP 3.C.3 page 13 at .5191. Generated: “Yes. The ball must be one uniform color, except for identification markings. Colors may vary.” Returned follow-up and feedback receipts.
- Then kitchen: `standalone_supersedes_context`; selected 11.A page 30 at .5620; grounded answer beginning “No.”
- Color → Paddle: correct effective question, consumed clarification, Stage 3/4 executed, no selected evidence, model skipped, insufficient fallback and null context.
- Then match-ball: fresh standalone, Captains Guide page 10 at .6458; generated Franklin Outdoor X-40 Optic answer with normal follow-up/feedback receipts.

## Deployment and exact acceptance sequence

Deploy the application correction through the normal approved deployment procedure **only after review**. No new SQL is required. Do not modify/reapply the existing LMS-0712 feedback migration as part of this correction. Leave documents, embeddings, metadata, processing and activation unchanged. Refresh the application bundle on test devices; do not treat existing display history as current context.

1. In a fresh session, ask `Can I volley in the kitchen?` → grounded No, 11.A. Then `What if I step in after I hit it?` → momentum, 11.A.2.
2. Fresh `what kind of ball are we using` → active LWR DUPR Captains Guide page 10, Franklin Outdoor X-40 Optic.
3. Fresh `What are the USA Pickleball requirements for a legal ball?` → USAP specification evidence. Fresh `What happens if the ball is damaged during play?` → USAP damaged-ball evidence, no selected-equipment probe.
4. `Are there any color considerations?` → clarification; `Ball` → 3.C.3 grounded answer and normal follow-up receipt; `Can I volley in the kitchen?` → independent 11.A; then kitchen momentum follow-up → 11.A.2.
5. Color question → `Paddle` → normal official lookup, legitimate insufficient fallback/null if evidence remains absent. Close/reopen drawer, then `what kind of ball are we using` → Captains Guide answer, no color clarification.
6. Color question → immediately ask kitchen without answering clarification → independent 11.A. Repeat color question → immediately ask match-ball → Captains Guide.
7. `When does Match Setup need to be completed?` → document answer; `Did I already submit mine?` → protected, zero retrieval/model calls. Repeat Match Setup → kitchen → independent kitchen answer.
8. With expired/malformed receipts in controlled diagnostics, all four fresh standalone controls above must work. Context-dependent fragments should fail safely without a color prompt.
9. On a grounded answer click Helpful, repeat Helpful, switch to Not Helpful, repeat Not Helpful. Confirm exactly two feedback events: Helpful then Not Helpful. This live database event test is pending; the correction does not write test votes.
10. On physical phone, verify welcome copy and all four suggestions; full opaque panel; compact header; unclipped close; usable composer with native keyboard open; scroll through grounded answers, feedback, sources, clarification, and older exchanges. Close keyboard and scroll to the bottom; close/reopen assistant; verify dashboard scroll/focus restoration. Repeat at desktop/tablet size to confirm right drawer.
11. Replay the established LMS-0705–0711 live acceptance cases, including authority, citation viewer, legal/damaged-ball distinction, and equipment probe behavior.

Do not mark production accepted until deployment and these live checks pass. Stage 7 remains paused.

## Files

- `app/components/AskLwrAssistant.js` and new `AskLwrAssistant.module.css`: context wiring and responsive portal.
- New `app/lib/askLwrConversationState.js`: authoritative session receipt lifecycle.
- `app/lib/aiConversation.js`: precedence, bounded fragments, ambiguity and diagnostics.
- `app/lib/askLwrPlayerAnswer.js`, `app/api/ai-assistant/answer/route.js`: shared guard and receipt integration.
- `app/lib/aiGoverningSources.js`: bounded color issue framing.
- `app/lib/askLwrAssistantConfig.js`: exact welcome copy and suggestions.
- New `test/aiStage6Correction.test.mjs`, updated `test/askLwrAssistant.test.mjs`, new `scripts/verify-ask-lwr-ui.mjs`: regression and browser verification.
- This report and `docs/project-roadmap.md`: status, findings, verification and acceptance instructions.


## Bounded personal/live-data guard correction — September 5, 2026

Status: implemented locally for review; this correction has not been deployed. LMS-0712 remains deployed but **not production accepted**. Stage 7 remains paused.

### Files and behavior

- `lwrpc-admin/app/lib/askLwrPlayerAnswer.js`: normalize apostrophes; detect owned rating/DUPR value requests using ownership, rating terminology, and value-seeking verbs/question framing. Explicit calculation/rule/range questions remain eligible. Evaluate completed submission/save/entry status before procedural exemptions. Detect first-person opponent/play requests and owned next opponent/match requests. Permit bounded player-availability roster troubleshooting through normal evidence-gated retrieval. Preserve existing personal-data patterns and protected response shape. Both raw and resolved effective questions are guarded.
- `lwrpc-admin/app/lib/aiConversation.js`: reuse the existing contextual-fragment detector when no usable follow-up exists, including absent receipts. Return the existing full-question clarification with no retrieval or generation. Valid follow-up composition and standalone precedence remain unchanged.
- `lwrpc-admin/app/lib/aiConversationDiagnostics.js`: whitelist request-local diagnostics; cap current/effective question lengths and selected IDs. No persistent logging or database writes.
- `lwrpc-admin/app/api/ai-assistant/answer/route.js`: expose diagnostics through the existing authenticated league-manager console Conversation resolution panel. Player response payload is unchanged.
- `lwrpc-admin/test/aiPersonalGuard.test.mjs`: all approved personal and official controls, protected stage skipping, roster troubleshooting eligibility, both kitchen receipt boundaries, diagnostic whitelist.
- `lwrpc-admin/test/aiStage6Correction.test.mjs`: extend the existing integrated answer/evidence selection test to both kitchen follow-up phrasings and Rule 11.A.2.
- This report and `docs/project-roadmap.md`: scope, limitations, validation and acceptance procedure.

Personal rating, submission status, schedule/opponent, and roster/team intents remain deterministic guard checks for future permission-aware routing; no live-data service is implemented. Protected results retain the existing insufficient-evidence wording but `kind: protected`, zero Stage 3/4 calls, no feedback/conversation receipt and no Official Sources.

Roster troubleshooting only gains access to the existing Stage 3/4 pipeline. No answer or missing-player cause is hardcoded. Normal evidence insufficiency remains possible. No new rule transfers Match Setup restrictions to Manage Roster. Production acceptance must inspect generated answers for unsupported claims about missing DUPR or another-team membership.

### Manager diagnostics and kitchen investigation

The existing manager answer response now includes actual raw current question, receipt-supplied boolean, validation outcome, validated prior purpose, classification, effective question, inherited-context boolean, raw/effective guard results, Stage 3 invocation boolean, selected chunk/rule IDs and final response kind. A raw protected request deliberately reports `not_checked_raw_guard`; its supplied receipt is not decrypted. False Stage 3 invocation means skipped. Selected IDs are empty on skipped paths.

These diagnostics are returned only for the current authorized manager request; they do not record production player history or recover the original failed player's receipt. Reproduce a future failure in the manager console and inspect its Conversation resolution panel immediately. Do not copy receipt tokens, signed URLs, credentials or unrelated member details into reports. No persistent production telemetry was added. The original production context-loss cause remains unproven.

Both kitchen follow-ups with valid receipts retain the existing 11.A.2 path. Missing, malformed and expired receipts now request the full question instead of treating an obvious fragment as standalone. The existing generic detector is reused; no kitchen-specific resolver or retrieval patch was introduced.

### Validation

- Full `npm test`: 166 passed, zero failed; deterministic fixtures, no live answer-model replay in this correction.
- `npm run lint`: zero errors, six existing warnings (captain-dashboard hook dependency, two player-dashboard unused functions, three omitted source-ID destructuring bindings).
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed against the main build output; isolated build verification recorded below.
- `npm run build`: compiled successfully, then failed only on the known `.next/cache/.tsbuildinfo` EPERM write lock. Authorized isolated clean build result recorded below.

No SQL, migration, corpus, active document, embedding, metadata, processing, activation, retrieval weights/limits/threshold, governing hierarchy, feedback schema, selected-match-equipment logic or UI changes. The active 666-chunk USAP version is untouched.

### Deployment and exact production acceptance

After review approval, deploy the reviewed application revision through the existing deployment workflow. No SQL, reprocessing, re-embedding, corpus activation or environment changes are required. Do not deploy the ignored isolated build directory as a source revision. Run these checks against that deployed revision before accepting LMS-0712; Stage 7 stays paused until separately authorized.

For every protected question below, expect the unchanged fallback, internal `protected`, Stage 3 skipped, no selected evidence, no feedback and no Official Sources:

- `What is my DUPR?`
- `What's my DUPR?`
- `What is my current DUPR?`
- `Do you know my DUPR?`
- `What's my rating?`
- `What is my player rating?`
- `Can you tell me my DUPR?`
- `Did I already submit my lineup?`
- `Did I already submit my match scores?`
- `Have I entered my scores yet?`
- `Who am I playing Friday?`
- `Who do we play Friday?`
- `Who is my next opponent?`
- `When is my next match?`
- `Where do I play next?`
- `Who is on my roster?`
- `Who is on my team?`
- `Is John Smith on my roster?`
- `Show me my roster.`

For every official question below, expect document-RAG eligibility (raw/effective guards false and Stage 3 invoked), followed by an evidence-supported answer or the normal insufficient-evidence result. Eligibility does not guarantee sufficient documentation:

- `What does NR mean?`
- `What is the DUPR Reliability Factor rule?`
- `How is Season DUPR determined?`
- `What DUPR is allowed in this division?`
- `What DUPR range can play in Weekday DUPR 7?`
- `How do I submit my lineup?`
- `When do I submit my lineup?`
- `How do I enter match scores?`
- `When does Match Setup need to be completed?`
- `What day does DUPR 9 normally play?`
- `Can captains change the scheduled DUPR 9 match time?`
- `What are the Saturday league dates?`
- `I'm changing my roster but I can't find a player in the list, why?`
- `Why can't I find a player when changing my roster?`
- `Why won't a player show up when I try to add them?`
- `What should I check if a player isn't available to add to my roster?`

Kitchen and conversation acceptance:

1. Ask `Can I volley in the kitchen?`, then `What if I step in after I hit it?`. Inspect a valid follow-up receipt outcome, inherited kitchen/volley context, Stage 3 invoked, Rule 11.A.2 selected and a supported momentum answer.
2. Start a fresh equivalent sequence, then ask `What if I step in the kitchen after I hit it?`; require the same result.
3. For each follow-up, use no receipt, an expired receipt and a malformed receipt in a controlled manager test. Expect full-question clarification, Stage 3 skipped, no feedback/sources and no renewed receipt. Do not retain or share token contents.
4. Repeat `Are there any color considerations?` → `Ball.` and → `Paddle.` in separate sequences, then a standalone `When does Match Setup need to be completed?`; standalone context must supersede prior context.
5. Repeat existing accepted LMS-0705–LMS-0712 controls, including official match-ball evidence, color evidence, feedback eligibility, newest-first exchanges, mobile full-screen panel and desktop drawer behavior. These are retained by existing automated coverage; live production acceptance remains required.

Final validation: the isolated clean build at `.next/lms0712-guard-clean-build` passed compilation, TypeScript, all 70 static pages and final optimization. Its PDF server-bundle verification also passed. The isolated copy uses the original installed dependencies and inherited environment without copying `.env` files; only its temporary tracing root points at the repository. Final `git diff --check` passed.
