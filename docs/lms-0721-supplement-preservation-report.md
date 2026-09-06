# LMS-0721 / 0.1.543 — Grounded supplement preservation and citation headings

## Diagnosis before correction

The preceding deployed result (`a3e4923`, outcome `d9016ce3-4d36-4c91-8ec8-0d02fc9c18f7`) already selected both sources for **Can we reschedule our match?** Retrieval, .65, scheduling applicability and source binding were not redesigned in this correction.

The local-equivalent model handoff contains these two complete evidence texts:

**Formal:** LWR Pickleball Club DUPR League Rules, Rule 5.11, page 5, authority rank 1, `lwr_controlling`, role `Primary / controlling`:

```text
5.11. Rescheduling & Score Submission Deadlines: If both coaches agree, games may be
rescheduled to a diƯerent time on the same day or to another day within the same week.
However, all game scores must be submitted by the end of Sunday of the same week by
midnight. If this deadline cannot be met due to weather conditions or other unforeseen
circumstances, the Home Captain must notify info@lwrpickleballclub.com before
Sunday at midnight with the rescheduled date and time. Failure to do so may result in
forfeiture of the games.
```

**Managed:** Match Scheduling Changes, exact Active revision 1, `lwr_approved_answer`, previously labelled only `Approved static LWR knowledge`, no numeric authority rank:

```text
Yes. Under Rule 5.11, captains may mutually agree to reschedule a match to another time that day or to another day within the same week, subject to the Rule's scheduling and score-reporting requirements. Whenever captains agree to change a scheduled match date or time, they must also notify League Management at info@lwrpickleballclub.com of the new date and time.
```

The previous prompt said to use only supplied official evidence, preserve requirements, and not weaken governing rules. It also said **Keep it concise**, **Do not summarize every supplied chunk**, and **Do not treat complementary detail as a conflict**. It did **not** identify a mandatory supplemental material contribution or explain that governing priority cannot erase a consistent additional obligation. The managed `supported` boolean checked grounding, not explicit preservation of a selected supplement.

This establishes **B: insufficient supplemental-role/contract representation**, with **C: an authority/brevity instruction ambiguity**. It is not missing evidence text (A): both complete texts reached the equivalent handoff. The original provider response was not retained (`store:false` and lightweight grounded telemetry), so its precise structured JSON and internal model reasoning cannot be reconstructed. The known final rendering is preserved in the preceding report. Postprocessing parses `answer/conflict/supported`, checks source currency, strips a Sources/Citations appendix, normalizes whitespace and applies a 6,000-character limit; it does not select formal prose over managed prose. The current regression proves the public email and full obligation survive this path. No unobserved original raw response is claimed.

## Material contribution contract

The existing complementary-selection branch now marks its already eligible, consistent managed item with `materialSupplement:true` and **Supplemental official LWR knowledge — materially selected**. Managed-only fallback and rejected/conflicting candidates do not receive this flag. Selection criteria, evidence count, authority checks, Active/date/scope gates and .65 remain unchanged.

`aiSupplementContract.js` adds trusted evidence metadata and a generation instruction requiring all distinct material policy contributions from each marked source to survive, with their triggering conditions and scope. Formal priority prohibits contradiction/override; it does not permit discarding consistent additional obligations. Concision merges redundant facts once. The exact approved content remains the evidence; no scheduling/email/rule-number/notification-specific output logic or generated alias was introduced.

No deterministic sentence subtraction is used: lexical difference cannot safely determine semantic redundancy or isolate a policy delta. The bounded signal is the selected complementary role plus the complete immutable approved content. The model is instructed to express that contribution, not choose whether it may ignore the selected source. Existing supported/conflict handling remains. This is a prompt/evidence contract backed by real generation checks, not a claim that deterministic code can prove all semantic completeness for every future model output.

Conflict behavior is preserved: contradictory supplement is withheld, formal evidence reaches generation, and the manager Authority Warning remains. A redundant supplement may still be selected by existing architecture, but generation merges it without repetition. Current selection admits **at most one managed supplement**, so no multi-item retrieval/selection expansion was made; the contract is phrased per marked source for bounded future use.

## Citation heading diagnosis and correction

Read-only production metadata confirms the broad chunk stores **rule_number 5.10**, **heading Video Recording**, **section_label Rule 5.10**, page 5. Video Recording belongs to neighboring 5.10, not 5.11. The saved related passage/identity correctly bind the complete 5.11 provision; the helper derives its scheduling heading. Previously `resolveOfficialSources` revalidated the specific rule identity but unconditionally copied `citedChunk.heading`, leaking the sibling heading into Official Sources.

`trustedPassageHeading` now derives a specific heading only from a verified structural `number. Heading:` label in the selected trusted provision. For unheaded provisions it uses a truthful ancestor heading/section; a section label naming an unrelated sibling is rejected. Existing unnumbered guide headings are preserved. It reuses exact managed passage validation and trusted identity checks, never model text or unverified retrieval labels. The validated heading is supplied consistently to the citation and generation handoff. Historical Stage 7 snapshots are not rewritten; no PDF/corpus repair is performed.

Production-format heading controls cover 5.11, adjacent 5.10 Video Recording, 3.5, 4.5, 5.5 and the 5.7 parent family. The unheaded sibling/forged heading control checks a truthful parent fallback and omission of an unrelated numbered section label.

## Configured-model replay (before deployment)

Six local generation calls used the existing configured model: one with current official scheduling evidence, five with explicitly synthetic review-policy controls. No production Ask/capture route was invoked. No embedding API calls, corpus changes, policy writes or synthetic production records. Raw structured response text, exact evidence, prompt instructions and sanitized results are in `lms-0721-supplement-model-replay.json`; no credentials, raw vectors or signed URLs are retained.

| Case | Observed generated result | Warning |
|---|---|---|
| Official scheduling | Mutual agreement + same-day/same-week + general Management notification/public email + Sunday deadline/exception | 0 |
| Synthetic governing X + supplemental Y | Permission to request review **and every request requires a written summary** | 0 |
| Formal-only | Formal permission alone | 0 |
| Approved-only | Approved permission and written-summary requirement | 0 |
| Redundant supplement | Permission stated once | 0 |
| Contradictory supplement | Formal permission only; contradictory managed text not supplied | 1 |

Scheduling replay structured response was `conflict:false`, `supported:true`. It included: **They must notify League Management at info@lwrpickleballclub.com of the new date and time.** The separate deadline-exception obligation followed without narrowing this general obligation. Source citation: **LWR Pickleball Club DUPR League Rules — Rule 5.11 — Rescheduling & Score Submission Deadlines — Page 5**, plus Match Scheduling Changes.

Scheduling replay generation took 3,036ms, full local call 3,862ms. The generic controls took 1,136–3,353ms generation. These are observations, not latency guarantees. Production retains one normal model call; contract metadata adds prompt tokens, not another embedding/model request.

## Validation and files

15 new tests bring the full suite to **514 passing**. Coverage includes role provenance, conflict, redundancy, current one-supplement capacity, formal/managed/combined generation handoffs and structured-output preservation, and the seven heading/forgery cases. An initial test harness tried to mutate frozen evidence and was corrected to replace the test evidence object; it was not an application failure. Lint has the same six existing warnings; nonincremental TypeScript and PDF server-bundle checks pass. Normal build compiles then hits the known `.next/cache/.tsbuildinfo` lock; the isolated clean production build completes TypeScript and all 74 pages. Final diff check is required before push.

Application files changed:

- `lwrpc-admin/app/lib/aiApprovedAnswersSelection.js` — trusted complementary role only.
- `lwrpc-admin/app/lib/aiSupplementContract.js` — generic material-preservation instruction/metadata.
- `lwrpc-admin/app/lib/aiAnswerGeneration.js` — contract handoff and trusted heading presentation.
- `lwrpc-admin/app/lib/aiApprovedSourceBinding.js` — selected-provision heading derivation.
- `lwrpc-admin/test/aiSupplementContract.test.mjs` — 15 regressions.

Documentation: this report, sanitized configured-model replay, implementation report and roadmap; previous production stop documentation remains historical. The previously approved manager explanation already shipped and is preserved.

Read-only preservation: revision 1 remains Active, one revision total, full row hash `5a4005dfc42b6a5e64bb76dc2f67f669`; two managed audit events; 17 feedback events. No SQL, schema, embeddings, corpus, HMAC, threshold, Stage 7 semantics or revision lifecycle change. LMS-0721 / 0.1.543 remains unchanged.

## Deployment / production gate

After final validation, deploy through the existing Git/main Vercel pipeline, with no migration or environment changes. Run only the required first production reschedule question. Stop on any unmet requirement; if it passes, stop at the separate recall decision as requested. No revision 2 or retirement.

Production result will be appended below. LMS-0721 overall production acceptance remains pending.

### Production retest — PASS; stop at recall decision

Commit **46afdddcae80e950743042bf612223be68478536** deployed through main-branch Git integration. Vercel **dpl_8jGHEUkWjUcEectY5KTN2CQvozX9** is READY and serves `league.lwrpickleballclub.com`. Final normal build compiled in 15.2s before the known cache lock; final isolated build compiled in 10.7s, passed TypeScript and all 74 pages. Final diff check passed.

Only one production Ask request was submitted after deployment: **Can we reschedule our match?**

Exact visible answer:

> Yes. If both coaches/captains agree, you may reschedule the match to a different time on the same day or to another day within the same week.
>
> You must notify League Management at info@lwrpickleballclub.com of the new date and time whenever the scheduled match date or time is changed. Scores must be submitted by Sunday at midnight of that same week. If that deadline cannot be met due to weather or other unforeseen circumstances, the Home Captain must notify that same email before Sunday at midnight with the rescheduled date and time; failure to do so may result in forfeiture.

Official Sources:

1. **LWR Pickleball Club DUPR League Rules — Rule 5.11 — Rescheduling & Score Submission Deadlines — Page 5**.
2. **LWR Pickleball Club Approved Answer — Match Scheduling Changes — Effective 2026-09-06**.

Read-only outcome verification: `de9a47b8-746a-4027-a596-db31c6dd9a44`, completed **2026-09-06 21:52:18.552 UTC**, origin `player_interface`, final kind `answer`, LMS-0721, **two** selected evidence items, feedback eligible, model invoked, **zero Authority Warnings**, total request **4,612ms**. The general supplemental obligation, public email, formal restrictions and correct selected-rule heading are all present. No additional production variants or feedback clicks were performed.

Post-test preservation checks still show revision 1 Active, full row hash `5a4005dfc42b6a5e64bb76dc2f67f669`, one revision, two managed audit events and 17 feedback events. No revision 2, retirement, processing, embedding, schema, HMAC or threshold action. Historical failed outcome/snapshots remain intact. Post-deployment documentation updates are local and do not trigger another deployment.

**Both bounded generation/citation corrections pass this production gate. Stop at the separately authorized recall decision. LMS-0721 overall remains NOT production accepted pending recall/lifecycle acceptance.**

## Frozen recall matrix

| Positive still below .65 | Accepted diagnostic score |
|---|---:|
| Can we move our match to another day? | .6147113 |
| Can both captains agree to play earlier? | .6122496 |
| Can we play our match earlier in the week? | .5612207 |

Negative scores remain .4562 (next match), .2946 (next opponent), .4890 (actual match time), .5179 (lineup), .4580 (teams), .3080 (score entry), .5317 (playoffs). Live lookups stop at guards. Existing scheduling applicability tests reject all seven as managed scheduling supplements even at synthetic .99. No fresh score experiment or negative production requests were necessary in this generation/presentation pass.

Recommendation for later review: retain .65 until a separately authorized recall design is validated. The lowest positive versus highest supplied negative margin is only about .0296; a global threshold reduction is not justified by this small sample. An independently applicable formal-topic signal may support a bounded conditional-recall design, but a low-score managed item must not nominate the source used circularly to validate itself. No recall change is implemented here. Saturday 6.2.2 remains deferred.
