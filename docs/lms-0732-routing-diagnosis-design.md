# LMS-0732 / 0.1.554 — procedural and Important Dates routing

2026-09-10. **DIAGNOSIS COMPLETE — READY FOR BOUNDED LOCAL IMPLEMENTATION APPROVAL. STOP FOR REVIEW.** Production remains accepted LMS-0731 / 0.1.553. Only owner-authorized production SELECT verification and local report updates were performed. No application implementation, deployment, SQL mutation, corpus mutation, Approved Answer creation, or OpenAI calls.

## Evidence limits

The eight inspected routing/service/evidence modules match the frozen LMS-0731 semantic production upload byte-for-byte. The 29-question [offline trace](lms-0732-offline-routing-diagnosis.json) invokes existing pure classifiers, not HTTP, database, embedding or answer-generation functions. These are baseline observations, not passing correction tests.

The owner explicitly clarified and authorized read-only production source verification. [Current production evidence](lms-0732-current-source-verification.json) confirms the seven-document active catalog and unchanged versions, including the two controlling sources. All five required chunks match the retained September 8 evidence exactly, including text and version IDs; all are searchable and have stored embeddings. Both controlling documents are active, their active versions are ready, and their document scope is `all`. The existing Include/Exclude control writes `is_searchable`; no separate Include flag is required by the inspected completion path. Optional JSON field probes returning null are not treated as exclusion or proof of additional schema fields.

The Important Dates title-only chunk is excluded (`is_searchable=false`); it contains no requested date and is not needed. The three substantive date sections are included. Document scope `all` does not authorize ignoring league headings or calendar/season evidence. No material discrepancy or retrieval-eligibility blocker was found. No search/model endpoint was invoked; eligible source presence is verified, not current router success.

A supplementary attempt to inspect matching passages in other guides/Rules was rejected by automatic approval review as beyond the explicitly authorized source scope. It was not retried or bypassed. That additional read is unnecessary to certify the two complete controlling sources. Other-guide content observations below remain retained-evidence observations; their catalog versions were verified unchanged. This does not leave the two-family implementation design blocked.

## 1. Release and scope

LMS-0732 / 0.1.554 covers only team-registration how-to routing and schedule-release Important Dates retrieval. Version files remain unchanged pending implementation approval. Standings rank, security hardening, Approved Answer matching/lifecycle and business workflows remain outside this release.

## 2. Registration: first wrong stage

Normalization preserves the supplied wording. `questionIntent` recognizes `primetime` but returns `kind: unresolved, object: null`; its procedural branch only applies to roster operations, not team registration. This is the first missing intent decision. `liveIntent` then sees `our team` as SELF and the unrelated league-name token DUPR as the requested rating field, returning `SELF_RATING / primetime`. This is the first affirmative wrong route.

The API invokes Live routing before the official-document conversation/retrieval pipeline. The emitted query has neither a season nor league constraint: `{intent: SELF_RATING, subjectKind: SELF, rating: primetime}`. `runLive` forwards only query fields, not a parsed 2026 Fall constraint. The downstream season clarification therefore operates on the wrong operation and unbound season. The reported Fall/Saturday choices are consistent with this code path; no new production replay was performed. Official evidence retrieval never runs for this misrouted request.

The shorter five registration/control variants also return unresolved document semantics; most happen to avoid Live rather than being correctly classified. Adding only a keyword exclusion to SELF_RATING would leave the underlying procedure/retrieval problem unresolved.

## 3. Schedule release: first wrong stage

`leagueDateIntent` has no schedule-publication event. All eight required release variants return unresolved semantics. Seven avoid Live by accident; “When can we expect our schedule?” returns Live UNSUPPORTED. `needsPolicyEvidence` is false, so the bounded active Important Dates completion read is skipped. `officialDateEvent` also does not recognize “Schedules completed and sent.”

Thus intent is the earliest reproducible gap, followed by missing event extraction/completion. For the two reported failures, ordinary retrieval would run, but the exact historical semantic scores/candidate rejection stage cannot be reconstructed without retained request traces; do not claim a measured vector-search failure. Even adding a date event alone is insufficient: `clarificationFromRetrieval` currently always asks for a league on generic league-date questions, while `selectLeagueDateEvidence` returns nothing without one.

## 4. Registration sources

Retained active Captains Guide: **LWR Pickleball Club DUPR Captains Guide**, document `353b1adc-756e-4e1b-8fe6-ed3fd5e18029`, version `816a2cd7-d0c9-4c27-b41a-90eccc39cc9b`, label `v20260908144326-816a2cd7`.

Exact section: **HOW TO REGISTER YOUR TEAM (SIGNING UP YOUR TEAM)**.

- Page 4, chunk `ba65d436-5d3d-431a-b320-1dd78e472c2d`, ordinal 7: Club announces registration; visit `https://lwrpickleballclub.com/leagues`; select the appropriate league; click **Register My Team!**; sign into the regular Club membership account; quantity **1**, separately repeat registration for additional teams.
- Page 5, chunk `a951f671-8566-4b6a-b630-8474e5b302e9`, ordinal 8: complete required questions; click **Register My Team!**; provide payment or available saved payment method; receive confirmation email; League Management activates the team and assigns Captain/Co-Captains; management notifies when rosters are unlocked.
- Page 7, chunk `846a9a9a-89c3-4769-99fb-c931a9ee2feb`: later Manage Roster work and player prerequisites. It must not replace the actual initial registration process.

League Rules retained version `f0aad5ad-cf08-46c2-94fd-686ceb1271c0` establishes competition/eligibility policy, not this complete web registration sequence. Do not synthesize a different registration workflow from match setup or doubles-team creation provisions.

Retained **LWRPC-Captains Guide to the LMS**, version `7ec16cf5-7b9d-4b3b-a847-8dd5767396c7`, has LMS login/dashboard material and pages 8–9 roster management/Add Player instructions. These concern existing teams, not an alternative initial registration path. This supplemental content review is partial; its active catalog version is unchanged. The verified complete registration section in the DUPR Captains Guide provides the controlling procedure without depending on this supplemental guide.

## 5. Procedure sufficiency

The current active, ready, searchable Captains Guide pages 4–5 are sufficient for the requested concise ordered registration instructions, including the post-payment management/roster-unlock qualifications. Do not invent prices, payment success, a specific season registration URL, immediate activation, immediate roster access, or current availability. Select the supplied league and season without claiming that registration is presently open. Current authority is verified; no missing-policy conclusion or Approved Answer is justified.

## 6. Important Dates source and exact evidence

**2026 Fall League Important Dates**, `league_supplement`, document `c6bdcc3b-c009-47c6-9dec-642b8a988a4f`, version `f811e60f-9af8-444f-b009-9594a530acd6`, label `v20260904112405-f811e60f`.

Each retained league section contains the same exact line:

> • Oct. 7, Wednesday – Schedules completed and sent

| Section | Page | Chunk |
|---|---:|---|
| Weekday DUPR League Key Dates | 1 | c4ab8544-decb-4ea1-b856-2df4a2d196f1 |
| Saturday DUPR League Key Dates | 1 | f9f05921-2ee9-46fc-9b44-e5a861d7dd6f |
| PrimeTime DUPR League Key Dates | 2 | 950a54ab-aa3b-4f43-9c51-88ce0ca803ae |

Current production confirms all three passages exactly. This evidence does **not** say “by.” Describe the published calendar as listing Wednesday, October 7, 2026 for schedules to be completed and sent; do not guarantee actual publication or invent a time. Preserve BY if a later verified source actually contains BY. Exact source text and independent heading/page bindings must survive selection.

## 7. League and season applicability

All three retained sections agree for this release milestone. Weekday/PrimeTime correspond to Fall 2026; Saturday's section spans fall through the following spring. The document's Fall title must not relabel every Saturday event as Fall or erase its 26/27 season. Derive calendar year from the source title and ordered month rollover; keep that separate from a season identity.

Explicit PrimeTime + 2026 Fall must use PrimeTime evidence only. Explicit Weekday excludes both other leagues. Explicit Saturday / 26/27 uses the Saturday section. A generic common answer can name the three published scopes and the common date after confirming the applicable current set is complete. Missing, stale or conflicting scope coverage must not become a universal claim.

## 8. Explicit-context retention design

Introduce a narrow shared semantic descriptor for these two families: action/event, league set, season label/year range and provenance (explicit or validated continuation). Parse user-supplied dimensions before choosing Live versus documents; explicit text takes precedence over inherited context. This descriptor is a retrieval constraint, never authorization. Keep original question/evidence unchanged. Do not rewrite source years, discard 26/27, or infer a member/team from “my.” Contradictory dimensions require clarification rather than silently choosing one.

## 9. Clarification design

Clarify only unresolved dimensions that materially affect the answer. The generic registration procedure is common, so it need not ask a league merely to provide documented steps. Explicit PrimeTime + Fall has no league/season question. For generic release timing, compare complete applicable source facts first: identical dates/qualifiers support a common answer; different dates require bounded choices restricted to known dimensions. Bind choices to the existing signed/validated conversation context. A selection changes only its unresolved dimension. “How do I register it?” stays procedural; use a valid antecedent or ask what is being registered without a personal lookup. Expired/tampered context fails safely.

## 10. Procedural routing design

Add bounded team-registration procedure recognition for register/sign up plus team/Captain context and the stated how-to/instruction forms, including the long narrative. Perform it through `questionIntent` so both Live suppression and document guards agree. Keep privacy and genuine mixed live/policy requests protected; do not globally whitelist “how,” “DUPR” or “my team.” Registration-state questions must be separately recognized as operational, never passed through the procedure exemption.

## 11. Schedule-release routing design

Add a specific official schedule-release event covering the eight requested phrasings. “Our schedule” in an expectation/publication question is still a policy-date request; “Is my team's schedule ready?” is current state. Do not loosen the general personal-data guard. Preserve Match Setup, next-match and rescheduling distinctions.

## 12. Evidence retrieval design

Extend existing bounded active-ready completion: registration selects the Captains Guide registration section across pages 4–5; schedule release selects the appropriate supplement sections and exact event bullets. Preserve source IDs, original offsets, page/headings, authority, active-version checks, budgets and all qualifications. Select the complete procedure across chunk boundaries before generation; a page-4-only answer must fail completeness controls. Do not lower global semantic thresholds, alter Approved Answer selection, fabricate numbered Rules citations, or hardcode dates/registration steps as a parallel answer store.

## 13. Source classification

Use the existing **OFFICIAL RULES** document provenance/badge for official guides and Important Dates, with their actual document titles/page citations. Neither family uses LIVE LMS DATA when answering only from documents. No badge terminology redesign.

## 14. Contrast behavior

| Request | Intended bounded result |
|---|---|
| How to register PrimeTime / Weekday / Saturday team | Official procedure; no self lookup |
| How do I register it? | Procedure context resolution; clarify object if needed |
| Is my PrimeTime team registered? / What teams are registered? | Operational; registration state is absent from current LIVE_CAPABILITIES, so truthful unsupported without retrieval/generation, unless an already-supported exact operation is established |
| My PrimeTime Season DUPR | Existing SELF_RATING; never procedure |
| When will schedules be released? | Official Important Dates |
| Is my team's schedule ready? | Unsupported live publication state; do not infer from dates or existence of matches |
| What is my next match? | Existing authorized NEXT_MATCH |
| Who do we play first? | Protected unsupported first-match request; do not silently equate season-first with next upcoming |
| How do I create a schedule? | Procedural help, evidence permitting; no new scheduling capability |

The existing rating route also omits explicit Fall from the emitted rating query. Preserve SELF_RATING and record this separate limitation; do not expand LMS-0732 into a general Live season-resolution/SQL change. Registration fix must never enter that path.

## 15. Other date families — diagnosis only

| Family | Existing pure routing/completion | Retained evidence / limit |
|---|---|---|
| Registration closes | policy_date / registration_close; completion enabled | Oct. 4 all three; generic query still unnecessarily asks league under existing code |
| Roster opens | policy_date / roster; completion enabled | Sept. 28; management unlock qualification remains necessary |
| League starts | policy_date / season_start; completion enabled | PrimeTime Oct. 16; Weekday Oct. 14 women/15 men; Saturday Oct. 17 DUPR7 and Oct. 24 DUPR6/8 |
| Captain meeting | unresolved; completion disabled | Meeting date not established by inspected excerpts; current full-source check pending |
| Season ends | policy_date / season_end; completion enabled | PrimeTime Dec. 4; Weekday Dec. 2/3; Saturday Feb. 20/27 following year |

These are routing/source observations, not new generated-answer certifications. Do not add meeting-date behavior or a general calendar overhaul. Scope the common-date exception to schedule release unless identical shared mechanics can be reused without changing other policies.

## 16–18. Leakage controls

Required corrected-test outcomes: **Cross-League = 0; Cross-Season = 0; Cross-Intent = 0**. These are acceptance targets, not current pass claims. Assert every selected passage and every clarification choice against resolved league/season; test conflicting/missing/stale source sets and Saturday year rollover. Assert procedure/release make zero personal RPCs; state requests make zero document/model calls; actual SELF_RATING and NEXT_MATCH retain authorized Live behavior. Test standalone, signed continuation, stale Live context, explicit override and tampered choices. Preserve exact-evidence rejection, effective-user isolation and the accepted LMS-0727–0731 controls.

## 19–21. Corpus, Approved Answers and SQL

No corpus change required: current active, ready, searchable passages contain both answers and all five have existing embeddings. No Approved Answer creation or matching/lifecycle changes. No migration, grants/RLS, business SQL or schema changes required by this design; any implementation need for SQL requires separate review. The authorized source-verification gate is complete.

## 22. Expected files after approval

Primary: `app/lib/aiRequestIntent.js`, `liveLmsIntent.js`, `aiLeagueDateFacts.js`, `aiPolicyEvidence.js`, `aiLeagueDateEvidence.js`, `aiConversation.js`. A small shared intent/context helper and procedure evidence helper may keep the bounded additions separate. Review `askLwrPlayerAnswer.js` operational guards and `aiAnswerGeneration.js` completeness/date wording only where necessary. No unrelated Live service rewrite. Add focused deterministic tests/source fixtures and release documentation/version metadata. These paths are relative to `lwrpc-admin`; no application file was edited during diagnosis.

Exact bounded implementation order:

1. In the shared intent layer, recognize team-registration procedures and schedule publication before generic personal-rating/schedule matches. Keep completed/current registration state separate and protected when unsupported.
2. Carry explicit league and season descriptors through document resolution and signed clarification; resolve only missing dimensions. Scope extraction must not query personal records. PrimeTime + 2026 Fall produces no Saturday/Fall reconfirmation.
3. Extend the existing active-ready completion path for the registration section, selecting both pages as original source excerpts with ordered steps and activation/unlock qualifications. Do not hardcode the steps or source UUIDs into application behavior.
4. Add `schedule_release` intent and source-event recognition for the publication language. Select original Important Dates bullets with their league-heading and year/season bindings; never infer actual live publication status.
5. Before generic release clarification, compare the complete applicable set. Same date and compatible qualifiers permit a common answer naming its scope. Different dates require only constrained missing-dimension choices. Missing coverage fails safely; one available league must not represent all leagues.
6. Wire these bounded semantic exemptions through existing Live/document guards and conversation continuation, leaving authorization, exact-evidence validation and Approved Answer lifecycle intact. Certify zero unrelated choices and zero cross-league/season/intent leakage deterministically before any approved affected generation.

## 23. Test plan

Run deterministic controls first: all required five procedures, eight release phrasings, explicit league/season variants, the contrast table, authenticated-context isolation, source ordering/completeness, stale versions, source offsets, common/different date choices, BY/ON/no-time qualifiers, Saturday rollover and protected mixed requests. Use fixtures for all non-generative behavior. Retain accepted community, identity/team records, implicit Player View-As, Captain names and Approved Answer lifecycle suites. Run lint, types and production build as applicable after implementation. UI verification uses normal and View-As shared Ask LWR at desktop/390/320 without business writes.

## 24. Model-call and cost plan

Diagnosis: **0 OpenAI calls**, including embeddings. No full generated benchmark. Proposed later budget: four affected local generations after deterministic gates (full registration completeness, explicit release, common release, and a qualifier/conflict fixture only if generated prose is material); two targeted production generations after separately approved deployment. Maximum proposed six, not authorization to run now. Use stored evidence for local generation to avoid embeddings. At prior accepted accounting rates ($5/M uncached input, $30/M output), a planning allowance of 4,000 input + 600 output per call is $0.038, or $0.228 for six, excluding query embeddings. This is an estimate, not a provider price recheck or guaranteed cap. Verify configured pricing before an authorized run; report actual usage separately and stop for a revised budget if payloads exceed the plan. No prompts retained merely for cost accounting.

## 25. Controlled sequence and remaining gate

1. **COMPLETE:** owner-authorized current active catalog, controlling passages, searchable state and embedding-presence verification. Five exact text/version comparisons pass. No member/business rows, DDL, DML or model traffic.
2. Owner reviews complete diagnosis/design, then separately authorizes local implementation.
3. Implement only the two families; deterministic checks first, then the approved affected generations. Produce exact candidate/diff and recovery plan. Stop for production review.
4. On deployment approval, preflight accepted baseline and source identities; deploy exact candidate without SQL. Normal LMS tests first, business-integrity checkpoint, then targeted Ask LWR and effective-user/View-As acceptance. Stop immediately on normal regression.
5. Record actual usage, citations, context/clarification checks and final acceptance. Do not start deferred work automatically.

**Final recommendation:** approve bounded local implementation of sections 8–12 and the deterministic controls in sections 14–18/23. No additional source-policy, corpus, SQL or Approved Answer work is needed for these two families. Implementation remains unstarted and requires owner approval. No production mutation or implementation has occurred.
