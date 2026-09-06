# LMS-0721 / 0.1.543 — Scheduling formal-applicability and binding diagnosis

Diagnosis only, 2026-09-06. LMS-0721 remains **NOT production accepted**. No application, SQL, threshold, embedding, binding, policy, Stage 7 or production change. Revision 1 remains Active. The approved local existing-evidence confirmation copy is preserved and undeployed.

## 1. Exact variant and deterministic divergence

Raw and effective question: **Can we reschedule our match?** No guard, question rewrite or scheduling-specific detected intent. The existing replay returned Match Scheduling Changes revision 1 (`a9880b0e-da01-4692-aedf-020f07b22bf7`) at managed rank 1, cosine **.6849218610**, above **.65**. Compatibility, scope, dates and authority eligibility pass. **It is an eligible candidate, not a selected Approved Answer.**

Formal authority-review window from the accepted replay:

| Rank | Stored rule | Score | Disposition |
|---:|---|---:|---|
| 1 | 5.13 | .5507 | Interrupted-match rules: generic literal applicability fails |
| 2 | 5.10 container, containing 5.11 | .4723 | Above .35; 5.11 fails literal applicability |
| 3 | 6.1.9.5, also containing 6.1.9.6 | .3698 | Both forfeiture/weather passages selected |
| 4 | 6.1.8 | .3244 | Below formal .35 threshold |
| 5 | 6.2.6 | .3005 | Below threshold |
| 6 | 6.1.7 | .2911 | Below threshold |
| 7 | 6.3.8 | .2864 | Below threshold |
| 8 | 6.2.7 | .2806 | Below threshold |
| 9 | USAP 16.M | .2606 | Below threshold |
| 10 | USAP 18.F.2 | .2588 | Below threshold |
| 11 | 5.4 | .2547 | Below threshold |
| 12 | USAP 15.D | .2470 | Below threshold |

These are the saved top-12 authority-review candidates, not a claim to enumerate every row returned by Stage 3. No repeat embedding/search experiment was needed.

The exact rejection branch is `chooseApprovedEvidence` in `app/lib/aiApprovedAnswersSelection.js`: when `formal.length > 0`, a managed supplement requires an already-selected non-USAP formal source whose `chunkId === revision.related_chunk_id`, no discrepancy, and capacity below four sources. Here selected chunk `564f30d1-eab3-4c31-9035-d54b1fa60811` is not related chunk `01444d6d-44da-4fd9-8069-e7fe1e117e28`. Thus `complementary` is undefined and the function returns the existing formal evidence alone. It does not fall through to managed-only selection.

Stage 4 output is the Weekday 9.1 forfeiture/weather text, not 5.11 and not the Approved Answer. This establishes a wrong-evidence/binding failure, **not a proven insufficient-evidence response for this exact wording**. The prior replay stopped before source resolution and generation. Current `generateOfficialAnswer` would continue toward formal-only generation because evidence is nonempty; its actual generated final kind/content is unmeasured. No answer-model call was made in this diagnosis. The separately observed production `insufficient_evidence` belongs to **Can we move our match to another day?**

## 2. Canonical comparison: success was not a formal binding success

For **As a captain, can I change our scheduled match date or time?**, managed rank 1 is .8175631434. No formal evidence survives. Rule 5.11 is absent from the saved top-12 authority window; independently testing the exact bound passage also fails its generic applicability predicate.

With `formal.length === 0`, the selector uses its eligible managed-only fallback. `managedCandidate` supplies the approved prose and immutable revision identity; it does not supply `related_passage` as a separate formal evidence item. The viewer's trusted relationship is not a generation-time join. Therefore the premise that canonical wording successfully binds both halves is incorrect: it succeeds **without selecting the formal half**. Its historical grounded production answer and Helpful provenance remain valid observations, but do not prove formal-plus-supplement selection.

Both questions have no dedicated scheduling intent and use generic issue coverage. The decisive differences are formal-window availability, literal passage fit, and empty versus nonempty formal selection. Canonical generation includes the managed `supported` check; this variant's formal-only path does not use that managed-specific check.

## 3. Exact Rule 5.11 predicates

`aiQuestionApplicability.js` uses `operationWords`, a limited `conceptWords` map, a framing-word set, and `genericApplicablePassages`. The latter requires:

1. `leagueCompatible`;
2. at least one non-framing question token;
3. **every** such token present in one constructed passage;
4. an operative verb/fact marker, such as `may`, `must`, `recorded` or `is`.

`operationWords` normalizes adding/updating/removing/entering/deleting/changing inflections. It does not stem scheduling or rescheduling. The concept map has no schedule-change, move-date/time or earlier-play concept. `match`, `we`, `our`, `play`, `another` are framing words; `reschedule` remains substantive. In an isolated invocation of the actual local functions against the exact bound production passage:

| Question shorthand | Required tokens | Missing in 5.11 |
|---|---|---|
| Canonical | as, captain, change, scheduled, date, time | as, change, scheduled |
| Move another day | move, day | move |
| Both captains agree earlier | both, captains, agree, earlier | captains, earlier |
| Earlier in the week | earlier, week | earlier |
| Change scheduled time | change, scheduled, time | change, scheduled |
| Reschedule | reschedule | reschedule |
| Change date | change, date | change |

All seven return zero applicable 5.11 passages. This is measured predicate behavior, not a proposed synonym implementation. The source has singular `Captain` in its exception and `coaches` in its permission; the matcher does not normalize `captains` to either. Date/time/week are not required scheduling slots: they matter only when literally present in the question. This is an unrecognized concept falling back to overstrict token conjunction.

For the exact passing-score variant, 5.11 and 5.13 contain **rescheduled**, while 6.1.9.5/6 contain **reschedule**. The generic check also does not distinguish permission to change a schedule from the consequences of being unable to reschedule. `leagueCompatible` returns true when no league is named. Both the morphological false negative and the scoped enforcement false positive are therefore established. Simply stemming `reschedule` would admit more passages without solving applicability.

## 4. Trusted relationship: what it does and does not do

Current `approvedBoundSource` revalidates retained chunk/version and `validateManagedPassage` against the exact passage/rule identity; `current:true` additionally verifies active document/version and searchable chunk. This is used for management/public source workflows. Answer selection does not call it to add authority candidates.

The generation-time complementary gate compares **chunk identity**, not exact bound passage identity. Even selecting another sibling within the same chunk could satisfy that equality today. The proposed correction should strengthen this to an independently applicable, validated bound passage; removing the equality check would weaken the design.

The binding may safely nominate a bounded candidate for examination. It may not establish relevance, permission or governing status. Eligibility and cosine similarity are not independent topic proof: `managedQuestionCompatible` passed all seven negative controls in the saved diagnostic, and only tests a limited set of dates/day/numeric compatibility conditions.

## 5. Positive matrix and failure classification

All managed rows rank 1; existing compatibility/eligibility checks pass. “Absent” below means absent from the saved top-12 window, not proven absent from the full corpus or all Stage 3 rows. Direct 5.11 applicability fails for every row even when supplied independently.

| Question | Managed score/gate | 5.11 window rank/score | Current final evidence | Classification |
|---|---|---|---|---|
| As a captain, can I change our scheduled match date or time? | .8176 pass | Absent | Revision 1 alone | Successful fallback; latent formal gap |
| Can we move our match to another day? | .6147 fail | 1 / .4155 | None | Both recall and formal applicability |
| Can both captains agree to play earlier? | .6122 fail | Absent | None | Recall plus formal availability/applicability |
| Can we play our match earlier in the week? | .5612 fail | Absent | None | Recall plus formal availability/applicability |
| Can we change our scheduled match time? | .7410 pass | Absent | Revision 1 alone | Selected fallback; latent formal gap |
| Can we reschedule our match? | .6849 pass | 2 / .4723 | 6.1.9.5/6 only | Formal applicability and consequent binding failure |
| Can we change the date of our match? | .7026 pass | Absent | Revision 1 alone | Selected fallback; latent formal gap |

This is **C: both depending on wording**, not just threshold tuning. Existing “compatible=true” must not be reported as a validated semantic topic classifier. Under the recommended independent concept design all seven express the policy topic; that prospective result requires implementation tests. “Both captains … earlier” must require its agreement/play/temporal context, not generic `earlier` alone.

## 6. Negative controls

| Question | Saved managed score | Current exclusion | Required preserved boundary |
|---|---:|---|---|
| When is my next match? | .4562 | Guard before retrieval | Live schedule lookup |
| Who do we play next? | .2946 | Guard before retrieval | Live opponent lookup |
| What time is my match? | .4890 | Guard before retrieval | Live schedule lookup |
| Can I change my lineup? | .5179 | Below .65 | Lineup/Match Setup, not match date/time |
| Can I change teams? | .4580 | Below .65 | Membership/roster, not schedule change |
| When do scores have to be entered? | .3080 | Below .65 | Score deadline/procedure; no change-notification supplement |
| Can playoffs be rescheduled? | .5317 | Below .65 | Distinct event/makeup scope; no general scheduling permission |

The first three scores were prior local counterfactual measurements; they are not production retrieval after a guard. No new guard bypass occurred. Preserving exclusion of this Approved Answer does not certify every unrelated formal answer: the earlier replay also selected questionable formal evidence for “change teams.” That is not fixed here.

## 7. Smallest generic correction for approval

Keep .65 unchanged. Introduce a bounded question-to-policy applicability result, shared with formal selection, for the supported scheduling-change concept. Recognize operation plus object/context: changing an existing match's date/time, rescheduling, or temporal movement of agreed play. Exclude live lookups, player/team changes, result entry, interrupted-match consequences and different competition scopes. Treat insufficiently specified objects as unproven. Do not use a list of the seven sentences or any item/rule ID as routing logic.

For a candidate already passing managed retrieval and eligibility:

1. Establish the question's issue independently from the query/context, and match that issue to the approved policy's canonical topic and operative content. A retrieved candidate or free-form topic key alone is not proof.
2. Reuse a bound chunk already in the authority pool; otherwise fetch only the candidate's exact bound source through a bounded, current-authority validation path. Do not rescore or invent a document cosine score for this provenance lookup.
3. Independently test the exact formal passage's **operative proposition** against the question: permission/procedure for date/time changes, not an incidental occurrence of `reschedule`. Preserve scope and conditions. A supported concept can qualify an exact-identity candidate outside the ordinary semantic window, but that must be an explicit, separately tested authority-candidate path, not a global Stage 3 threshold bypass.
4. Select the applicable formal passage first. Add the managed revision only when it contributes the approved operational clarification, matches the validated passage rather than merely its container, and passes all existing conflict/eligibility/ambiguity/source-count checks. Unrelated selected evidence must not become either a blocker or a reason to add a supplement; correct its applicability first.
5. If independent topic or binding validation is inconclusive, do not admit that linked supplement through this recovery path. Preserve legitimate unlinked managed knowledge behavior.

The orchestration generalizes to future linked supplements; individual topic recognizers need supported concepts and negative tests. Do not claim a scheduling recognizer makes arbitrary future policies semantically safe. Unknown topics remain conservative. No automatic “retrieved Approved Answer → linked Rule applies” inference.

## 8. Authority, conditions and flex safety

Read-only production source checks reconfirmed the following:

- Rule 5.11, page 5, says **both coaches agree**, a different time the same day or another day **within the same week**; all scores by **Sunday midnight**. If weather/unforeseen circumstances prevent that deadline, the Home Captain must notify the public club email before Sunday midnight with the rescheduled date/time; failure may result in forfeiture. The approved supplement uses captains and requires notification for every agreed change. Do not silently edit either source.
- Rule 5.12, page 5: “All makeup games must be played at least one week before the playoffs/championship date.” This is a deadline before those events, not blanket permission to move the events themselves.
- Rule 5.13, page 6, governs play already interrupted and retains original players/positions. It must not replace the general schedule-change rule.
- Rule 6.1.9, page 8, under Weekday Men's/Women's 9.1, initially schedules Fridays at noon and permits captains to modify day/time within seven days. Prior authority review also located the LMS Captains Guide's page-10 editing instructions explicitly conditioned on a flex league.

Permission questions need not repeat the rule's conditions before the rule can apply; the answer must state the applicable qualifications. Conversely, “without agreement,” “next week,” playoff/makeup and flex-editing questions require their restrictions, not an unconditional Yes. When makeup timing is material, retain independently applicable 5.12 evidence through bounded structural context/authority review; never assume 5.11's binding also binds 5.12. Do not expand all-league permission into flex-league LMS editing capability. No changes to PDF processing are needed.

Consistent supplement plus 5.11 should produce no Authority Warning. Preserve `meaningfulDiscrepancy`, its aligned-statement permission/value checks and safe warning identities. Do not suppress a conflict because a relationship exists. A changed authority manifest already makes the revision ineligible; retain that behavior. Current discrepancy detection is heuristic, so no claim that every future contradiction is detected automatically. Test actual contradiction and stale-authority cases; if broader warning coverage is needed, report separately rather than weakening it.

## 9. Recall remains deferred

Fixing formal applicability/binding alone will not make .6147, .6122 or .5612 pass .65. They may gain a formal answer, but will still miss the supplemental notification requirement. A separate bounded recall evaluation is therefore still needed for complete variant acceptance. No new floor is recommended from this small sample.

Conditional consideration is feasible in principle when the **ordinary formal path**, independent of the low-score candidate and its link, establishes the same issue and applicable rule. A low-score candidate may then be checked for a genuinely complementary contribution. Do not let that candidate nominate the very rule used to validate its below-threshold relevance. Where formal evidence is absent from the ordinary window, that independent prerequisite is not yet demonstrated. Track candidate origin explicitly in request-local diagnostics; no persistent schema field is necessary for that distinction.

## 10. Performance, schema and implementation boundary

This diagnosis used saved scores, actual local predicate calls, and narrow read-only production source/hash checks: **zero new embeddings, zero answer-model calls, zero capture events**. The earlier 60–148 ms managed RPC intervals remain historical local-to-production observations, not a new hosting benchmark.

Proposed formal correction retains one query embedding, one top-four managed search and one generation call. It adds bounded local applicability work and, only if needed, an exact-source read. Batch missing source/version metadata rather than calling a multi-read helper serially for every candidate; cap candidate count and bytes, preserve timeouts and fail-open request behavior. Include any required adjacent restriction within that same bounded read plan. No measured latency claim can be made before implementation. Do not add a second model or query-expansion call.

No schema, migration, vector index or embedding regeneration is required. Existing immutable passage, rule identity, chunk/version relationship and manifest support this design. Likely app files after approval: `aiQuestionApplicability.js`, `aiAnswerGeneration.js`, `aiApprovedAnswersSelection.js`, and the server-side retrieval/source service wiring needed for bounded source validation. Keep managed RPC/SQL, Stage 7, HMAC, active revision, corpus and player UI unchanged.

## 11. Continuation and verification

Stop for review. If approved, implement formal applicability and exact-passage supplemental combination first, at .65, with production-format positive/negative fixtures, parent/sibling mismatch, unrelated linked source, missing/current/stale binding, consistent and contradictory supplements, flex/playoff/deadline restrictions, and a second supplemental-policy fixture. A high managed score must not rescue an independently wrong topic. Run the existing full suite and required validation. Reassess the three below-threshold variants separately before any recall approval or deployment.

Revision lifecycle acceptance remains paused: no revision 2, retirement or repeat feedback. Preserve canonical success, failed move-question occurrence, Helpful event, public email and historical provenance. The read-only full revision hash still equals `5a4005dfc42b6a5e64bb76dc2f67f669`, including stored embedding and binding. This pass made no production writes and did not modify the pending UI copy. No tests/build were rerun for application changes because none were made; the actual predicate diagnostic passed and documentation diff was checked.

Evidence: current selector/applicability/generation/service code; `lms-0721-natural-variant-replay.json`; accepted `lms-0721-natural-variant-diagnosis.md`; prior scheduling authority review in the implementation report; narrow production source checks in this pass. No final generated response is manufactured for an unrun replay.
