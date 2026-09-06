# LMS-0721 / 0.1.543 — Natural-variant retrieval diagnosis

Status: diagnosis only, 2026-09-06. No application/SQL/threshold change, deployment, policy mutation, embedding replacement or production Ask interaction. Revision 1 remains Active. The pre-existing local confirmation-copy change is preserved and undeployed.

## Finding

The failing question DOES invoke managed retrieval, and revision 1 IS returned at rank 1. Its cosine score is 0.6147113, below APPROVED_SEMANTIC_MIN=0.65 in chooseApprovedEvidence. It is discarded by the first relevance filter, before scope/date/authority eligibility can admit it. Those independent checks pass. No formal evidence survives Stage 4 either, so no evidence reaches generation and the answer falls back. This is category C (candidate below threshold), with an independent formal applicability weakness—not an invocation, embedding-model, date, scope, or authority failure.

The canonical question scores 0.8175631 and survives the same gate. With no formal evidence selected it enters the eligible managed fallback and supplies the exact approved_answer prose to generation. The live acceptance answer was grounded, cited revision 1, retained public email, and had no Authority Warning. The local replay stops before source URL resolution/model generation; historical live outcomes establish final kinds, not a newly generated replay answer.

## Method and boundaries

Used deployed application modules locally with read-only production source and managed-search RPCs. Each question used one text-embedding-3-small/1536 query embedding shared between document and managed retrieval. Fourteen questions tested: seven positives and seven negatives. The three guarded live questions were deliberately scored ONLY as local counterfactual diagnostics; production would stop before retrieval. No requests passed through capture routes and no new outcomes/cases/feedback were created.

All managed calls completed (one candidate, one RPC, zero additional query embeddings). Local network intervals were 60–148ms, median 63.5ms; these are local-to-production measurements, not hosting latency/SLA. No fallback score-only query was needed. Original query embedding identities are SHA-256 hashes of input strings in the replay JSON; raw query/stored vectors were never printed or retained. Original production query vectors were not stored, so exact historic vector identity cannot be proven; same model/dimensions/current representation are used in this fresh replay. Small score differences (.4154 historical versus .4155 replay document score) are not evidence of a corpus change.

## Canonical and failing traces

Both raw/effective questions remain unchanged, standalone, all scope, no season/context override. Guards are false; interpretation annotations empty. There is no dedicated scheduling-change intent in detectedEvidenceIntents: both fall through to generic applicability, not Match Setup or score entry. Query text is embedded unchanged and the same request-local vector is reused by search_ai_approved_answers.

Canonical: original document Stage 3 top ranks in the fresh replay are USAP 21.A.3 .6333, 21.C.4 .6210, 21.C.10 .6151. Rule 5.11 is absent from the bounded top-12 authority window. No document survives Stage 4. Managed rank 1 .8175631, active/all/standing/effective 2026-09-06/no expiry/current authority manifest, compatibility true. Managed-only selection supplies the full approved prose (shown below). The related Rule is not independently injected into generation; it is preserved as a viewer relationship. Historical canonical answer_id 08baea09-899d-4138-979e-8b5b2f97d4a3 final kind answer and zero Authority Warnings.

Failing variant: document rank 1 is chunk 01444d6d-44da-4fd9-8069-e7fe1e117e28, stored Rule 5.10 container containing Rule 5.11, .4155 in replay (.4154 historical). Ranks 2/3 are USAP 16.M .2407 and LWR 6.1.8 .2325. Stage 3 sufficient; Rule 5.11 is in the authority window. Passage construction separates 5.10 and 5.11. genericApplicablePassages requires all non-framing tokens; the question retains move/day, while the rule says rescheduled/different time/day. No move↔reschedule concept bridge exists. The operative passage therefore fails. Managed rank 1 .6147113 fails .65; compatibility/eligibility otherwise true. Model evidence empty; historical answer_id dd1cda34-b0e6-4531-b4fb-c072746d304f final kind insufficient_evidence remains untouched.

The exact bound 5.11 passage also fails the current generic matcher for all seven supplied positive phrasings. The matcher does not stem reschedule/rescheduled or resolve change date/time and play earlier semantically. Other missing literal terms affect canonical wording. This is distinct from the managed threshold failure.

## Active representation

Activation embeds exactly title + newline + canonical_question + newline + approved_answer. PostgreSQL search_vector indexes those same three fields with English to_tsvector and spaces. It is NOT canonical-question-only. Topic key, league/time scope, effective dates, related rule identity, related passage and public links are not in the embedding/index text; scope/date/manifest are separate eligibility gates. Lexical rank is returned but neither orders the managed SQL query nor contributes to its application threshold. SQL searches Active revisions, orders cosine distance with ID tie-break, returns at most four, and has no SQL score threshold.

Exact embedded text:

```text
Match Scheduling Changes
As a captain, can I change our scheduled match date or time?
Yes. Under Rule 5.11, captains may mutually agree to reschedule a match to another time that day or to another day within the same week, subject to the Rule's scheduling and score-reporting requirements. Whenever captains agree to change a scheduled match date or time, they must also notify League Management at info@lwrpickleballclub.com of the new date and time.
```

Revision a9880b0e-da01-4692-aedf-020f07b22bf7; content hash 91809791df17409722e4baf3034c32cc698e9dc3a9dffbf60ce4ba5204269f83. No raw vector exposed. Read-only full revision hash 5a4005dfc42b6a5e64bb76dc2f67f669 includes embedding/state for preservation checks.

## Measured score matrices

All rows return revision 1 at rank 1 because only one managed revision is Active. Rank therefore says nothing about precision. Compatibility and eligibility pass all rows; these checks alone are not a complete issue-applicability classifier. Guarded rows must never use their counterfactual downstream results in production.

### Positive controls

| Question | Cosine | ≥ .65 | Guard | Downstream managed result |
|---|---:|---|---|---|
| As a captain, can I change our scheduled match date or time? | 0.8176 | True | False | Selected |
| Can we move our match to another day? | 0.6147 | False | False | Below threshold |
| Can both captains agree to play earlier? | 0.6122 | False | False | Below threshold |
| Can we play our match earlier in the week? | 0.5612 | False | False | Below threshold |
| Can we change our scheduled match time? | 0.7410 | True | False | Selected |
| Can we reschedule our match? | 0.6849 | True | False | Excluded (formal binding gate) |
| Can we change the date of our match? | 0.7026 | True | False | Selected |

### Negative controls

| Question | Cosine | ≥ .65 | Guard | Downstream managed result |
|---|---:|---|---|---|
| When is my next match? | 0.4562 | False | True | Protected before retrieval |
| Who do we play next? | 0.2946 | False | True | Protected before retrieval |
| What time is my match? | 0.4890 | False | True | Protected before retrieval |
| Can I change my lineup? | 0.5179 | False | False | Below threshold |
| Can I change teams? | 0.4580 | False | False | Below threshold |
| When do scores have to be entered? | 0.3080 | False | False | Below threshold |
| Can playoffs be rescheduled? | 0.5317 | False | False | Below threshold |

### Deterministic representation comparison (local only)

Two alternative embeddings were created in memory, never stored in a revision: title + canonical question; canonical question + approved answer. Fourteen query embeddings were reused across those two local cosine comparisons. No aliases, hidden generated questions or answer-model calls. Neither alternative fixes all positives at .65.

| Question | Current | Title + question | Question + answer |
|---|---:|---:|---:|
| As a captain, can I change our scheduled match date or time? | 0.8176 | 0.9375 | 0.8413 |
| Can we move our match to another day? | 0.6147 | 0.6555 | 0.6251 |
| Can both captains agree to play earlier? | 0.6122 | 0.6340 | 0.6366 |
| Can we play our match earlier in the week? | 0.5612 | 0.6010 | 0.5690 |
| Can we change our scheduled match time? | 0.7410 | 0.8343 | 0.7341 |
| Can we reschedule our match? | 0.6849 | 0.7277 | 0.6955 |
| Can we change the date of our match? | 0.7026 | 0.7862 | 0.7010 |
| When is my next match? | 0.4562 | 0.4741 | 0.4322 |
| Who do we play next? | 0.2946 | 0.3137 | 0.2991 |
| What time is my match? | 0.4890 | 0.5383 | 0.4682 |
| Can I change my lineup? | 0.5179 | 0.5779 | 0.5182 |
| Can I change teams? | 0.4580 | 0.5204 | 0.4660 |
| When do scores have to be entered? | 0.3080 | 0.2979 | 0.3062 |
| Can playoffs be rescheduled? | 0.5317 | 0.5293 | 0.5415 |

## Threshold and independent applicability analysis

The .65 minimum came from a limited synthetic administrative-policy calibration: provisional .82 failed paraphrases; then positives .6639–.7352, unrelated score question .3849, unsupported duration .6494, and weekday mismatch examples around .799 motivated independent day/duration checks. That sample did not validate this production policy or broad scheduling paraphrases.

Current positive minimum .5612 versus highest supplied negative .5317 leaves only .0296 separation. A hypothetical .55 gate would pass this sample's positive scores and reject its negative scores, but that is a small, policy-specific margin—not approval to lower a global safety gate. It also would NOT fix the formal-combination failure. The local in-memory score-forced counterfactual shows playoffs would become selected if given a high score, because existing managedQuestionCompatible has no playoff/generic-scheduling distinction. This is why score-only admission is not an adequate independent applicability rule. No actual threshold was changed.

Title+question improves the exact failing variant to .6555 but misses earlier/captains and earlier/week at .6340/.6010 and raises the lineup negative to .5779. Question+answer also misses all three failing positives. The current model is not shown fundamentally unsuitable; no model or representation replacement recommended on this evidence.

## Related Rule interaction and secondary divergence

“Can we reschedule our match?” scores .6849 (passes), but selected formal evidence is chunk 564f30d1-eab3-4c31-9035-d54b1fa60811: Weekday 9.1 forfeiture/weather provisions 6.1.9.5/6.1.9.6. It is not the bound Rule 5.11 chunk. chooseApprovedEvidence's formal branch admits supplemental knowledge only if an already-selected formal chunk matches related_chunk_id, so the managed candidate is withheld. The broad formal question also admitted format-specific enforcement evidence. The replay diagnoses selection only; no new model answer was generated.

The intended material evidence for general mutually agreed schedule changes is both the exact applicable formal provision and the approved supplemental notification requirement. Formal evidence establishes same-week/Sunday deadline and exception conditions. Managed evidence adds notice for every agreed change. Neither evidence's retrieval rank alone establishes applicability. An arbitrary co-retrieved formal chunk or a stored relationship alone must not override question fit. Playoff scope and score-entry/lineup changes require their own applicable provisions.

## Smallest generic correction recommended for separate approval

1. Add a bounded scheduling-change concept/applicability check used on the question and trusted selected/bound passages: changing an existing match's date/time versus live schedule lookup, lineup change, team membership, score submission, playoff scheduling, or interrupted-match enforcement. Handle ordinary verb/morphology equivalents as concepts, not the supplied sentence list. Preserve scope/conditions and reject ambiguity. This can fix the literal reschedule/rescheduled false negative and prevent tangential forfeiture evidence from qualifying merely on that term. Do not tie it to Rule 5.11 or this item ID.
2. Keep the existing one query embedding and top-four managed search. Retrieve/revalidate each candidate's bound formal passage through the existing binding machinery, bounded to those candidate IDs and preferably batched. A related-source topic signal may support a candidate ONLY when the question, exact passage and supplemental policy independently align. Reuse existing document candidates when present; when absent, use exact revision-bound current formal lookup, never substitute a different version.
3. Evaluate a conditional lower recall band only AFTER that independent applicability path is implemented and adversarially validated. The measured .55 band is a candidate for testing, not a production threshold recommendation. Keep .65 default for other policies; do not grant governing status merely for clearing either score. If constrained semantic recovery cannot achieve sufficient precision, retain abstention and report. No regeneration of Active revision 1 is necessary for this approach.
4. Qualify and select formal evidence first, then add the materially complementary managed policy, with existing scope/date/manifest/conflict/warning/ambiguity limits. Test the case where unrelated formal evidence previously blocked a valid supplement. Do not simply append a bound source without its own applicability validation or relax the formal-match gate globally.

This generalizes through trusted policy/source relationships and scheduling concepts, not hidden canonical aliases, synthetic questions or hardcoded rule-number routing. The exact final implementation/conditional floor requires review; diagnosis does not prove an unimplemented classifier safe.

## Performance / schema / files

Today: one original question embedding, document RPC, then one bounded managed RPC. Managed SQL statement timeout 450ms and app wait 500ms; no extra answer-model call. Additional managed ranking is cosine over Active rows, limit four (no separate vector-index change recommended).

Proposed path: zero extra query embeddings/model calls, same managed vector query; at most a bounded batched exact-related-source read if the document pool lacks the bound chunk. Existing approvedBoundSource performs multiple metadata checks, so benchmark rather than claim zero-cost lookup. CPU applicability should be small; preserve budgets/fail-open behavior. Schema/migration not required for the primary recommendation. An eventual representation replacement would need a separate active-embedding/revision policy decision, and is not recommended here.

Likely implementation files after approval: aiApprovedAnswersSelection.js (independent fit/conditional candidate policy), aiQuestionApplicability.js and aiAnswerGeneration.js (bounded formal passage fit/material selection), aiApprovedAnswersService.js/aiRetrieval.js as needed for bounded source lookup, their tests and reports. ExistingEvidenceDecision.js already has approved undeployed copy; preserve for the next corrected deployment. No Stage 3 SQL, HMAC, schema, corpus, document embeddings, capture or player-layout changes proposed.

## Regression / acceptance plan

Retain these production-format score/representation fixtures and all existing tests. Cover the seven positives plus lexical/morphological paraphrases, all negatives, explicit playoffs, team/lineup changes, after-deadline/outside-week exceptions, no mutual agreement, wrong league/season/date, stale source/manifest, expired/retired/Draft knowledge, near-ties, unrelated or contradictory related source, and a second future policy unrelated to scheduling. Test both straight/curly policy privacy and public email. Verify formal+supplement selected for their separate contributions; no generic match/change/time admission. Verify source binding, exact revision viewer and feedback/Stage 7 provenance, no false warning and real contradictory-policy warning in isolation.

Run full existing validation. Only after correction approval and passing tests deploy the same LMS-0721 version with pending UX copy. Resume failed natural variant without editing revision 1; verify remaining variants, then the already-approved wording-only replacement, historical citation, retirement and LMS-0720 sanity. Do not repeat passed Saturday decision. Saturday 6.2.2 remains a separate future AI/Retrieval Review item. Preserve failed occurrence dd1cda34-b0e6-4531-b4fb-c072746d304f. No Live LMS Intelligence.

## Final state

LMS-0721 / 0.1.543 remains NOT production accepted. Revision 1 remains Active with two managed audit events and unchanged content/binding. No production interaction, write, embedding replacement, deployment or source change during diagnosis. Post-decision copy remains locally modified and undeployed. Stop for review before implementing the recommended correction.
