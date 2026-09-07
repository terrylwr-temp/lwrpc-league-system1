# LMS-0722 production acceptance — ACCEPTED

Current status: **PRODUCTION ACCEPTED** after the separately authorized correction; see the final acceptance section below. Earlier stop records are historical.

Owner authorized controlled migration/deployment and ordered production gates. Stop immediately on any strict-stop defect; no correction without review.

Preflight: Supabase glikrmmgirilnmamxxyl (LWR PC League Management, ACTIVE_HEALTHY); Vercel lwrpc-admin; current accepted production deployment dpl_4ACBAUDbciy2uqkbx54rArrhPRSZ, commit 38eb7bb721313282f2d3e8eb031b7fa0c79f3aae, LMS-0721. Rules e4d9bf77-e15e-4d80-84ba-2f7259970ba6 active; 6.3.3/6.3.6/summary consistent 15 by 2 Rally; prior versions superseded. Retained historical Approved Answer viewer renders revision 2 and formal 5.11. Current RPC requires active pointer, ready status and searchable chunks. No current source mutation.

Baseline: 7 documents, 22 versions, 1733 chunks, 18 feedback events; 147 outcomes, 46 review occurrences, 33 cases, 45 manager events; 1 Approved Answer, 2 retired revisions, 7 approved events. Production HMAC/key-version entries remain configured, created before this release; no secret value read/printed/changed.

Activation-history migration applied ONCE successfully. New columns/actor FK, invoker functions with search_path=pg_catalog, history trigger and removed actor-less overload verified. service_role execute true; anon/authenticated false; trigger function owner-only. Existing document table ACL/RLS unchanged. All 22 historical timestamps/actors NULL. Hash comparisons confirm all prior version fields, all chunks, approved revisions and feedback unchanged.

Production deployment READY: dpl_Ee6bNaBmritYJ2mUmatP2imDrvda, commit a4be2d7bc79cd8505f22a6c00b29bbef8689e8ad, normal main-branch pipeline. Live site displays LMS-0722 (application 0.1.544). No fake document activation or acceptance feedback created. Live future activation will be an explicit accepted limitation if no legitimate activation occurs.

## Ordered live Ask LWR gates

Each question is submitted through the deployed player Ask LWR panel using New Question between standalone questions.

1. `How many players do I need for the PrimeTime League?` — PASS. 4 players fielded for a match, 2 lines/2 courts; age qualification. Rule 6.3.2, Roster & Courts, page 12. Does not claim a maximum roster size.
2. `How many players do I need for the Saturday League?` — PASS. 12 fielded, 6 men/6 women, 3 men's/3 women's doubles teams; additional mixed-only players allowed; 4 courts. Rule 6.2.2, page 9. Does not impose a twelve-player roster maximum.
3. `How many players do I need for Weekday 9.1?` — PASS. 4 fielded, 2 lines/2 courts. Rule 6.1.9.1, page 8.
4. `How many players do I need for Weekday?` — PASS. 6 fielded, 3 lines/3 courts. Rule 6.1.2, page 7.
5. `What kind of games will be played in the PrimeTime League?` — PASS. Round Robin, 2 of 3 to 11 win by 2; at a 2-2 tie, Picklebreaker to 15 win by 2 Rally. Rules 6.3.3 and 6.3.4, page 12. No Saturday gender/mixed format, 25-point target or hybrid league heading.

6. `What kind of games will be played in the Saturday League?` — PASS. Men's/women's round robin, mixed round; regular games 15 win by 1 Rally; conditional 12-12 Picklebreaker 25 win by 2 Rally. Saturday 6.2.3/6.2.4 and Saturday format table, pages 9–10. No PrimeTime-only format.
7. `What is the PrimeTime match format?` — PASS. Round Robin, 2 of 3 to 11 win by 2; potential Picklebreaker 15 win by 2 Rally. Rule 6.3.3 page 12.
8. `What is the Saturday match format?` — PASS. Saturday gender/mixed rounds, scoped regular-game format and conditional 25-point Picklebreaker; source pages 9–10. No PrimeTime contamination.
9. `How many points is the PrimeTime Picklebreaker played to?` — PASS. 15, win by 2, Rally; Rule 6.3.3 page 12. Generic equal-authority conflict isolated test rerun: 1 passed, both source orders safely skip generation (17-versus-19 fixture, no production mutation).
10. Exact historical Saturday mixed-only question — PASS. Additional players may participate only in the mixed round; Rule 6.2.2 Roster & Courts page 9. No Approved Answer.
11. `What is the website for the club` — PASS. https://lwrpickleballclub.com, Rule 1.1 Club main website page 2; no DUPR website substitution.

12. Exact password-reset question — PASS. Forgot Password on LMS login, membership email, official reset-sender/public support addresses and documented Change Password instructions; Captains LMS Guide page 4 and DUPR Captains Guide page 6. No account lookup/disclosure or password request.
13. Exact Saturday Rules locator — PASS, deterministic document navigation to active Rules 6.2 page 9. Captains Guide sanity correctly clarifies between two active documents. Players Guide, Important Dates and USAP Rulebook sanity each returns its own active document/source.
14. Exact Weekday equipment/Joola question — PASS. Captains Guide page 10 states Franklin Outdoor X-40 Optic for regular/playoff match balls; answer does not adopt Joola assertion.
15. Exact Weekday 9.1 different-format question — PASS. Flex scheduling Fridays noon, modification within seven days; four players/two lines/two courts; Round Robin 2 of 3 to 11 win by 2 and potential Picklebreaker 15. Rules 6.1.9/6.1.9.1/6.1.9.2 page 8, no foreign league scope.
16. Historical unqualified team/DUPR 9.1 question — PASS appropriate league clarification per approved minimum design.
17. Historical men/women/mixed/heat six-player suggestion — PASS same bounded league clarification; no invented heat-based policy.
18. Standalone `We're ordering blouses for the team. Are there color restrictions?` — PASS appropriate insufficient evidence; no redundant object clarification or invented apparel policy.

19. `clothing` followed by the same standalone blouse question — PASS appropriate insufficient evidence on both turns, no repeated object clarification; newest-first conversation preserved.
20. General Rally Scoring plus Weekday/Saturday/PrimeTime controls — PASS shared mechanics and conditional freeze/unfreeze, no universal league target or foreign league format. Known p15 stored heading presentation limitation remains.
21. `How does the scoring freeze work?` — PASS. One below winning score; only serving team may win; conditional 25/24 example; win-by-two unfreeze/refreeze correctly explained.
22. `How does rally scoring work in a Picklebreaker?` — **FAIL / STRICT STOP**. See evidence below. No further acceptance questions, benchmark run, feedback event, code correction or deployment performed after this finding.

## Strict-stop finding: overview omits controlling winning-point exception

Deployed answer, verbatim (feedback UI omitted):

> In a Picklebreaker™, rally scoring means every rally/serve earns a point, regardless of which team served.
>
> Other Picklebreaker™ basics:
> - It is a doubles tiebreaker used when a match is tied after the day’s regular games.
> - It is played to either 15 or 25 points, depending on the league.
> - League-specific rules control the total points and win-by requirements.
> - Doubles pairs rotate when the combined game score reaches each 4-point rotation threshold.

The answer's displayed Official Sources are both **PICKLEBREAKER™ GAME OVERVIEW, page 16**, LWR Pickleball Club DUPR League Rules. A read-only production query after stopping confirms the relevant p15/p16 passages all belong to active **v20260907001227-e4d9bf77**, version `e4d9bf77-e15e-4d80-84ba-2f7259970ba6`.

- Page 16, chunk `ce9b014e-e3d3-43b0-86bf-9523481d4e84`: “It always uses Rally Scoring, where every rally/serve earns a point regardless of which team served. Refer to the league-specific rules for Rally Scoring, total points, and win-by requirements.” The overview contains the broad statement, so this is not an invented quotation or a superseded-source issue.
- Page 15, **Rally Scoring Rules**, chunk `09ceb070-fee5-4617-9cb9-9ed8739aef74`: “A team can win a point regardless of whether they are serving or receiving except for the winning point”; “A team must be serving to score the game-winning point.” The paragraph sets the scoring freeze one point below the game-winning score.
- Page 15 continuation, chunk `0e6f1e25-84bd-42bd-be93-1339d766778c`: “The game-winning point must always be scored while serving.” Win-by-two unfreeze/refreeze is also explicit.

Both sections are current formal LWR Rules. The detailed scoring qualification materially limits the broad overview. The generated answer repeats the overview as an unconditional rule and omits the winning-point qualification; a player could wrongly conclude a receiving team may score the winning point. This triggers the owner's materially incorrect grounded-answer stop condition. No cross-league leakage was observed in this answer. Whether the internal failure is recall, selection of the qualifying passage, or qualification preservation requires separate review; no additional replay/implementation was performed after stopping.

Latest corresponding player outcome by time: `7e83462b-eca9-40a7-b5cb-861f5af28536`, started 2026-09-07 01:45:14.826 UTC, final_kind=answer, LMS-0722, two selected evidence items, total_ms=3219. Lightweight outcome rows do not store the question; attribution is temporal to the observed browser request, not a claim that a stored question was read. No acceptance feedback was created to force a snapshot.

## Remaining gates and metrics

- Kitchen/NVZ and momentum: not run in production before stop.
- Full 28-question configured-model acceptance benchmark: not rerun after deployment; existing local results remain local evidence, not completed production acceptance.
- Full benchmark recall, grounding precision, incorrect-insufficiency and unsupported-answer metrics: **not complete**, no overall percentage claimed. Completed live scoped gates show **Cross-League Leakage = 0 observed**, not a claim for the unfinished full benchmark. One materially incorrect/overbroad grounded answer found.
- Activation-history production UI and next legitimate live activation: pending at stop. All 22 historical values remained NULL after migration. Isolated transaction/UI tests previously passed. No legitimate activation was performed by this acceptance run, and none was fabricated.
- Existing Evidence UX, complete Approved Answer manager/authority-warning regression, full Stage 7 feedback/privacy regression and final integrity sweep: pending at stop. Historical viewer was checked in preflight; postmigration old data/privilege hashes passed. Grounded outcomes show deployed LMS-0722 capture, but that is not a substitute for remaining Stage 7 gates.
- Performance: observed first grounded player outcomes 4227, 3126, 2815 and 2037 ms, and failing Picklebreaker request 3219 ms. Detailed production call-count/overhead comparison remains incomplete.
- No HMAC/environment change, corpus processing, fake activation, Approved Answer mutation or corrective deployment. Migration remains applied; LMS-0722 remains deployed. No rollback was performed or implied.

**LMS-0722 / 0.1.544 — DEPLOYED, NOT PRODUCTION ACCEPTED. Acceptance stopped for owner review. LMS-0721 remains the last accepted release.**

## Final acceptance after owner-authorized correction — 2026-09-07 UTC

**LMS-0722 / 0.1.544 — PRODUCTION ACCEPTED**, with the owner-authorized live-activation limitation below. The earlier strict stop above is retained as history and is resolved by the separately approved correction.

Deployment: normal main-branch pipeline, commit `42778fd3066f89e7f6f8dabb00b09c952ebfbbbf`, deployment `dpl_F1A5PEKbyNdPjqfz7RHD9QkdPHdy`, READY. No version increment. Migration was not reapplied. [Correction diagnosis and files](lms-0722-rally-qualification-correction.md).

### Qualification correction and live answer gates

The overview was already recalled at rank 3 / .5598; the detailed qualification was recalled at rank 5 / .5324. Stage 4 excluded the general qualifying passage before generation. The bounded generic correction preserves materially qualifying same-version, equal-authority, compatible-scope passages and their explicit continuation; the model contract requires the qualification alongside the broad proposition. It adds no SQL, corpus, embedding or retrieval call. Related-but-nonmaterial and unrelated shared-term fixtures remain excluded; genuinely conflicting controlling fixtures fail safely. No sport, page, score or policy answer is hardcoded.

The FIRST postdeployment question was exactly `How does rally scoring work in a Picklebreaker?`: PASS. Grounded answer includes general every-rally scoring AND the game-winning-point serving requirement, the conditional freeze explanation, applicable Picklebreaker context, and current page 15/16 sources. No foreign-league proposition. All nine configured-model qualification controls passed. Earlier passed live gates 1–21 were preserved through automated coverage rather than unnecessarily repeated in production.

Kitchen/NVZ equivalence, volley prohibition and the momentum follow-up then passed in the live player panel. Follow-up context and newest-first UI remained intact. The safe `What is my DUPR?` control remained protected: raw guard, no Stage 3/model call, no selected evidence, empty diagnostics, no review occurrence. No account information was looked up.

### Full benchmark and performance

[All 28 generated answers](lms-0722-production-benchmark.md), [before/after comparison](lms-0722-benchmark-before-after.md), [metrics](lms-0722-production-metrics.json).

- 24 grounded answers, two appropriate league clarifications, two appropriate insufficient-evidence apparel responses.
- Answerable-question success: 24/24 in this bounded set. All 24 grounded outputs had applicable evidence and were reviewed as supported; zero incorrect insufficient-evidence responses among those 24 answerable questions.
- Cross-League Leakage = **0** across the 12 mandatory scoped controls; assertions check both expected and forbidden propositions, selected scopes and citations. Unsupported grounded answers = **0** in the reviewed 28 after correction.
- This is task-level evidence/answer coverage, not an exhaustive corpus chunk-recall metric. A complete relevant-chunk ground-truth set does not exist, so corpus-wide recall is not claimed. The before table labels missing exact historical baselines instead of inventing them.
- Method: deployed correction code + captured production-format retrieval + live configured answer model/current-source validation, not 28 new browser requests. Separate live player gates validate the deployed path. 23 answer-model calls; deterministic navigation, clarification and insufficiency skip generation.
- Model/source wall time: 1,429 ms minimum, 1,831 ms median, 6,150 ms maximum. Deterministic concept classification averaged .00344 ms in the bounded local measurement; this is not the entire selection-layer overhead. Captured retrieval examples retain interpretation under 1 ms, one base query embedding and one bounded assisted search with zero additional embedding calls where used. The qualification correction adds zero retrieval/embedding/model calls compared with the already deployed LMS-0722 path. Compared with LMS-0721, the approved bounded concept/probe path may add a scoped search; it does not add an answer-model workaround. Representative live grounded request totals before correction were 2,037–4,227 ms; the new momentum answer was 3,136 ms. No broad latency regression observed; no load test or induced production failure was performed.

### Manager version history and activation

Production Rules listing: Active version prominently displayed, `Prior Versions (10)` collapsed initially, expands newest-first and collapses, focus remains on the toggle. Important Dates stays independently collapsed; returning to Rules retains its own expansion state. Existing statuses, processing details and actions remain. All historical activation fields, including current Rules, truthfully display Unknown.

Actual-component desktop/mobile tests at 1280, 390 and 320 pixels passed: no horizontal overflow, native Enter/Space operation, focus retention, aria-expanded/controls, independent document state, active card visibility, known local-time/actor fixture, truthful Unknown and prior-version selection. Production desktop functionality was checked directly; responsive dimensions and known activation rendering were verified with isolated fixtures, not a fake production document.

The additive migration/security and isolated transaction tests passed: activation, supersession and provenance are atomic; direct activation without prospective history fails. Final production execute rights: service role only for the three-argument activation function; no anon/authenticated execution; trigger function not callable by those roles or service_role. Old actor-less overload removed. No legitimate document activation occurred during acceptance: all 22 historical versions remain Unknown. **Accepted limitation:** next real activation/actor display and a legitimate subsequent supersession are not live-tested. Isolated transaction coverage proves the behavior; do not activate a fake document to manufacture this gate.

### Existing Evidence, Approved Answers and Stage 7

Manager review and Approved Answers pages load; authority warnings load (zero unresolved), existing-evidence review still surfaces Rule 6.2.2 and keeps Retest explicit. The exact post-confirmation explanation remains in the deployed unchanged ExistingEvidenceDecision component and regression coverage: confirming evidence classifies the issue and does not immediately change Ask LWR. The acceptance run did not append another artificial manager confirmation solely to redisplay that transient message. The historical manager confirmations and original unanswered occurrences remain visible.

Both scheduling revisions remain retired; .65 managed threshold unchanged. A fresh protected link prepared from retained feedback opens exact revision 2 with its original Rule 5.11 passage and a truthful historical/retired label. An earlier tab link had expired at the designed five-minute lifetime; fresh authorized preparation passed. No Approved Answer was created, edited, activated or retired in LMS-0722 acceptance. Manager authority review may show raw broad stored chunk headings; those candidates are not selected player citations and do not establish applicability merely by appearing.

One controlled Helpful event on answer `39db0562-5326-4798-b471-dfdf04273408` was stored at 2026-09-07 02:12:09.489628 UTC, with LMS-0722 snapshot and matching player-interface outcome (3,136 ms, one source). Original momentum question and effective follow-up question were preserved. Public organizational email behavior remains supported in the passed password-help answer and retained scheduling snapshot; no private account lookup. Protected outcome has no occurrence. RLS enabled and browser-role SELECT denied on outcomes, occurrences, manager history and feedback.

### Final integrity and validation

7 documents, 22 versions, 1,733 chunks; current Rules remain `v20260907001227-e4d9bf77`. Zero recorded activation timestamps/actors. Original version fields, chunks and Approved Answer revisions match baseline hashes. The initial final-check hash discrepancy was a comparison-expression mismatch (nested per-row hash versus original raw JSON aggregation); rerunning the exact original expressions matched all baselines. All version/revision update timestamps precede this release acceptance. Seven Approved Answer audit events remain.

All original 18 feedback rows match their baseline hash. Total is now 20: this run's one controlled event and one other event at 01:37:35 UTC, not created by this run; no claim that concurrent activity belongs to this acceptance. No history was deleted or rewritten. HMAC configuration unchanged, no synthetic activation/data cleanup, no corpus processing or Approved Answer mutation. Existing source authorization and historical source access retained.

Validation: **614 tests passed**; lint passed with six existing warnings; TypeScript noEmit passed; PDF server bundle verification passed; git diff --check passed. Normal build compiled successfully then hit the known .next/cache/.tsbuildinfo EPERM lock. Isolated clean production build passed. No compilation failure is being concealed.

No remaining release blocker found. Limitations: legitimate live activation pending as expressly permitted; bounded benchmark is not proof for all natural questions; known raw source-heading presentation can remain visible in manager candidate inspection; general multi-proposition partial-answer redesign and future Live LMS Intelligence remain deferred. No next version started.
