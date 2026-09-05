# LMS-0717 / 0.1.539 — AI Quality Hardening

Implemented and validated locally on 2026-09-05. **Ready for review; not deployed or production accepted.** Production remains LMS-0716 / 0.1.538, Stage 7A complete and production accepted. Stages 1–6 remain accepted. Stage 7B manager reporting is reserved for **LMS-0718 / 0.1.540** and has not started. Live LMS Intelligence has not started.

This implements the owner-approved diagnosis in `lms-0717-ai-quality-hardening-diagnosis.md`. No production request, external answer-model replay, database mutation, corpus processing or deployment was performed in this implementation pass.

## 1. Exact files changed for LMS-0717

Paths below are relative to `C:\lwrpc-league-system`.

| File | Change |
| --- | --- |
| `lwrpc-admin/app/lib/aiQuestionApplicability.js` | New matcher-only operation normalization, league compatibility, coherent body passages, conservative generic applicability, independent question clauses and missing-object helpers. |
| `lwrpc-admin/app/lib/aiAnswerGeneration.js` | Direct applicability before rank, complete detected-issue coverage, roster/lineup/score/enforcement separation, bounded selected passages and manager diagnostics; generic instruction against inferring a policy from silence. |
| `lwrpc-admin/app/lib/aiGoverningSources.js` | League compatibility and complete per-issue coverage; trim LWR as well as USAP input to applicable passages; bounded manager diagnostics. |
| `lwrpc-admin/app/lib/aiConversation.js` | New `player_entry_object` clarification using the existing encrypted, user-bound receipt lifecycle. |
| `lwrpc-admin/app/lib/askLwrPlayerAnswer.js` | Issue the existing clarification receipt for that new category. Guards and player response shape unchanged. |
| `lwrpc-admin/app/components/AskLwrAssistant.js` | One exact approved disclaimer immediately above the composer. |
| `lwrpc-admin/app/ai-assistant/console/page.js` | Render manager-only issue, direct/supporting/excluded role, league compatibility and reason. |
| `lwrpc-admin/app/lib/version.js` | `LMS-0717`. |
| `lwrpc-admin/package.json` | `0.1.539`. |
| `lwrpc-admin/package-lock.json` | Root/package version `0.1.539`; no dependency changes. |
| `lwrpc-admin/test/aiQualityHardening.test.mjs` | 18 focused production-fixture, clarification, capture and UI tests. |
| `lwrpc-admin/test/fixtures/lms0717-production-evidence.json` | Sanitized existing diagnosis retrieval fixtures: broad official chunks, rankings and metadata for 15 questions. No embeddings, credentials, model output or member records. |
| `lwrpc-admin/test/aiAnswerGeneration.test.mjs` | Strengthen the shared model-transport fixture from placeholder “official rule evidence” to operative scoring-freeze evidence; retain its existing assertions and all tests. |
| `docs/project-roadmap.md` | Separate accepted production from local implementation, record quality correction and Stage 7B reservation. |
| `docs/stage-7-ai-feedback-review-design.md` | Current Stage 7B reservation and phase references updated; preserve historical Stage 7A details. |
| `docs/lms-0717-implementation-report.md` | This implementation and validation report. |

Pre-existing working-tree documentation was preserved: LMS-0716 implementation/acceptance additions, `lms-0716-reimbursement-diagnosis.md`, and the approved LMS-0717 diagnosis. These are earlier task history, not new LMS-0717 functionality. Ignored build artifacts are not deployment source.

## 2. Generic applicability and deterministic coverage

The leading LWR candidate no longer survives solely because it ranks first. Every retained candidate must contain an applicable operative body passage. Heading matches, rank, acronym boosts and authority cannot independently qualify evidence. Stage 3 scores, thresholds, terminology expansion, RPCs and candidate retrieval remain unchanged. Stage 4 can inspect the already bounded authority/intent review candidates, allowing relevant evidence below the old leading-score delta to qualify.

The matcher removes conversational framing and canonicalizes bounded concepts/morphology; it does not require every literal raw question word. Medical/retirement, conduct, coaching and NVZ paraphrases retain their accepted controls. Unrecognized substantive concepts are treated conservatively rather than expanded by a model or silently discarded. This is a deterministic applicability matcher, not a claim of universal natural-language entailment.

Explicit independent interrogatives are evaluated separately. Each detected issue must have direct evidence, including after the four-chunk cap; otherwise selection returns empty and the existing `insufficient_evidence` path skips source resolution/generation. Noun conjunctions remain together to preserve qualifiers. “When and how” retains its shared object. No generated-prose parsing determines whether evidence existed.

Named-document questions select the actual document/section scope and retain its operative wording, rather than incidental requirements elsewhere to sign or consult it. The generic generation instruction requires conclusions to stay within the selected scope and prevents treating a broad release as a separate policy/entitlement. It contains no reimbursement/sunglasses/lost-property answer or special response.

## 3. Direct and supporting evidence; governing hierarchy

One strongest direct passage is reserved per detected issue. Supporting candidates must themselves support that same issue and add requested procedure, controlling requirements or distinct applicable detail. Procedure support remains available alongside a direct governing rule. Duplicate generic bodies are removed. Unrequested score-entry and enforcement paragraphs are excluded from roster procedures; only applicable verbatim passages are sent to generation.

Authority operates after applicability. Directly applicable specific LWR rules control their issue; otherwise applicable USAP rules govern. Guides explain supported procedures without globally overriding playing rules. Existing equipment/NVZ/serve-specific applicability and override rules remain intact. The selected evidence budget remains four chunks.

Manager diagnostics report bounded issues, role, league compatibility and selection/exclusion reason. These are displayed only in Test AI Assistant; the player result contract is unchanged. Capture uses its existing bounded snapshots and does not acquire new diagnostic fields or semantics.

## 4. League, morphology and procedure boundaries

`weekend league` resolves to Saturday only in an LWR/club/team/roster league context, with explicit unrelated/other-event language excluded. An isolated “weekend” is not translated. The actual question and stored document remain unchanged; this is a Stage 4 compatibility signal, not a Stage 3 query rewrite. Explicit Saturday, Weekday and PrimeTime scopes reject mismatched named-league evidence; genuinely general/all-league rules remain eligible.

Adding/added, updating/updated, removing/removed and corresponding entry/change variants normalize only for matching. Roster intent still requires its object/context. Timing prefers compatible direct calendar evidence; a general how-to does not select a calendar-only paragraph. Removal instructions require removal language. Match Setup requires its actual timing/UI procedure, preventing the Picklebreaker “save that team for the finish” paragraph from acting as a lineup instruction. Completed score entry has its own intent.

The exact weekend production fixture selects Saturday Important Dates rank 8, `.4901`, and its verbatim September 28 roster-opening bullet. No date is hardcoded into application logic. General roster entry selects Manage Roster procedure rather than Rule 5.5. Explicit retroactive/ineligible-player questions retain the actual forfeiture provision.

## 5. Missing-object clarification

`When can I start adding players` now returns:

> Do you mean adding players to your team roster or entering players into a match lineup?

This happens before retrieval or generation, with no Official Sources or feedback receipt. Bounded “Team roster” and “Match lineup/Match Setup” replies consume the existing sealed clarification context and build the corresponding effective question. A complete standalone question supersedes pending context. Invalid, expired or other-user receipts cannot be consumed as clarification context. Complete Saturday-roster questions proceed directly. Stage 7A observes clarification metadata only, with no automatic unanswered occurrence/group/case.

## 6. Production-realistic regression results

These are local deterministic replays of captured broad official evidence, not new live production or live-model answers.

| Case | Verified result |
| --- | --- |
| Original long reimbursement policy question; lost-sunglasses and lost-personal-property variants | Empty selection, insufficient evidence, no source resolution/model call; also tested with artificially elevated fixture confidence to prove rank cannot create applicability. |
| Waiver personal-property wording and liability-release wording | Actual waiver scope/release passages retained; unrelated membership waiver prerequisite excluded; no invented reimbursement content. Live final prose remains a production acceptance check. |
| Exact weekend question; explicit Saturday equivalent | Only Saturday roster-opening bullet; no Match Setup or ENTER/VERIFY SCORES. |
| Weekday and PrimeTime equivalents | Only the corresponding league's roster-opening bullet. |
| All-league Match Setup rule with Saturday question | General Rule 5.4 remains eligible. |
| Roster morphology variants | Same compatible roster timing evidence; no context-free adding-to-roster inference. |
| General roster entry, including “enter” and “add” | Manage Roster guide; no calendar-only, retroactive/forfeit or Match Setup passage. |
| Retroactive additions and ineligible-player forfeiture | Actual Rule 5.5 enforcement retained. |
| Friday lineup | Actual lineup timing; no Picklebreaker/score-entry contamination. |
| Enter match scores | Actual score-entry procedure. |
| Accepted LMS-0705 roster + Friday lineup compound | Weekday Important Dates plus Rule 5.4, without score entry/enforcement. |
| Supported roster question + unsupported independent question | No partial grounded generation. |
| Missing-object clarification and both valid replies | No initial retrieval; correct receipt resolution and standalone supersession. |
| Corrected outcomes through player helper + Stage 7A snapshot builders | Answer/insufficient/clarification kinds preserved; only insufficient evidence produces an automatic occurrence. |
| Disclaimer and accepted mobile controls | Single exact text above composer; static responsive/accessibility contracts pass. |

All 209 pre-existing tests remain present and pass, including LMS-0705 compound; medical 5.7; coaching 5.8; Franklin Outdoor X-40 Optic; USAP 11.A/11.A.2/11.A.3 and 7.A.2/7.A.2.a; legal/damaged/color ball; Color→Ball/Paddle; personal/live guards; roster troubleshooting; receipts; four-click feedback; and Stage 7A Unicode/privacy/grouping/security/fail-open behavior. The new suite brings the total to **227 passing tests**.

## 7. Disclaimer and UI scope

The exact text appears once in the existing scroll flow immediately above the composer:

> Ask LWR PC AI may make mistakes. Check Official Sources for important information.

It uses centered 12px text, 16px line height, muted slate gray and natural wrapping. No banner, per-answer repetition, new focusable control or legal language. Existing phone viewport/safe-area/keyboard handling, opaque panel, desktop drawer, composer label and sources remain unchanged. Responsive/accessibility verification in this pass is static regression coverage; actual phone keyboard and visual acceptance are explicitly included below, not claimed as newly tested on hardware.

## 8. Validation

| Check | Result |
| --- | --- |
| `npm test` | PASS: 227 tests, zero failures. |
| `npm run lint` | PASS: zero errors, six existing warnings (captain dashboard hook dependency; three intentional stripped source IDs in player helper; two unused player dashboard helpers). |
| `npx tsc --noEmit --incremental false` | PASS. |
| `npm run verify:ai-pdf-server-bundle` | PASS; also passed against the fresh isolated production output. |
| `npm run build` | Normal compilation succeeded in 14.8s; then the established `.next/cache/.tsbuildinfo` EPERM write lock prevented the incremental type-check artifact. This is not a compilation failure. |
| Established isolated clean production build | PASS: compilation 26.9s, TypeScript 3.6s, 71/71 pages, final optimization. |
| `git diff --check` | PASS. |

The isolated build is under `lwrpc-admin/.next/lms0717-clean-build`, using copied application source, existing dependency junction and inherited local environment without copying `.env` files. Only the temporary tracing/bundler root is anchored to the repository. An initial build attempt placed its log inside `.next`, causing Next cleanup to hit that open log; the log was moved to the system temp directory before the normal compilation above. Neither filesystem issue is concealed as a successful normal build.

The unchanged Stage 3, Stage 7A capture/grouping/snapshot code, player route and Stage 7A SQL were additionally checked against Git. No SQL migration, schema, HMAC key/version, feedback route/schema, document, embedding, active corpus, USAP version or processing changes occurred. No production mutation/deployment occurred.

## 9. Exact deployment and production acceptance sequence — after review approval

1. Review the listed source/test/documentation diff and approve LMS-0717. Keep existing historical acceptance documents. Confirm application/package versions are LMS-0717 / 0.1.539 and dependencies are unchanged. Do not include ignored build/diagnostic artifacts.
2. Deploy the reviewed application revision through the established `lwrpc-admin` production pipeline using the normal application source root. This report does not authorize that deployment. **No migration, database setup, corpus processing, activation or environment/HMAC change is required.** Record the deployed revision and deployment ID; verify the displayed LMS-0717 version.
3. In manager Test AI Assistant, run the original long reimbursement question and both short variants. Require `insufficient_evidence`, no selected evidence and no answer-model call. Run the two explicit waiver questions; confirm selected waiver scope and final prose describe only the documented release/limits, with no invented policy.
4. Run weekend, Saturday, Weekday and PrimeTime roster timing. Require the compatible roster-opening passage and its current document date; reject unrelated league dates, Match Setup and score-entry sources. Run the all-league Match Setup control.
5. Run “How do I enter players on my roster”; require useful Manage Roster instructions without unrequested forfeiture. Run retroactive/ineligible-player controls and verify the actual enforcement provision is still available. Run Match Setup-only, score-entry-only and the accepted roster + Friday lineup compound; inspect bounded manager selection/exclusion diagnostics.
6. In player Ask LWR, run missing-object adding players. Require clarification, no sources/feedback, and no initial retrieval/generation. Resolve once to roster and once to Match Setup on separate exchanges. Verify complete standalone supersession and existing Color→Ball/Paddle behavior.
7. Confirm Stage 7A outcomes correlate with the corrected final kinds: grounded roster results get lightweight answer telemetry; unsupported policy results get automatic unanswered occurrence/group/case without a vote; repeated identical unsupported requests share a deterministic group/case; clarification remains metadata-only. Confirm manager_test separation. Read stored results without exposing member IDs, secrets or signed URLs; do not alter rows to force a pass.
8. Verify protected “What is my DUPR?” remains protected, not a missing-rule problem. Recheck existing Helpful→Helpful→Not Helpful→Not Helpful on one grounded answer only if acceptance requires a fresh release-level feedback check: exactly two events for one answer, proper LMS-0717 snapshot/version, existing Stage 7A correlation.
9. Smoke-test the accepted medical/coaching/equipment/NVZ/serve/roster-troubleshooting controls. Verify answer/source/UI payload behavior remains unchanged apart from the approved clarification/outcome correction and disclaimer.
10. Check desktop and an actual narrow phone, keyboard open/closed: disclaimer once above composer, clean wrapping, usable input, visible close, reachable answers/feedback/sources, no dashboard overlap, preserved Escape/focus behavior. Confirm no manager-only diagnostics appear in player responses.
11. Review sanitized capture logs/health using the existing authorized access path. No deliberate production outage, HMAC change, schema break or corpus mutation is part of acceptance. Preserve the owner-accepted LMS-0716 operational test limitations unless separately authorized to revisit them.
12. If an unexpected security, capture, scope or answer regression appears, stop and record the question, selected evidence and sanitized diagnostics for review. After all applicable gates pass, obtain owner production acceptance and update the roadmap. **Do not start LMS-0718 or Live LMS Intelligence.**

No claim of LMS-0717 production acceptance is made by this local implementation report.
