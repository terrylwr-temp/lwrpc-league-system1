# LMS-0721 / 0.1.543 — Ordinary sibling citation correction

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
