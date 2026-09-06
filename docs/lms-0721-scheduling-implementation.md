# LMS-0721 / 0.1.543 — Scheduling applicability and related-source correction

## Implementation and scope

Implemented the approved formal-applicability/binding correction without changing .65, version, revision 1, SQL, embeddings, corpus, HMAC, Stage 7 or player UI. The independently approved existing-evidence manager confirmation copy is included. Production acceptance of LMS-0721 remains pending the separate recall decision and remaining revision lifecycle.

`aiSchedulingApplicability.js` recognizes bounded reschedule/rescheduled/rescheduling, date/time changes and temporal movement of a match. An operation plus match/game or mutual-captain/play context is required. Live schedule lookup, lineup/team changes, score entry, playoffs, flex editing and interrupted-play enforcement remain separate. No query rewrite/general stemmer or rule/item-ID routing was added.

Both formal applicability entry points use this concept. General scheduling evidence requires an operative mutual-agreement rescheduling permission and temporal bounds; the occurrence of `reschedule` in forfeiture/weather consequences is insufficient. The complete selected provision is retained, including Sunday score deadlines and the exception. Makeup/playoff deadline evidence is considered only for a material makeup-timing question, not appended to ordinary rescheduling. Flex editing evidence requires flex context.

The server helper first checks the independent question/policy concept, existing >=.65 score, Active status, scope, dates and authority manifest. It then performs two bounded reads for at most four exact chunk IDs and their version/document metadata, with a 750ms overall timeout/abort. It requires current searchable general LWR Rules, validates the retained passage and identity through the existing passage binding utility, independently checks the operative scheduling proposition, and selects it as controlling evidence. This recovery conservatively does not promote a source scoped to an unknown league/season. It does not search the corpus, fabricate a document score, re-embed or call another model.

The managed supplement must match the **exact selected passage**, not merely a sibling in the same chunk. Failed revalidation cannot fall through to managed-only selection for this linked scheduling policy. Existing applicable formal evidence remains usable on timeout. The source resolver revalidates the bound identity again before presenting the specific rule citation. Normal source/provenance and generation support checks remain in place. Existing discrepancy checks are preserved; the genuine opposed-permission regression produces a warning and withholds the supplement.

## Positive matrix

Scores are the accepted prior production-backed replay scores, reused without new embedding experiments. Current read-only source validation is recorded in `lms-0721-scheduling-validation.json`. Every question independently detects the scheduling concept.

| Question | Managed score | .65 | Exact related validation | Final local evidence |
|---|---:|---|---|---|
| As a captain, can I change our scheduled match date or time? | .8175631 | Pass | Valid, 169ms | 5.11 + revision 1 |
| Can we move our match to another day? | .6147113 | Fail | Not attempted | Formal 5.11 passage only from ordinary retrieval; stored container identity remains 5.10 before presentation |
| Can both captains agree to play earlier? | .6122496 | Fail | Not attempted | None in saved authority window |
| Can we play our match earlier in the week? | .5612207 | Fail | Not attempted | None in saved authority window |
| Can we change our scheduled match time? | .7409964 | Pass | Valid, 109ms | 5.11 + revision 1 |
| Can we reschedule our match? | .6849219 | Pass | Valid, 109ms | 5.11 + revision 1 |
| Can we change the date of our match? | .7025677 | Pass | Valid, 115ms | 5.11 + revision 1 |

All four combinations have zero deterministic Authority Warnings. Related reads measured 109–169ms local-to-production, median 112ms; not hosting latency. Below-.65 questions perform **zero related-source reads**. No application threshold change or conditional recall has been introduced.

## Negative matrix

| Question | Prior managed score | Boundary verified locally |
|---|---:|---|
| When is my next match? | .4562 | Live-data guard; no scheduling supplement |
| Who do we play next? | .2946 | Live-data guard; no scheduling supplement |
| What time is my match? | .4890 | Live-data guard; no scheduling supplement |
| Can I change my lineup? | .5179 | Different operation/object |
| Can I change teams? | .4580 | Different operation/object |
| When do scores have to be entered? | .3080 | Score-entry issue |
| Can playoffs be rescheduled? | .5317 | Competition scope; general supplement excluded |

All seven exclude the supplement even with synthetic .99 scores. The first three prior scores were local diagnostic counterfactuals, not production guard bypasses. Other formal answer-quality defects are not claimed fixed.

## Diagnostics and tests

Manager Test AI Assistant shows bounded `approvedRelatedEvidence`: detected concept, considered revision/chunk IDs, validation status, trusted rule identity, read count, interval and final combination. No source text, database client, vector or credentials are added. Player serialization remains unchanged; Stage 7 capture code/schema is unchanged.

26 new regressions cover production-format passages and identities, seven positives, seven adversarial negatives, inflection/forfeiture separation, makeup/flex distinctions, sibling/wrong identity, stale source, scope, unsearchable chunk, timeout, current citation revalidation, single embedding/model handoff, private diagnostics, feedback provenance, eligibility and a non-5.11 identity with a genuine contradiction.

Validation: **499 tests passed**; lint passed with six existing warnings; nonincremental TypeScript passed; PDF server-bundle verification passed. Normal build compiled successfully in 15.7s then encountered the known `.next/cache/.tsbuildinfo` EPERM. Isolated clean production build compiled in 12.4s, completed TypeScript and all 74 pages/optimization. `git diff --check` passed. The read-only source verification created no capture, feedback, revision, audit or model events.

## Files

- `lwrpc-admin/app/lib/aiSchedulingApplicability.js` — bounded concepts/propositions.
- `lwrpc-admin/app/lib/aiQuestionApplicability.js`, `aiGoverningSources.js` — formal applicability wiring.
- `lwrpc-admin/app/lib/aiApprovedRelatedEvidence.js` — bounded server revalidation.
- `lwrpc-admin/app/lib/aiApprovedAnswersSelection.js` — policy fit and exact complementary binding.
- `lwrpc-admin/app/lib/aiAnswerGeneration.js` — related-source handoff and citation revalidation.
- `lwrpc-admin/app/ai-assistant/console/page.js` — manager diagnostics.
- `lwrpc-admin/app/ai-assistant/review/ExistingEvidenceDecision.js` — previously approved explanation copy.
- `lwrpc-admin/test/aiSchedulingBinding.test.mjs` — 26 regressions.
- This report, source validation JSON, implementation report and roadmap; preceding accepted diagnosis/replay artifacts are retained as supporting documentation.

## Deployment and continuation

Authorized pipeline: commit/push validated application to the existing main-branch Vercel production pipeline; no migration or environment action. First live question must be `Can we reschedule our match?`; stop if it fails. Only after it passes, test remaining >=.65 variants. Do not test revision replacement/retirement or implement recall yet. Below-.65 positives remain a separate decision: retain .65 until independently grounded conditional-recall precision is demonstrated; no global lowering recommendation from this seven-positive sample.

Production results will be appended after the authorized deployment and tests. Saturday 6.2.2, general source-management activation display and other deferred AI-quality work remain outside scope.
