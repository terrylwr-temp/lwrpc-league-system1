# LMS-0727 / 0.1.549 — Cross-community eligibility local review

Status: LOCAL CANDIDATE; STOP FOR REVIEW. No deployment authorized by this report. LMS-0726 / 0.1.548 remains accepted production.

## 1. Version and bounded scope

Next sequence is LMS-0727 / 0.1.549. Only Ask LWR community intent, conversation recognition, active official policy completion, answer instructions, reference-only diagnostics, version metadata and controls changed. No teams, rosters, schedules, Match Setup, matches, scores, standings, ratings, member administration, normal authorization or View-As implementation changed.

## 2. Diagnosis and first incorrect stage

Read-only verification on September 9 confirmed the active Rules and searchable source. The exact-question query of retained ai_request_outcomes diagnostics returned no records; original production ranking cannot be reconstructed from that evidence. Do not claim a measured original candidate rank or replay of the failed HTTP requests.

| Stage | Longer question: Can I play on a team in a different community? | Shorter question: Can I play in a different community? |
|---|---|---|
| Raw/interpretation | Original preserved; no spelling annotations | Original preserved; no spelling annotations |
| Semantic intent | Unresolved: first identified incorrect stage | Unresolved: first identified incorrect stage |
| Legacy community selector | Recognized | Not recognized: required team or play-for wording |
| Live classification | No Live intent | No Live intent |
| League/division | None supplied; should not prevent general policy | Same |
| Retrieval | Generic ranked retrieval; no bounded community policy completion | Same |
| Candidate evidence | Active searchable Rule 3.5 exists; original request rankings unavailable | Same |
| Applicability | Legacy selector could select only if sufficient ranked evidence reached it | No dedicated community evidence intent |
| Validation/answer | Exact-source gate unchanged; reported insufficient outcome is consistent with missing applicable selection | Same, plus missing matcher |

Deterministic replay proves the corrected selector succeeds even with an empty/insufficient ranked candidate set when verified active completion supplies the governing provision. Completion is the existing bounded read of active/ready official versions and searchable chunks (24 catalog rows, up to 4 relevant documents, 160 chunks per document, 5-second read deadline). No new embedding or model request is added. Missing completion, ambiguous multiple governing passages, or incomplete current conjunction fail closed.

End-to-end conversation tests additionally caught self-contained 'if mine has a team' and 'What if my community’s team is full?' being classified as unresolved follow-ups. The recognized community policy topic now supersedes that ambiguity without inheriting an unrelated prior question.

## 3–4. Governing source and exact evidence

LWR Pickleball Club DUPR League Rules, active/ready, scope all; version v20260908162017-f0aad5ad; page 2, Rule 3.5. Version ID f0aad5ad-cf08-46c2-94fd-686ceb1271c0; searchable chunk aae95c91-940a-41b2-b26d-f1df8270c1da, parent Rule 3 / PLAYER REQUIREMENTS.

Exact contiguous source excerpt, preserving stored line breaks:

> 3.5. Players may form teams with members from other communities; however, they are not
> permitted to play for another community’s team if their own community already has a
> team in their division and has roster availability for additional players.

Selection carries exact start/end ranges, separate applicability metadata, and passes the existing real source/citation resolver. Rule 3.5 and page 2 are revalidated. No synthetic passage or independently hardcoded answer. Historical LMS-0717 fixtures contain an older provision without availability; those remain historical controls, not the current source baseline.

## 5–9. Answer behavior and facts

- Generic policy: immediately explains permitted cross-community teams and the complete restriction.
- Personal wording: useful official policy first; no recorded personal facts inferred from I/my/me.
- Explicit no-team-in-requested-division premise: explains that this particular restriction does not block the user, conditionally on their statement; does not certify other eligibility.
- Full roster: conditional on no roster availability in the relevant scope. No invented numeric definition of full.
- Same-division team with room: prohibition applied to the supplied facts, not claimed as a verified LMS finding.
- Team existence alone: availability is still required. No personal Yes/No if material facts are missing.
- Other division/league team: does not establish the restriction, and does not establish absence of a team in the requested scope. The answer identifies requested-scope existence and availability as still needed.

## 10–11. Scope safety

Cross-League Leakage = 0 and Cross-Division Leakage = 0 in the reviewed final affected controls. The first generated scope answers were too affirmative despite distinguishing scopes; retained as failed first-pass evidence. Only those two cases were rerun after tightening the instruction. Both corrected answers explain the missing requested-scope facts without declaring unconditional permission. A deterministic wrong-league evidence control rejects a Saturday-scoped candidate for a Weekday question.

## 12–14. Classification, privacy and View-As

All answers in this release are OFFICIAL RULES / DOCUMENT_ONLY. No Live lookup is attempted for this policy topic. Existing Live capabilities (ratings, contacts, team, roster, next match) do not establish complete community affiliation + scoped team availability; they are not expanded. What team am I on remains SELF_TEAM. Can I play on a DUPR5 team remains the accepted separate personal-division eligibility operation.

Only official Rule 3.5 and question text reach generation under the existing privacy architecture. No protected member data is retrieved or sent. The eight validation questions are synthetic; no production Ask endpoint, telemetry write, or embedding was used by the runner. Provider request store=false; model remains gpt-5.5, returned snapshot gpt-5.5-2026-04-23. The runner retains numeric usage including cached tokens and LOCAL_BENCHMARK category, without storing complete prompts for accounting.

View-As authorization and effective-user boundaries are unchanged; existing deterministic View-As tests are included in the full suite. No real Commissioner authority is consulted by this document-only correction. No new browser production acceptance was performed locally.

## 15. Corpus and Approved Answers

No corpus edit/reprocess, upload, activation, SQL, or Approved Answer change. Cross-community policy deliberately bypasses Approved Answer lookup. Two older integration expectations were updated from one such lookup to zero; unrelated Approved Answer behavior retains its own controls.

## 16–18. Controls, model accounting and local validation

24 dedicated controls: 19 wording variants through semantic/Live/eligibility guards, actual conversation/player execution, exact selection/revalidation and source classification; plus Live/division contrasts, incomplete/conflicting/tampered evidence, bounded read filters, offline model payload and wrong-league rejection. Historical and related integration suites retained.

Affected generation: 8 cases first, 2 corrected scope cases only. Final reviewed matrix: six retained successful answers plus two corrected answers = 8/8. Ten completed provider responses, 16,523 input tokens, 1,419 output tokens, zero cached input tokens. Estimated generation cost $0.125185 using the project's accepted $5/M input and $30/M output estimate. One additional restricted-network dispatch attempt returned no response/usage; it is separately retained and its billed status is unknown. Zero embedding calls; no full model benchmark. Evidence: lms-0727-model-results.json, lms-0727-scope-model-results.json, lms-0727-model-cost.json, lms-0727-model-network-attempt.json. This is local fixture-source generation certification, not live retrieval-ranking or production HTTP certification.

Final command results are recorded in lms-0727-tests.txt, lms-0727-lint.txt, lms-0727-types.txt, lms-0727-pdf.txt, lms-0727-build-final.txt and lms-0727-diff-check.txt. Initial local build compiled, but cache .tsbuildinfo write failed EPERM; elevated local build resolved it. No deployment occurred. Final totals are appended below after process completion.

## 19–20. Normal LMS safety and SQL

Comparison against the accepted 312-file deployment manifest found only ten changed existing release files: seven Ask LWR library files, version.js, package.json and package-lock.json; one new intent module is also required. Normal business screens, server writes, authorization, View-As/proxy and SQL all remain exact accepted bytes. The comparison manifest and local-delta record isolate this release from the workspace's pre-existing cumulative changes. New/changed tests and runner are development-only. Required git diff check also removed two existing trailing blank lines from AGENTS.md/roadmap; no project rule changed.

No SQL requirement. No business mutation. No added Live capability. If either becomes necessary later, stop for a separate review. Broader security hardening and member-role semantics remain deferred.

## 21. Proposed controlled production sequence — requires owner approval

1. Review/approve this exact local candidate and application-only deployment scope. Assemble from accepted LMS-0726 package plus the reviewed delta/new intent module; verify hashes, not the entire cumulative workspace.
2. Read-only preflight: confirm production version/deployment, active Rules identity/searchability, migration history/security state, maintenance health and business-table fingerprints. Distinguish legitimate owner activity. Retain accepted LMS-0726 deployment dpl_39U8T1potC5w7bhUiHFwTG1cXYBb for application rollback. No database rollback is needed because there is no SQL change.
3. Deploy only approved application package; verify READY and both normal/View-As aliases.
4. NORMAL LMS FIRST: authenticated Commissioner, legitimate Captain/Player checks, existing role controls, teams/rosters/schedules/Match Setup where available/matches/standings and Member Detail. Read-only checks; no fake live records. Any normal regression stops feature acceptance and invokes the reviewed application rollback decision.
5. Business integrity checkpoint before feature tests. Zero unexplained candidate-caused mutations.
6. Targeted Ask LWR production acceptance only: original failures, same-division room and one missing-scope case, with citations/classification; deterministic Live contrast and effective-user View-As checks. Agree exact model-call budget before dispatch; do not rerun a full benchmark.
7. Final integrity, runtime/telemetry and maintenance checkpoint, report remaining data-dependent limits, then explicit production acceptance. No automatic next release.

## Final local gate results

- npm test: 1,037/1,037 PASS (zero failures/skips).
- npm run lint: PASS, 0 errors / 11 pre-existing warnings.
- npx tsc --noEmit --incremental false: PASS.
- npm run verify:ai-pdf-server-bundle: PASS.
- npm run build: PASS on final candidate with local cache permission elevation.
- git diff --check: PASS, exit 0.
- Accepted deployment comparison: 302/312 existing files unchanged; 10 expected existing files changed plus one new runtime intent module. No normal workflow or View-As source differs.
- Final model review: 8/8 affected scenarios accepted (six first-pass + two corrected scope results); zero observed scope leakage in this bounded set. No additional calls after that review.

STOP FOR REVIEW. Production remains accepted LMS-0726 / 0.1.548; no SQL, corpus or production changes occurred.
