# LMS-0721 / 0.1.543 — Conditional managed-knowledge recall diagnosis

Diagnosis completed 2026-09-06 against the current production corpus and deployed application commit `46afdddcae80e950743042bf612223be68478536`. **Diagnosis/design only. NOT production accepted.** Global managed threshold `.65` remains unchanged; revision lifecycle remains paused.

## Decision

**Do not implement conditional recall as the solution to these three failures yet.** Independent exact Rule 5.11 corroboration succeeds for only one of three positives. The other two do not retrieve the bound rule anywhere in the normal 32-candidate pool. Lowering a managed consideration floor cannot supply independent formal evidence that is absent. Loading the missing rule through that same managed candidate's binding would be circular.

The proposed architecture is defensible as a supplemental-only consideration gate, but this matrix does not establish a defensible numeric floor or complete the requested recall objective. A separately authorized diagnosis of the normal formal recall for the two earlier-play questions is needed before implementation approval. No retrieval correction is made here.

## Method and evidence

Ran the current `retrieveOfficialEvidence` and `selectAnswerEvidenceWithAssistance` modules against production, with the original question, `askAbout: all`, and player role. Guards ran first. Seven unprotected questions produced seven normal formal RPC calls and seven original-query embeddings; three protected questions caused neither retrieval nor embeddings. Interpretation annotations were empty; no assisted query occurred. No managed search, related-source preparation/insertion, answer model, Ask endpoint, capture, or feedback operation ran.

Full 32-candidate lists for each retrieved question, document/version/chunk identities, ranks/scores, official text, exact selected passages and available applicability diagnostics are retained in [formal replay](lms-0721-conditional-recall-replay.json). The results are formal-selection observations, not generated production answers. Managed scores below are the previously recorded scores, deliberately not rerun. Current formal scores are fresh; e.g. move now `.4174` versus the earlier approximately `.4155`. They are different score systems and must not be compared as a common scale.

Normal limits remain 32 retrieved candidates, 12 authority-review candidates, 8 initial evidence candidates, `.35` evidence threshold and 4 selected sources. A candidate merely appearing in the 32-row pool does not mean it reaches Stage 4 or independently applies.

## 1. Positive independent formal matrix

Raw and effective questions are identical. All three pass the live-data guard and detect `match_schedule_change`. All have a top Stage 3 score above `.35`.

| Question | Prior managed score | Rule 5.11 current rank / score | Independent formal outcome |
| --- | ---: | --- | --- |
| Can we move our match to another day? | .6147 | 1 / .4174; inside authority window | Exact 5.11 passage selected; all-league compatibility passes; exact stored managed binding equals selected content. Yes. |
| Can both captains agree to play earlier? | .6122 | Absent from all 32 candidates; rank/score unavailable | No selected passage. Scheduling concept works, but no independent 5.11 corroboration. Formal-only result is insufficient evidence. |
| Can we play our match earlier in the week? | .5612 | Absent from all 32 candidates; rank/score unavailable | No selected passage. Same limitation; formal-only result is insufficient evidence. |

Leading Stage 3 candidates illustrate why “retrieved something” is not enough:

| Question shorthand | Rank 1 | Rank 2 | Rank 3 |
| --- | --- | --- | --- |
| Move another day | LWR Rules stored 5.10, containing 5.11 (.4174) | USAP 16.M (.2426) | LWR Rules 6.1.8 (.2325) |
| Both captains earlier | LWR Rules 5.13 (.4515) | LWR DUPR Captains Guide (.4495) | LWR DUPR Captains Guide (.4421) |
| Earlier in week | LWR Rules 6.3.10 (.3996) | 2026 Fall League Important Dates (.3978) | LWR Rules 6 (.3961) |

The earlier-play questions therefore have a normal formal recall gap, not a failure to recognize the scheduling-change concept. This bounded replay establishes absence from the returned pool, not an imaginary rank beyond 32 or the exact internal reason for Stage 3 ranking. It does not authorize widening limits or changing SQL.

### Exact selected controlling provision

**LWR Pickleball Club DUPR League Rules — Rule 5.11 — Rescheduling & Score Submission Deadlines — page 5**, current version `c0604ad8-7057-4e63-b6e1-e9389aee2157`, chunk `01444d6d-44da-4fd9-8069-e7fe1e117e28`:

```text
5.11. Rescheduling & Score Submission Deadlines: If both coaches agree, games may be
rescheduled to a diƯerent time on the same day or to another day within the same week.
However, all game scores must be submitted by the end of Sunday of the same week by
midnight. If this deadline cannot be met due to weather conditions or other unforeseen
circumstances, the Home Captain must notify info@lwrpickleballclub.com before
Sunday at midnight with the rescheduled date and time. Failure to do so may result in
forfeiture of the games.
```

This is verbatim stored text, including its PDF extraction character. The parent chunk starts at 5.10 Video Recording; the selector retains only the complete 5.11 passage. Current downstream trusted citation-heading correction supplies the specific identity/heading. A broad parent chunk ID or its Video Recording heading is not the proposed corroboration key.

## 2. Negative independent formal matrix

| Question | Guard / concept | Rule 5.11 rank / score | Selected formal result | Conditional scheduling eligibility |
| --- | --- | --- | --- | --- |
| When is my next match? | Protected | Not queried | Retrieval skipped | Reject before managed recall |
| Who do we play next? | Protected | Not queried | Retrieval skipped | Reject before managed recall |
| What time is my match? | Protected | Not queried | Retrieval skipped | Reject before managed recall |
| Can I change my lineup? | Pass / no scheduling-change concept | Absent in 32 | Captains Guide p7 Lineup Submission, rank4/.4191 | Reject; no exact corroboration or matching policy intent |
| Can I change teams? | Pass / no scheduling-change concept | Absent in 32 | Rules p17 Picklebreaker 1.4 Optional End Change, rank10/.3891 | Reject; unrelated selected passage |
| When do scores have to be entered? | Pass / no scheduling-change concept | 31/.2336, outside authority window | Captains Guide p9 ENTER/VERIFY SCORES, rank2/.5870 | Reject scheduling supplement; 5.11 not independently selected |
| Can playoffs be rescheduled? | Pass / `competition` | 1/.4441, inside authority window | None; general scheduling passage fails competition applicability | Reject; retrieval alone is insufficient |

The last row is also the prior highest managed negative `.5316560481` (rounded `.5317`), not a separate omitted control. Rule 5.11's content addresses score deadlines, but this exact score-entry question's current path does not independently select it; that is distinct from claiming the rule contains no score guidance.

The change-teams selection is visibly tangential, and the lineup/score-entry results should not be interpreted as quality acceptance of those answers. They are observations of the unchanged formal path. No model was called, no unrelated quality fix was made, and conditional recall must not legitimize those passages merely because the formal selector returned them.

## 3. Separation and recall floor

Lowest recorded positive: **.5612207380**. Highest recorded negative: **.5316560481**. Sample gap: **.0295646899**. An inclusive score-only floor above the negative and at or below the lowest positive would separate this small saved matrix numerically, but provides no demonstrated safety margin against unseen policies or alternate phrasings.

After independent exact corroboration, only the `.6147112999` move question remains eligible for consideration. All tested negatives fail an independent guard, concept or exact-selection requirement. Thus corroboration separates that one positive from these negatives, **not all three positives**. There are no qualifying negative examples near a proposed floor and only one qualifying positive; this does not calibrate a safe general conditional band.

**No numeric floor recommended from this evidence.** Do not pick `.55`, `.56`, `.60`, or the observed minimum merely to pass this sample. A future floor must be approved after held-out, independently corroborated positive and adjacent-topic negative testing, including multiple managed policies. It would be a separate finite-score gate `floor <= score < .65`, never a new global managed or document threshold.

## 4. Proposed minimum prerequisites

All conditions must hold; these are design requirements, not implemented behavior:

1. Normal raw/effective live/personal guards and clarification resolution have completed first. Protected or unresolved/ambiguous requests do not enter this path. Raw/effective wording remains unchanged.
2. Freeze the normal formal selection **before any managed related-source helper**. Only this independent set can corroborate low-score candidates. Do not use injected/replaced evidence as a witness.
3. Use only the existing bounded managed RPC result. Candidate must be Active, activated, currently effective/not expired, scope/season compatible, and match the current authority manifest. Stale or unavailable manifest fails closed for the supplement.
4. Candidate must be a supplemental policy with a trusted related passage in a current active/searchable formal source. No standalone managed answer, no stale/historical source, no client-supplied validation flag.
5. Verify source document/version/chunk identity, complete passage text and structural rule identity against the independent selected passage. Exact whole passage must survive within the normal evidence set. Same PDF, parent chunk, partial overlap, sibling rule or matching heading alone fails. No same-policy-family expansion is approved here.
6. Independently check question-to-policy applicability and scope for both the formal provision and supplement. Exact binding alone is insufficient: e.g. a question about Sunday score deadlines must not automatically gain a scheduling-change notification supplement merely because both concern 5.11.
7. Finite managed score must pass a separately approved conditional floor while remaining below `.65`. Normal above-threshold candidates retain the normal path.
8. Candidate must add a relevant, distinct obligation/qualification without weakening or contradicting formal evidence. Redundant content does not justify another source. Preserve the material-supplement contract after selection. The existing complementary branch's matching/non-conflict checks and `materialSupplement` flag are not an exhaustive semantic novelty or contradiction proof; require bounded supported applicability rather than claiming arbitrary prose is deterministically understood.
9. Evaluate all bounded plausible managed candidates for conflicts and material ambiguity before choosing any supplement. Do not use `.find()` or rank alone to settle a collision.
10. Preserve source/content budgets and formal precedence. With four formal sources already selected, omit managed content; never evict a governing source to admit a lower-score supplement. Any validation timeout/failure returns the unchanged formal result.

## 5. Ambiguity and conflict handling

Executed six local synthetic probes against the **unchanged selector**, with real independently selected 5.11 text and two in-memory Active candidate rows. No synthetic database records were created. [Probe results](lms-0721-conditional-recall-ambiguity.json).

At `.6147` and `.6122`, both candidates are correctly excluded by current `.65`, regardless of ordering. To inspect the downstream branch without implementing conditional recall, separately supplied `.660/.659` synthetic scores: the formal-plus-supplement branch chose the first row, and reversing order chose the other. This explicitly labelled above-gate counterfactual demonstrates why simply allowing lower scores into that branch would be unsafe. Partial overlapping text failed exact whole-passage equality. Same rule number did not rescue it.

Recommendation: **abstain from all conditional managed additions when two distinct eligible candidates remain materially plausible**, including different bindings to overlapping independently selected provisions. Keep formal evidence. Do not infer that the larger semantic score settles policy applicability. Exact duplicate RPC rows for the same immutable revision may be deduplicated; different revision/answer identities are not interchangeable. No new `.06` separation heuristic is justified for this path.

Actual contradictory propositions should trigger the existing appropriate conflict/Authority Warning treatment, not silent blending. Distinguish ambiguity (multiple plausible supplements) from demonstrated conflict. Compare each plausible supplement with all applicable governing evidence and with competing supplements before admission; formal authority remains governing. Existing `meaningfulDiscrepancy` is a bounded heuristic, not a guarantee of detecting every natural-language contradiction. Unknown applicability or material ambiguity warrants abstention. Do not add a new model to decide it.

## 6. Standalone and formal-only behavior

An unlinked Approved Answer continues to require normal `.65`. A managed candidate outside the conditional band, stale, invalid, conflicting or ambiguous is omitted. Normal formal evidence can still answer the narrower question; if no formal evidence survives, preserve the existing insufficient-evidence behavior. Do not manufacture managed-only success below `.65`.

Canonical and `Can we reschedule our match?` retain the normal above-threshold path (recorded `.8176` and `.6849`). The already accepted deployed reschedule test is not repeated. A conditional design must not make that pass depend on new corroboration requirements intended only for low-score candidates.

## 7. Performance, schema and likely implementation locations

Expected additional embedding calls: **0**. Answer model calls: **0 additional**. Broad formal retrieval: **0 additional**. Existing managed RPC already returns a bounded top four; its SQL orders by semantic distance without a `.65` SQL cutoff. No SQL threshold/limit change is needed to inspect existing low-score rows.

Compare at most four managed candidates with four selected sources: at most 16 identity/passage checks and six managed pair comparisons. Reuse current validated source metadata/manifest. If existing selected metadata is insufficient to prove a binding, use a bounded exact-ID validation with the current abort discipline, never a broad search. Current related-source helper can perform two exact reads with a 750ms timeout, but its evidence insertion must not establish independent corroboration. Prefer zero added reads when the independent set plus current metadata suffices. Do not claim an unmeasured millisecond latency; benchmark any eventual implementation's success/abstention/timeout paths.

**No schema or migration required** for the proposed exact-passage design: stored related chunk/passage/rule identity and existing immutable revision metadata suffice. Policy-family expansion would require a separate design and approval, not inferred sibling relationships.

Likely future files: `aiAnswerGeneration.js` (retain independent selection), `aiApprovedAnswersSelection.js` (separate consideration and ambiguity gates), `aiApprovedRelatedEvidence.js` (validation without circular insertion), focused test files and reports. Source-binding/shared eligibility helpers should be reused. No Stage 7, player UI, revision data, embeddings, RPC, version or corpus changes proposed. Exact provenance continues through existing normal capture; historical failed occurrences remain untouched.

## 8. Future regression and implementation sequence

Before choosing a floor, obtain independently selected formal evidence for the two failing earlier-play questions through a separately approved diagnosis. Do not turn absent corroboration into a passing conditional test. Expand held-out positives/negatives before calibration.

Then, only with implementation approval:

1. Freeze production-format fixtures with full real passage boundaries, exact bindings and original scores. Test all three positives; explicitly expect abstention for absent corroboration until formal recall is independently resolved.
2. Prove no circular validation: managed-injected 5.11, same PDF, stored parent 5.10, partial overlap, sibling 5.12, stale version/manifest and forged validation flags cannot corroborate.
3. Test exact approved floor, immediately below it, immediately below `.65`, exactly `.65`, non-finite scores; preserve canonical/reschedule normal-path behavior.
4. Preserve all seven negatives, guard-before-network assertions, unrelated team/lineup/score topics, and playoff scope. Include same-rule score-deadline questions and other policy topics that bind the same rule but do not warrant the supplement.
5. Test two distinct candidates linking the same rule and overlapping independently selected provisions, both input orders and unequal scores. Require abstention for material ambiguity; test true contradictions separately. Add low-score conflicting formal/managed and managed/managed cases with warnings and no blending.
6. Test standalone candidates below/at `.65`, Active/date/season/scope/manifest checks, current source validity, redundant versus material supplements, and four-source budget exhaustion.
7. Test unchanged narrower formal answer when supplement is rejected; unchanged insufficient evidence when formal evidence is absent. Preserve supplement-generation/citation controls and exact immutable revision provenance without Stage 7 changes.
8. Assert unchanged query text, candidate limits, zero new embeddings/models/broad retrieval, bounded reads, timeout/fail-open and latency behavior. Run the existing full validation suite only after an implementation is authorized; then controlled production acceptance, followed by separately resumed revision lifecycle.

## Preservation and completion

Read-only production verification confirms revision 1 is still Active, full-row hash `5a4005dfc42b6a5e64bb76dc2f67f669` unchanged, one revision, two managed audit events and 17 feedback events. No production writes, answer-model calls, deployment, source processing, revision changes or version changes occurred. Temporary diagnostic runners were removed; only diagnosis artifacts and status documentation remain.

The requested diagnosis is complete. **Implementation is not recommended as a complete three-variant fix under the current constraints; no defensible floor is selected.** Existing reschedule production success remains accepted, overall LMS-0721 remains NOT production accepted, and lifecycle acceptance stays paused for owner review.
