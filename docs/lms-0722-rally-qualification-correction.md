# LMS-0722 / 0.1.544 — material qualification and version-history correction

Owner authorized diagnosis, bounded correction and redeployment without version increment. Production acceptance remains pending until the first failed-question retest and remaining gates pass.

## Diagnosis

Exact question: `How does rally scoring work in a Picklebreaker?`. Raw/effective question unchanged. Concept: scoring, Picklebreaker phase, no named league/division. No live data or managed knowledge involved.

Read-only current-production retrieval replay: overview page 16 ranks 3 at .5598; detailed Rally Scoring Rules page 15 ranks 5 at .5324, already within the authority-review set and above .35. Full ranks/scores/contents, review set, selected passages, actual configured-model input and structured response are preserved in `lms-0722-qualification-before.json`. All relevant LWR passages belong to active Rules v20260907001227-e4d9bf77.

The scoring selector's Picklebreaker phase admitted the overview but rejected the general scoring qualification. The selected evidence supplied to generation omitted the detailed game-winning-point requirement. A configured-model replay reproduced the incomplete overview answer. This is a deterministic material-contribution exclusion, not missing Stage 3 recall. No SQL, RPC, embedding, terminology projection or corpus change is needed.

Page 16 says every rally/serve earns a point and refers readers to applicable scoring rules. Page 15's Game Points paragraph expressly excepts the winning point and references the next item. The next item requires serving to score the winning point and describes the freeze. These are same-authority, applicable qualifications rather than foreign-league policy. The known broad stored p15 heading remains unchanged.

## Correction

`aiMaterialQualifications.js` preserves bounded same-version, equal controlling-authority restrictive passages when their body propositions overlap a selected generalized claim. Shared topic wording alone is insufficient: restrictive language and multiple shared body anchors are required. League/division/ambiguous-scope checks prevent a foreign scoped restriction being attached to a broad claim. Explicit next-item dependencies retain the adjacent qualification. Duplicate passages are removed. Selected evidence remains capped at four; a required qualification is not silently discarded to fit the cap.

This is a conservative generic relationship recognizer, not a general semantic theorem prover or a new retrieval pipeline. It contains no document/page identity, score, Picklebreaker or winning-point policy. It does not automatically decide that a specific contradictory statement overrides a broad one: both remain available to the existing conflict contract.

Generation explicitly treats a broad proposition and its applicable material qualification as one answer obligation, preserving both. Applicable contradictions must produce conflict rather than arbitrary selection. Current corrected replay selects the overview, its verified continuation, and the p15 qualification. All nine scoring controls produce grounded responses including the game-winning-point serving requirement. Single-pass verified artifacts: `lms-0722-qualification-verified-0.json` through `-8.json`. Earlier exploratory control artifacts used a diagnostic selector twice, consuming a request-local continuation reader; they are not the final generated-answer validation. The verified runs use the production single-pass path.

## Per-document version history

AI Assistant Management retains the current Active version above a collapsed-by-default `Prior Versions (N)` control. Prior entries sort newest first by version creation order (only for ordering, never as activation provenance). All existing selection/actions/status/processing details remain. Each document has independent expansion state. Native buttons provide Enter/Space behavior, visible focus, `aria-expanded` and `aria-controls`; collapsed entries are hidden from keyboard navigation. Activation time/name still come only from authoritative fields, formatted locally; historical NULL is Unknown. No version data or activation operation changed.

## Validation

- Full automated suite and existing LMS-0722 scope controls rerun; final count in correction test log.
- Generic fixtures cover material exception, non-material related detail, unrelated shared terminology, contradiction preservation and foreign scope rejection; scoring controls cover all requested wordings and three named leagues.
- Configured answer model replay uses only approved questions and selected official evidence. No member data, credentials or conversation history transmitted.
- Lint: zero errors, six existing warnings. TypeScript and PDF bundle verification pass.
- Normal build compiled successfully in 14 seconds, then encountered the existing `.next/cache/.tsbuildinfo` EPERM lock. Isolated clean production build passed.
- Actual manager component with isolated GET-only fixtures: 1280/390/320 widths, no overflow/page errors; keyboard toggles/focus retention, Active and historical activation values, Unknown, independent document expansion and prior selection pass.
- No migration, active Rules, corpus/embedding, HMAC, Stage 7 semantics, managed .65 threshold or Approved Answer data changes.

## Deployment / acceptance

Redeploy through normal main-branch production pipeline only after final checks. First production question must be the exact failed Picklebreaker question. Stop if it fails; otherwise resume after the prior stop, preserving previously passed gates. No migration replay or fake document activation. Full benchmark and remaining manager/history/Stage 7/integrity gates remain required before production acceptance.

## Completion

614 tests passed; isolated clean build passed after normal compilation hit the known cache lock. Commit 42778fd deployed READY. First exact production retest passed, followed by the remaining acceptance gates. Per-document version history is production verified. [Final acceptance report](lms-0722-production-acceptance.md) records methods and the permitted next-legitimate-activation limitation. LMS-0722 / 0.1.544 is production accepted.
