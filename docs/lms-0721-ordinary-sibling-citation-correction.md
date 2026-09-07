# LMS-0721 / 0.1.543 — Ordinary sibling citation correction

**FINAL: LMS-0721 / 0.1.543 — PRODUCTION ACCEPTED (2026-09-06).** This final disposition supersedes the pending implementation checkpoints below. Both scheduling revisions remain retired; no new version started.

2026-09-06. Owner-approved citation-only correction. No version increment, retrieval/applicability/threshold change, SQL, corpus processing, managed revision mutation or Stage 7 change.

## Cause and correction

The post-retirement outcome `0b0775c9-66cd-48a0-a330-b6483b667b69` selects only formal scheduling evidence. Exact selected text begins at Rule 5.11 in LWR DUPR League Rules, document `9c200d0f-be41-4c73-9f47-41c18dcd0132`, version `c0604ad8-7057-4e63-b6e1-e9389aee2157`, chunk `01444d6d-44da-4fd9-8069-e7fe1e117e28`, page 5. Stored chunk primary rule is 5.10/Video Recording.

Ordinary `resolveOfficialSources` calls `trustedSelectedRuleIdentity`; no `boundRelatedPassage` branch participates. Previously the utility returned the stored fallback when `!managedSibling && !within(id,parent)`. Rule 5.11 is a sibling, not a descendant of 5.10, so it returned 5.10 while the heading utility correctly derived the scheduling heading.

Removed only the descendant restriction and the managed-only option. Ordinary and managed presentation now share the same structural identity utility. The utility still verifies selected model text against selected passages, presence in the revalidated stored text, a recognized identity at the selected passage's beginning, and a matching structural line in the trusted chunk. Prose references or forged labels cannot establish identity. Parent families retain their parent; multiple selected distinct provisions retain the existing bounded combined identity. Unselected neighbors never enter the list.

Managed `validateManagedPassage` still separately requires a complete selectable passage/family and validates identity. Authorization, current-source validation, persistence and historical handling are unchanged. Ordinary citations do not query or depend on managed records. Document/version/chunk/page validation remains in `resolveOfficialSources`; existing trusted heading logic is unchanged. Previously captured labels are not rewritten.

## Files

- `lwrpc-admin/app/lib/aiSelectedRuleIdentity.js`: shared sibling structural identity acceptance.
- `lwrpc-admin/app/lib/aiApprovedSourceBinding.js`: remove managed-only utility option; retain binding responsibilities.
- `lwrpc-admin/test/aiApprovedSourceBinding.test.mjs`: update obsolete ordinary-sibling fallback expectation.
- `lwrpc-admin/test/aiOrdinarySiblingCitation.test.mjs`: production-format ordinary selection-to-source test, correct 5.10/5.11 headings, cross-reference/forgery controls, 3.5/4.5/5.5/5.7/USAP specifics, bounded combined selections.
- This report, implementation report and roadmap. Prior pending diagnosis/lifecycle documents are preserved with their historical status.

## Validation checkpoint

525 tests passed (including all existing regressions and 11 new controls). Lint: zero errors, six existing warnings. `npx tsc --noEmit --incremental false` passed. PDF server-bundle verification passed. Normal production build compiled in 17.9s, then failed writing the known locked `.next/cache/.tsbuildinfo`; this is a cache-write failure, not a compilation failure. Isolated clean build completion and authorized deployment are recorded below when confirmed. Diff check required before commit.

The exact previously approved Existing Official Evidence Confirmed copy is already part of source and remains unchanged. Both managed revisions are retired. Pre-deployment full-row hashes (including vectors/lifecycle): revision 1 `da1086034e847f6ca996d7c73475ad6c`; revision 2 `36b253c6dd3954ef5f5682e88f622394`. No activation or revision editing is authorized or performed by this correction.

Production acceptance remains pending the first corrected post-retirement question and remaining gates. Do not repeat completed lifecycle mutations. Deferred low-score recall, ambiguity, PDF activation history and unrelated AI quality items remain deferred.

Isolated clean production build passed: compilation 9.6s, TypeScript 2.8s, all 74 static pages generated. Temporary isolated build and test log removed. git diff --check passed. Authorized production Git deployment follows this validation checkpoint.

## Deployment and required first production retest

Normal Git pipeline deployed commit `38eb7bb721313282f2d3e8eb031b7fa0c79f3aae`. Vercel `dpl_4ACBAUDbciy2uqkbx54rArrhPRSZ` is READY with `league.lwrpickleballclub.com` assigned. No migration or environment change.

First new request after reload: **Can we reschedule our match?** Outcome `9359b24b-b390-406a-bb1c-a072130de926`, completed 2026-09-06 22:42:52.002 UTC, answer, one selected source, zero Authority Warnings, 2,049ms.

Visible answer:

> Yes—if both coaches agree, games may be rescheduled to a different time on the same day or to another day within the same week. Scores must be submitted by Sunday at midnight of that same week.
>
> If weather or other unforeseen circumstances prevent meeting that deadline, the Home Captain must email info@lwrpickleballclub.com before Sunday at midnight with the rescheduled date and time. Failure to do so may result in forfeiture.

Only Official Source: **LWR Pickleball Club DUPR League Rules — Rule 5.11 — Rescheduling & Score Submission Deadlines — Page 5**. No 5.10 citation, retired managed source or managed every-change notification supplement. The narrower formal answer is expected and passed.

## Remaining acceptance gates completed

| Gate | Evidence and result |
| --- | --- |
| Existing Evidence UX | Live Saturday source review selected exact Rule 6.2.2 and confirmed Yes. Production displayed the complete approved Existing Official Evidence Confirmed explanation, unchanged Retest action and Return to review case. It explicitly says classification does not fix Ask LWR, correction is needed, then Retest and explicit Resolve. No Approved Answer created. Case remains New / AI/Retrieval Review. |
| Historical revision 2 after retirement | Opened its existing Helpful occurrence, prepared a fresh authorized source link, and viewed exact revision-2 wording, retired/historical banner and exact 5.11 relationship. No lifecycle action repeated. Prior historical revision-1 pass retained. |
| Authority | Existing isolated/configured-model coverage retained, and full 525-test suite passed: formal rule governs actual conflict, manager warning is separate metadata, player receives grounded formal answer and no artificial Stage 7 conflict is manufactured. No contradictory production policy created. |
| Role/security | Live Commissioner manager/review/viewer access passed. Anonymous deployed manager and Approved Answer viewer routes each returned 401. Isolated PostgreSQL/server-role coverage proves Commissioner/League Manager allowed and Club Pro/Captain/Player denied; no production roles changed or sessions impersonated. This uses the owner's approved isolated coverage for unavailable live roles, not a claim of live testing those roles. |
| Effective permissions | Production managed tables all have RLS enabled; anon/authenticated lack direct SELECT, service has SELECT and no direct INSERT/UPDATE/DELETE/TRUNCATE. All five managed RPCs deny browser/anon execution and allow service execution. Prior actual denied-operation tests and current isolated effective-operation tests retained. |
| URL/privacy | Full suite retains exact approved public email, rejects/redacts private/unapproved email, credentials/tokens and unsafe/signed URLs. Live authorized historical viewer and anonymous denial pass. No additional privacy exception. Protected typo produces no retrieval/model/occurrence. |
| Case-originated workflow | Existing isolated database tests cover genuine linked FK, uniqueness, linked audit and separate explicit Resolve. No synthetic production case. Manager-originated production item remains NULL-linked with preserved lifecycle audit. Website Rule 1.1 and NR Rule 4.5 existing-authority prevention evidence retained; no duplicate knowledge created. |
| LMS-0720 sanity | All remaining controls below passed. Stage 7B summary/feedback and retained source navigation loaded. |

Bounded production sanity, one request per listed input except the intentional reset/context pair:

- `What kind of balls will we be usin`: Franklin Outdoor X-40 Optic, Captains Guide p10.
- `Can I volly in the kitchen?`: no volley from NVZ, USAP 11.A p30.
- `Can I join a team in another comunity?`: Rule 3.5 p2, own-community same-division AND roster-availability qualification retained.
- `Medical issue during match`: full Rule 5.7 p5, under-six forfeit/excluded from DUPR versus six-or-more retired/current score/posted; opponent win and substitution guidance.
- Immediate `What if one team has 7 points?`: retained medical context, retired/current score/posted to DUPR/opponent win, Rule 5.7.
- Same fragment after New Question: asks for full question; no inherited medical answer.
- `what comunity am i registered with`: protected fallback; outcome `01176b2f-ab26-42f8-9e95-393b1b8466dc` at 22:48:19.369 UTC has `final_kind=protected`, raw live-data guard, `stage3_invoked=false`, `model_call_skipped=true`, diagnostic `{}`, zero review occurrences.

Eight player requests total in this correction acceptance pass (required post-retirement plus seven sanity requests), no feedback clicks. One explicit Saturday existing-evidence confirmation for the required UX verification; no automatic resolution or original-occurrence change.

## Final integrity and scope

Read-only final checks match the pre-correction baseline exactly:

- 7 documents / hash `0fe745ff877528865886f1d1dd132154`.
- 20 versions / hash `f9e16952cbcfd1e15ccb456365e978ad`.
- 1,581 chunks including vectors / hash `3e2c7d5c4b57e8ae165238d020ce1c19`.
- Both full managed revision-row hashes equal those recorded above, including embeddings and lifecycle metadata. Both retired; zero Active revisions. Managed audit count remains seven.
- Feedback count remains 18; older feedback aggregate `cb2a34ba555949c2631fb02a8febf1d5` unchanged.
- Original Saturday occurrence hash `c849fee5681ac9a777876e09308062e9` unchanged. Case New / `ai_retrieval_selection`; no managed item linked to it.
- HMAC route key versions remain `[1]`; no secret/configuration read or change. No corpus/document/embedding processing, migrations, Stage 7 semantic changes or historical label rewrite.

Historical lifecycle gates from the prior report are retained as passes; they were not repeated. The new correction is prospective. Global `.65`, candidate limits and Stage 3/4 behavior are unchanged.

## Accepted deferred limitations

Below-.65 managed semantic recall, competing supplemental ambiguity, PDF/document activation timestamp/actor display, Saturday 6.2.2 retrieval, website 1.1 retrieval, rally-scoring scope and kitchen/NVZ equivalence remain deferred and nonblocking under the owner's approval. No conditional recall, hidden aliases or replacement policy was added.

**All remaining required gates pass under the approved combination of production and isolated evidence. LMS-0721 / 0.1.543 is PRODUCTION ACCEPTED.** Final acceptance documentation remains local after deployment; no extra code deployment is needed. No next version started.
