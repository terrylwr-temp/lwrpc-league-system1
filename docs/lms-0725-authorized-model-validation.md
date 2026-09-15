# LMS-0725 / 0.1.547 — authorized OpenAI validation

**Historical failure matrix.** The subsequent authorized [final local correction and validation](lms-0725-final-correction.md) resolves these observed failures. This original report and its 42-call evidence remain preserved; production is still not accepted.

September 8, 2026. **Validation run complete; quality gates NOT fully met. STOP FOR REVIEW. Do not deploy.** This report supersedes the previous OpenAI authorization block. No application correction, model configuration change, production deployment, SQL, corpus reprocessing, Approved Answer, operational data mutation or View-As parity work was performed in this validation turn.

## Calls and scope

- **42 answer-model calls**, one per eligible benchmark question; 42 responses, no provider errors or retries.
- Existing configured model: `gpt-5.5`; returned model: `gpt-5.5-2026-04-23`.
- Existing `generateOfficialAnswer` integration to `https://api.openai.com/v1/responses`, `store:false`. No new provider, external store, embedding, PDF upload or corpus transfer.
- **63/63 routing PASS**: 47 document-classified questions, 10 Live and 6 protected. Of the 47 document cases, 42 generated answers, 3 clarified locally (Q11/Q48/Q49), and 2 had no selected evidence (Q29/Q46). All 21 cases without generation made zero answer-model calls. Embedding calls were zero for the entire harness; no Live data was queried.
- Generated categories: 16 roster policy/date variants, 1 match-lineup policy, 4 roster procedure questions, 15 scoring-applicability variants, 2 Rally mechanics questions, 4 Season DUPR document questions. Every model-tested question and its review appears in the [complete matrix](lms-0725-authorized-model-matrix.md).
- This tests the actual local selection/source-validation/generation path with saved official excerpts and fixture metadata/signing. It is **not production retrieval ranking, a fresh corpus completeness audit, production HTTP acceptance, or a production Stage 7 replay**. Constant fixture scores remain a limitation.

The maximum selection sent was four source containers and 1,649 characters of official source text per question; maximum question/evidence input was 4,984 characters, excluding the existing common instruction contract. No entire PDFs or entire corpus were sent. Reported total usage: 76,433 input and 4,310 output tokens. Median model generation time was 2,521 ms; maximum 15,451 ms. These are local provider-call timings, not production end-to-end latency.

## Exact evidence behavior — one important failure

**35 generated cases use the corrected structured excerpt representation**, with independent version/chunk/range/page/provision identities and separate applicability metadata. Roster date lines remain separate from their heading bindings and unlock guide. Saturday page 9 retains its two nonadjacent clauses as two items inside one source container. Default Rule 5.3 and its cross-page continuation stay separate from league exceptions. Four-source bounds remain intact.

All 42 dispatched selections passed the existing `resolveOfficialSources` / `trustedSelectedRuleIdentity` gate. A stricter literal saved-source audit subsequently found **41 exact-text passes and 1 failure: Q57**.

Q57: `When are Season DUPR ratings recorded for Saturday?`

The older `evidencePassages` helper in `app/lib/aiQuestionApplicability.js` synthesizes the league heading plus a nonadjacent rating-recording bullet. `seasonRatingDatePassages` selects that reconstructed unit. The existing validator accepts it through its legacy reconstructed-unit compatibility path, although the combined text is not an exact contiguous substring of the saved chunk. Q57 never entered the new structured policy representation because it concerns rating recording, not roster opening. This is a real remaining source-fidelity defect, even though the generated date is correct.

**Q57 did reach OpenAI in this run before this stricter audit exposed the defect.** Its content comprised official heading/date text, without personal data, but it did not satisfy the requested separate-excerpt representation. No further provider calls were made. The validation runner now rejects any selected passage that is not a literal contiguous saved-source excerpt before dispatch; its subsequent offline preflight blocks Q57 with zero calls. The application itself and its existing validator were not modified during this validation turn.

The initial preflight also exposed a runner-only problem: reselecting evidence after generation normalized selection metadata could distort the trace. Before any provider dispatch, this was fixed by capturing the exact selection at the source resolver and cloning retrieval data per question. Provider records refer to the actual validated selection, not a later reselection.

## Required roster results

**Exact blocker (Q07):**

> You can start updating weekday league rosters on Monday, Sept. 28. Rosters are available once League Management unlocks them and notifies you that you may begin adding and managing players.

Sources: `2026 Fall League Important Dates — Weekday DUPR League Key Dates — Page 1` and the Captains Guide page 5 unlock passage. Exact source items validate; source links/identity are attached by the server. The answer has the correct date and Weekday scope, but **does not explicitly say 2026 in the prose**, so the strict requested “September 28, 2026” answer requirement is not fully met.

**Natural question (Q08), `when can I start entering my players for my team`:** the model says entry is available after unlock notification, then explicitly gives **Monday, Sept. 28 for the 2026 Fall Weekday, Saturday and PrimeTime leagues**. All three dates agree in the saved source; the answer does not invent the user's league or inspect their team.

All 16 generated roster-date answers preserve the September 28 date and League Management unlock/notification condition. Q19 uses the deterministic pre-opening calendar comparison and explicitly says the user's actual team unlock/personal eligibility has not been checked. Nine roster answers omit the year in prose: **Q07, Q09, Q10, Q12, Q13, Q14, Q17, Q18, Q21**. Their citations identify the 2026 source; no wrong year was invented. This is still an explicit temporal-scope wording gap.

Q11 (`When can I add players?`) clarifies roster versus match-lineup entry and makes no model call. This differs from the requested natural roster-date answer control and needs review; it is not counted as a generated answer pass. Q24 correctly gives the separate Match Setup deadline, three days before a match. Q25–Q28 provide documented Manage Roster procedures, not Live roster-state claims.

## Rally applicability and mechanics

**Q30, `Does the weekday dupr league use rally scoring`:**

> No—not generally. The weekday DUPR league uses Standard Scoring unless a particular game or match format expressly requires Rally Scoring.
>
> The supplied exception is only for the weekday 9.1 division Picklebreaker™: when the match is tied 2–2 after all preceding rounds, the Picklebreaker™ is one game to 15, win by 2, using Rally Scoring.

Verified citations: Rule 5.3 page 4, its page 5 continuation (existing Rule 5 parent fallback), and Rule 6.1.9.7 page 8. Q31–Q37 preserve the same default and limited exception; Q35 answers Yes only for that specified Picklebreaker. Q44 does not import the 9.1 exception into Weekday 8.1.

Saturday Q38–Q40 correctly cite the express Saturday rules: regular games use Rally to 15, win by 1; its Picklebreaker applies at 12–12 after previous rounds and is to 25, win by 2. PrimeTime Q41–Q43 retain Standard as the default and restrict the Rally exception to the 2–2 Picklebreaker, to 15, win by 2. No league's exception is assigned to another league.

Q45 (general Rally mechanics) retains the serving requirement for the game-winning point, score freeze, and win-by-two unfreeze/refreeze condition. Q47 correctly answers that the game-winning point must be scored while serving. The cited general Rally source is used for mechanics, not scoring applicability. Q48/Q49 clarify locally instead of guessing missing scoring-method/context information.

Q46 (`How does Rally Scoring work in a Picklebreaker?`) selects no evidence in this unscoped saved-snapshot path. It returns the safe insufficient-evidence response with no model call. It is a coverage failure, not a successful mechanics answer. No manual evidence bypass was used to manufacture a pass.

## Other failed/incomplete cases

- **Q29 — match score entry:** saved guide coverage does not include a full score-entry procedure; no selected evidence and no model call. The snapshot includes references to scoring but not the needed instruction pages. This does not establish that production lacks those pages.
- **Q54 — when Season DUPR is established:** only rules 4.5.1/4.5.2 were selected. The model safely says they do not state when it is established. Not a successful timing answer.
- **Q55 — when my Season DUPR is established:** returns conditional multi-division and NR assignment rules instead of answering “when.” This is an intent/completeness failure despite those conditional facts being present in the sources.
- **Q56 — how my Season DUPR is calculated:** only special-case NR and multi-division rules are supplied and summarized; the general calculation is not established. The saved snapshot lacks the broader definition/calculation material. Full answer support cannot be claimed.
- **Q57 — Saturday rating-recording date:** generated September 27, supported by the 2026 Important Dates citation, but the legacy source representation fails literal fidelity as described above; the answer also omits the year in prose.

No application fix or production source-gap conclusion is inferred solely from incomplete local fixtures. These cases need bounded diagnosis/correction and complete evidence verification, not corpus reprocessing or an Approved Answer.

## Quality gates

| Gate | Observed result |
|---|---|
| Routing | **63/63 PASS** |
| Cross-League Leakage | **0 observed** in generated applicability answers and selected scope checks |
| Mechanics-as-applicability errors | **0 observed** across all 15 scoring-applicability answers |
| Source fidelity | **41/42 literal passes; Q57 FAIL**; 42/42 passed the existing validator |
| Scoring material qualifications | **0 omissions observed** for the reviewed default/exception, division/game, tie, target/win-by and relevant winning-point/freeze obligations |
| Overall material/temporal qualification gate | **NOT fully met**: explicit year omitted in 9 roster answers plus Q57; incomplete Season DUPR evidence/answers remain |
| Unsupported grounded answers = 0 | **Not certified for the complete benchmark**: Q55/Q56 do not fully establish the requested timing/general-calculation answers. No fabricated factual claim was identified in the reviewed answers, but fact-level support does not establish complete answer support. |
| Full 63-case generated-answer quality | **NOT PASS**; see the complete matrix |
| Production acceptance | **NOT RUN / NOT ACCEPTED** |

## Privacy and logging

Only benchmark questions, selected official-document text, official-source identity/labels and verified applicability metadata, with the existing grounding contract, were sent. **No Live LMS/member rows, member identities, player-linked ratings, rosters, protected subject references, View-As contexts, cookies, session tokens or unrelated history were present in model content.** Live/protected benchmark questions were not dispatched.

The configured OpenAI API credential was used solely for the integration's normal HTTPS authentication. Credentials/Authorization headers were not included as model input, copied into diagnostic files or sent to another destination. No key/model/configuration changes were made.

Local results record generated answers, bounded official source references/ranges, passage lengths/hashes, call counts and existing usage metrics. Complete outbound request payloads were not logged, and no production telemetry or feedback records were written. The prior automatic-review rejection is superseded by the user's explicit payload/destination authorization; there is no outstanding authorization blocker for this completed run.

## Local validation and changed files

This turn adds only `lwrpc-admin/scripts/lms0725-authorized-model-validation.mjs`, its local output/review artifacts, this report/matrix, and roadmap/report status links. No application implementation files changed.

- Focused LMS-0725 + fidelity regressions: **147/147 PASS**.
- Full suite rerun: **820/820 PASS**.
- New runner ESLint: **PASS**, rerun after final pre-dispatch guard.
- Strict offline outbound preflight: **41 eligible passes, Q57 correctly blocked, 16 deterministic, 3 clarification, 2 insufficient evidence; 0 provider calls**.
- Prior unchanged-app validation remains applicable: full lint (7 warnings, 0 errors), nonincremental typecheck, PDF bundle and production build PASS. No UI markup changed, so no new desktop/mobile rendering test was required in this validation-only turn.
- Final `git diff --check`: **PASS**.

## Exact production continuation recommendation

**Do not deploy the correction yet.** The original roster/scoring synthetic-passage blocker is fixed locally, but this run exposes additional gates that cannot be labeled accepted.

1. Review Q57's legacy reconstructed-unit path and the listed intent/evidence/year gaps. Apply a bounded local correction only under the reviewed scope: extend exact excerpt representation to rating-date selection, retain scope as metadata, preserve the existing citation validator, and never permit the new runner to dispatch non-exact source text.
2. Verify complete official source coverage for match score entry and general Season DUPR definitions/timing before attributing gaps to production. Resolve the unscoped Picklebreaker mechanics and Q11 clarification expectations. Do not create an Approved Answer or reprocess corpus merely to fill the fixture.
3. Address explicit year preservation generically from official date source metadata. Rerun the failed/affected cases through the existing authorized OpenAI path, then the full routing/fidelity/security regressions. Require all quality gates before recommending deployment; do not repeatedly sample merely to find a passing answer.
4. Return the corrected local results for review. Only with separate production approval, deploy the reviewed application once at **0.1.547** to the existing Vercel project and verify both normal and View-As aliases. **No SQL is required by the current correction; do not reapply migration 20260908123627.**
5. Begin controlled production acceptance with the exact roster blocker once, then the complete 63-case and previously deferred privacy, feedback/history, deterministic Live, desktop/mobile/accessibility and LMS-0723/LMS-0724 security/maintenance gates. Stop on failure. Mark accepted only after every gate passes.
6. Start the mandatory View-As UI parity/obsolete-interface cleanup only after LMS-0725 production acceptance. It remains deferred.
