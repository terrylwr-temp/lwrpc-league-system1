# LMS-0721 / 0.1.543 — Final lifecycle acceptance checkpoint

2026-09-06. Deployed application remains `46afdddcae80e950743042bf612223be68478536`. **NOT PRODUCTION ACCEPTED — stopped at post-retirement citation correctness.** No code change or deployment in this pass.

## Owner decision retained

Global managed threshold `.65` remains unchanged. Conditional recall is not implemented. The three saved scores `.6147`, `.6122`, `.5612` are future semantic-recall research, not lifecycle acceptance blockers. The accepted `Can we reschedule our match?` normal-path control remains valid. Competing supplemental candidate input-order ambiguity is separately deferred; no competing production policy was created.

## Completed production lifecycle

All mutations used the signed-in Commissioner UI and protected application route. Database inspection was read-only. No direct SQL mutations, migrations, reprocessing or manual embedding changes occurred. Normal activation generated the revision-2 embedding through the established application workflow.

Item: Match Scheduling Changes, manager-originated, NULL review-case linkage. Revision 1 `a9880b0e-da01-4692-aedf-020f07b22bf7`; revision 2 `4f633be2-c1d1-4071-a008-151bf717f547`.

| Gate | Result |
| --- | --- |
| 1. Revision-2 Draft | PASS. Edit as New Draft at 22:16:45.465398 UTC; exact approved wording saved at 22:17:05.987403 UTC. No policy rewrite. |
| 2. Draft isolation | PASS. Revision 1 remained Active; revision 2 Draft had no activation timestamp or embedding. A new player answer and its viewer used revision 1. Exact Rule 5.11 binding retained. |
| 3. Replacement activation | PASS. Explicit activation at 22:19:35.671546 UTC. Revision 2 Active and revision 1 retired/replaced at the same transaction timestamp; replacement pointer names revision 2. Exactly one Active revision. Actor retained and displayed in device-local time. |
| 4. Current revision-2 retrieval | PASS. Natural variant uses revision 2 plus governing Rule 5.11, retains Management notification/public email, correct 5.11 heading, zero Authority Warnings. Player-safe viewer displays exact revision 2 and formal relationship. |
| 5. Historical revision 1 | PASS. Original Helpful occurrence opened in Stage 7, fresh cited-document link prepared, exact revision-1 wording and Rule 5.11 relationship displayed with explicit retired/historical banner. No revision-2 substitution. The old direct link had expired normally; historical link regeneration succeeded. |
| 6. Feedback provenance | PASS. One new Helpful event at 22:23:50.869435 UTC references revision 2 and its content hash in both source and selection snapshots. Original Helpful event still references revision 1/hash. No duplicate click/event. |
| 7. Retirement | PASS for lifecycle/state. Explicit retirement at 22:24:23.790465 UTC. Both revisions now retired; zero Active revisions. Actor, time, reason and audit retained. Final historical revision-2 viewer after retirement remains pending at stop; it passed while Active. |
| 8. Post-retirement answer | Retrieval exclusion PASS; citation FAIL. Only formal source used, no retired citation or general every-change managed supplement. Display incorrectly labels the selected 5.11 passage as Rule 5.10. |
| 9. Existing Evidence UX | Exact approved copy is present in current source; this pass stopped before Saturday live post-decision confirmation. No repeated case mutation or Approved Answer created for Saturday. |
| 10. Authority/security | Live authorized manager lifecycle passed. Existing isolated/configured-model authority evidence retained; 28 focused tests rerun successfully, including effective ACLs, immutable history, role/case workflow, conflict warning behavior and binding. Other roles were not impersonated or changed. Final live matrix not expanded after stop. |
| 11. URL/privacy | Current and historical authorized viewers passed; expiring links respected. Isolated structured URL safety passed; prior private-contact/credential/redaction controls retained. No privacy relaxation or secret exposure. |
| 12. LMS-0720 sanity | New Question and Stage 7B review/feedback loading passed live. Additional minimal usin/volly/comunity/medical/protected-typo checks were not run after stop. Prior accepted evidence remains; this is not a claim of a fresh full live matrix. |
| 13. Integrity | Corpus and Saturday occurrence hashes unchanged; older feedback hash unchanged. Immutable content/binding preserved, audit appended, manager origin retained. No fake case or fabricated policy/history. Only three authorized player requests and one feedback interaction in this pass. |
| 14. Deferred limitations | Listed below; do not confuse them with the newly observed citation defect. |
| 15. Final status | NOT production accepted. Stop for review before correction or remaining gates. |

## Exact approved revision-2 text

> Yes. Under Rule 5.11, captains may mutually agree to reschedule a match to another time that day or to another day within the same week, subject to the Rule's scheduling and score-reporting requirements. After both captains agree to a Rule-5.11-compliant schedule change, notify League Management at info@lwrpickleballclub.com of the new match date and time.

Revision-1 content hash remains `91809791df17409722e4baf3034c32cc698e9dc3a9dffbf60ce4ba5204269f83`. Revision-2 content hash is `6339b054ab2982254ad9a7896dfdb800f7d7fe3bf8ede30be8ca3377cb8bbf92`. Both retain the exact same whole Rule 5.11 passage, chunk `01444d6d-44da-4fd9-8069-e7fe1e117e28`, current Rules version `c0604ad8-7057-4e63-b6e1-e9389aee2157`, page 5.

## Recorded player interactions

All three questions were `Can we reschedule our match?`, through the normal player interface.

| Stage | Outcome ID | Completion UTC | Evidence count | Warnings | Total ms |
| --- | --- | --- | ---: | ---: | ---: |
| Revision 2 Draft / revision 1 Active | `3d75356e-e198-45b6-a86f-047a13fac6a8` | 22:17:29.152 | 2 | 0 | 3870 |
| Revision 2 Active | `00a3c391-28dc-4926-a06b-e36994fd0425` | 22:20:19.784 | 2 | 0 | 3457 |
| Both retired | `0b0775c9-66cd-48a0-a330-b6483b667b69` | 22:24:55.456 | 1 | 0 | 2624 |

Revision-2 feedback references the second outcome. Original revision-1 Helpful outcome `08baea09-899d-4138-979e-8b5b2f97d4a3` and event 19:23:03.081149 UTC remain intact.

## Post-retirement blocker and bounded diagnosis

Visible answer:

> Yes—if both coaches agree, games may be rescheduled to a different time on the same day or to another day within the same week.
>
> Scores must be submitted by the end of Sunday of that same week by midnight. If weather or other unforeseen circumstances prevent meeting that deadline, the Home Captain must email info@lwrpickleballclub.com before Sunday at midnight with the rescheduled date and time. Failure to do so may result in forfeiture.

Only Official Source displayed:

`LWR Pickleball Club DUPR League Rules — Rule 5.10 — Rescheduling & Score Submission Deadlines — Page 5`

The narrower formal answer is expected and is not the failure. **The rule number is wrong.** Rule 5.10 is Video Recording; selected scheduling text begins at 5.11.

Code inspection and a local read-only fixture probe explain the difference:

- `aiAnswerGeneration.js` uses `validateManagedPassage` for `boundRelatedPassage` evidence, deriving exact 5.11.
- Without an admitted managed supplement, it uses `trustedSelectedRuleIdentity` in `aiSelectedRuleIdentity.js`.
- That function requires the selected identity to be the stored rule or its descendant; stored 5.10 and selected 5.11 are siblings. It returns fallback 5.10.
- `trustedPassageHeading` independently derives the correct scheduling heading. The combined source label is therefore inconsistent.

Local production-format probe returned stored rule 5.10, selected first line 5.11, ordinary display rule 5.10, heading Rescheduling & Score Submission Deadlines. This was not an application change, a threshold problem or evidence of retired managed retrieval. No correction made. A bounded citation-identity correction and regression authorization is needed before claiming citation acceptance; do not silently broaden retrieval or structural trust.

## Audit and integrity

Managed audit count is seven: original created/activated; revision-2 draft creation/save (`draft_edited` twice for distinct operations); revision-2 activated; revision-1 replaced; revision-2 retired. All have actors. The activation/replacement pair shares the transaction timestamp. Two draft events are normal create-then-save operations, not duplicated activation or feedback.

Full-row corpus aggregate recipe: `md5(string_agg(md5(to_jsonb(row)::text), '' order by id))`. Pre/post and prior accepted checkpoint match:

| Object | Count | Hash |
| --- | ---: | --- |
| Documents | 7 | `0fe745ff877528865886f1d1dd132154` |
| Versions | 20 | `f9e16952cbcfd1e15ccb456365e978ad` |
| Chunks including vectors | 1581 | `3e2c7d5c4b57e8ae165238d020ce1c19` |

Saturday original occurrence full-row hash remains `c849fee5681ac9a777876e09308062e9`. Feedback before the original lifecycle interaction retains aggregate `cb2a34ba555949c2631fb02a8febf1d5`. Total feedback now 18 (17 before this pass plus one authorized revision-2 event). No HMAC/configuration operation, document/chunk mutation, schema/ACL change or Stage 7 rewrite was performed. This bounded integrity check does not claim a newly completed hash audit of every unrelated historical table.

## Validation and pending gates

28 focused existing tests passed across Approved Answers validation, database lifecycle/ACLs/case workflow, service behavior, integration and source binding. Existing 514-test/full-build validation and configured-model authority evidence are preserved; code is unchanged, so no new build was needed. Documentation diff check completed after recording this checkpoint.

Pending: resolve the citation blocker only after approval; then verify historical revision 2 after retirement, live Saturday confirmation UX, remaining minimal sanity and final applicable security/integrity acceptance. Do not recreate or reactivate the retired policy without authorization. No new contradictory policy, synthetic case or production role change is needed.

## Nonblocking future items

- Managed semantic recall: move-another-day `.6147` independently selects 5.11; both-captains-earlier `.6122` and earlier-in-week `.5612` lack it in the current 32 formal candidates. No conditional recall or hidden aliases.
- Competing supplemental ambiguity: deterministic handling instead of input-order selection; isolated future research only.
- PDF/document authoritative activation timestamp/actor display.
- Existing AI/Retrieval defects: Saturday Rule 6.2.2, website Rule 1.1 selection, rally-scoring scope/applicability, kitchen/NVZ equivalence.

No new version started. Current state is **LMS-0721 / 0.1.543 deployed, not production accepted**, with both scheduling revisions retired and historical content preserved.
