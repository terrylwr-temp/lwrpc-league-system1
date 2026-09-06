# LMS-0721 / 0.1.543 — Existing-evidence decision workflow diagnosis

## Production checkpoint — 2026-09-06

The approved workflow is now deployed at commit `7b4aca4` with the related-source passage-binding correction. The real Saturday case passed the explicit Yes decision once: specific Rule 6.2.2/page 9 reference and passage hash retained in one manager category_changed audit event; New status and original occurrence preserved; no Approved Answer created. Live mobile controls fit 390px with 44px touch targets. Retest prefilled the exact question without executing. Idempotency remains verified in isolation; no duplicate production audit was manufactured. Website 1.1 and NR 4.5 remain existing knowledge. Overall LMS-0721 acceptance is blocked separately by the known public-email validation of the owner-approved scheduling Draft; no workflow/retrieval/schema correction was made during acceptance. The implementation checkpoint below is historical; see the implementation report current acceptance matrix.

## Implementation checkpoint — 2026-09-06

Owner approved this design and the bounded workflow is now implemented locally. **467 tests pass**, lint has six existing warnings and no errors, TypeScript/PDF/diff verification pass, and isolated production build passes after the known normal-build cache lock. No deployment or production case decision has been performed. Version remains LMS-0721 / 0.1.543, not production accepted.

The case-origin creation flow now waits for an explicit decision. Evidence expands within its own card with the question nearby, selected-reference labels and Yes/No actions beside the text. Up to two distinct passages can be selected; no passage is selected automatically. Close source returns focus to its invoking control. No focuses the continuation heading and renders the existing editor or unchanged authority block. Yes removes the creation flow and shows open-case confirmation, Retest and a case link.

`aiExistingEvidenceDecision.js` validates manager role, actor-bound case token, original question hash, selected chunk/passage hashes, current candidate membership and exact current trusted source binding. Browser-supplied notes/text/labels are rejected. It delegates only to the existing category action; the existing transaction appends the manager event. No RPC/schema changes. The bounded audit note stores document title, exact document/version/chunk IDs, trusted rule/page and passage SHA-256 for each selection; **no excerpt or source URL is stored**. This intentionally uses the design's minimum reference rather than copying passage prose. It remains an audit reference, not a database-enforced formal-source link.

The Saturday production-format fixture validates 6.2.2 separately from its 6.2.1 container. Tests preserve existing website/NR identity controls, existing authority blocks, roles, retries, open status and original occurrences. The production case itself remains unchanged pending authorized deployment/acceptance. The previously pending passage-binding migration is unchanged; this workflow adds none. See the latest implementation-report section for exact files, results and continuation. Earlier diagnosis below is retained as history.

Date: 2026-09-06. Diagnosis and proposed application workflow only. No production case, policy, occurrence or code was changed in this pass. The previously completed local passage-binding correction remains pending review/production authorization.

## Finding: this is existing official knowledge

Question: “I could use some clarification on the Saturday league mixed doubles. Is it permissible to use players other than the 12 that played in the single gender matches?”

Active LWR Pickleball Club DUPR League Rules, **6.2.2 — Roster & Courts — page 9**:

> 12 players—6 men and 6 women—divided into six teams: 3 men’s doubles teams and 3 women’s doubles teams. Mixed teams may be formed from the gender doubles players or can be from additional players who participate only in the mixed round. Requires 4 courts.

This directly permits additional mixed-round-only players; they need not be the same 12 used in gender doubles. It does not waive other player/roster/division eligibility requirements. Section 6.2 explicitly identifies Saturday DUPR League, so the scope matches the question.

Exact retained source: document `9c200d0f-be41-4c73-9f47-41c18dcd0132`, active version `c0604ad8-7057-4e63-b6e1-e9389aee2157`, chunk `e4bebbb3-7a89-42c6-ab33-dfb18baad0c3`. Stored primary rule/heading is **6.2.1 / Scheduling**, but a separate structural 6.2.2 provision in that same chunk supplies the answer. This is the same broad-chunk/sibling-identity pattern addressed by the pending passage-binding correction. Do not relabel the chunk or create managed knowledge for this example.

Supporting source: **6.2.5 — Player Cap — page 10**, includes “Optional lineups may include players who compete only in gender doubles or only in mixed doubles.” This source is among the retained retrieval candidates. Other game-count/Picklebreaker wording in the provision need not be imported into an answer about eligibility for the mixed round.

## Recorded production outcome and limits of diagnosis

Read-only matched answer `b23b01e9-74fb-454d-ad26-0c9ab32a807a`, group `3662e41a-4066-4320-a3e8-d8634e96f292`. Original/effective questions are identical. LMS-0721; standalone; no prior context, no clarification consumed, both raw/effective live-data guards false. Final kind insufficient_evidence; Official Sources and selected evidence are empty. Case is New / Unclassified, revision 1 at inspection.

Diagnostics: candidateCount 32, retrievalLimit 8, authorityReviewLimit 12, threshold .35, stage3Sufficient true. Eight retained candidate scores in snapshot order: .5034, .4905, .4887, .4809, .4801, .4784, .4708, .4706. These cover USAP team/gender definitions, Saturday format/6.2/6.2.5, a league comparison and a substitution provision. The exact 6.2.2 chunk is not among the eight retained entries. The snapshot does not retain all 32 candidates or per-candidate exclusion reasons, so it cannot establish whether 6.2.2 entered a later authority-review pool or identify the exact rejecting branch.

Classification: **AI/Retrieval Review — selection/applicability, with possible additional recall/ranking weakness for 6.2.2**. Not a knowledge gap and not a live-data guard false positive. Retained 6.2.5 provides independent relevant evidence, yet selectedEvidence is empty; thus this cannot be explained merely as the relevant information being absent from the corpus. No new answer-model or embedding replay was needed for this conclusion. A future exact retrieval/selection trace can pinpoint the rejecting branch; no retrieval fix is included in this workflow design.

## Smallest decision flow

Keep the original question visible above a compact existing-evidence section. Display each trusted provision with document title, specific provision identity, page and passage. Use the pending passage-binding helper to distinguish 6.2.1 from 6.2.2. Viewing evidence should expand it **inside the same source-review section**, next to the decision controls, rather than placing it elsewhere in Approved Answers. For longer content, a dialog may contain the same question/evidence/actions; Close returns focus to the invoking evidence control. Maintain mobile wrapping/scrolling and an accessible close target.

Require the manager to select/inspect the intended provision and choose explicitly:

- **Yes — Existing Evidence Answers It**
- **No — Continue with Approved Answer**

Do not preselect Yes and do not equate a retrieved candidate with a sufficient answer. A manager decision is not a new retrieval rule or authoritative model classification.

### Yes

1. Protected server handler authenticates Commissioner/League Manager, reloads the genuine linked case, verifies the selected exact document/version/chunk/passage and compares the trusted derived rule identity. The existing review token supplies case revision/actor binding. Do not trust a browser rule label, source URL or free-form claimed evidence.
2. Call the existing `ai_review_case_action` once with action category, value `ai_retrieval_selection`, and a bounded server-constructed evidence decision note. One operation UUID remains stable on retries. Existing optimistic revision conflict and operation replay checks apply.
3. The transaction updates the case category and appends its `category_changed` manager audit event with before/after state and the decision note. Status stays New or Reviewing; reviewed-through/Resolved fields are not advanced by this action. If already categorized AI/Retrieval Review, the explicit new decision can still append its audit event; retry of the same operation must not duplicate it.
4. Do not invoke Approved Answer create, embedding, activation, Resolve or player feedback. Preserve the original occurrence and its insufficient-evidence result exactly.
5. Show confirmation adjacent to the evidence: “Recorded as AI/Retrieval Review. The case remains open.” Offer **Retest Question** and **Return to review case**. Retest uses the existing safe original-question prefill into Test AI Assistant; it does not submit automatically. Resolve remains a separate explicit review-case action after retest.

### No

Continue the existing shared Draft editor, retaining the selected related evidence and requiring the normal missing-policy distinction/static-policy confirmation. Existing direct-source blocks, duplicate checks, source-currentness checks, conflict/activation rules remain in force. No is not an override: if automated checks still establish directly answering authority, explain that Draft creation remains blocked and offer AI/Retrieval Review/Retest. Do not remove those checks merely because the manager clicked No.

## Schema assessment: no new migration for the minimal workflow

Verified production `ai_review_case_action` already supports `ai_retrieval_selection`, optional p_note, and atomic case update plus manager-event insertion. Existing manager events retain operation_id, before_state, after_state and note. Notes are bounded to 4,000 characters. Existing protected service, role checks, signed review tokens, idempotency and SQL revision guards can be reused unchanged. Category actions preserve status and original occurrences.

The minimal reference is a **manager audit note**, not a new formal-source relationship or fabricated historical answer citation. Construct a short readable note on the server containing:

- explicit manager confirmation that existing evidence answers this question;
- official document title, exact document/version/chunk IDs, trusted rule/page;
- deterministic SHA-256 of the exact reviewed passage and a bounded excerpt;
- optional short manager explanation within the existing note limit.

Do not place signed URLs, credentials, member details or a complete large chunk in the note. Never truncate IDs/hashes. A full selected passage need not fit in the note: the exact retained container plus passage hash identifies what was reviewed, while a bounded quote makes the audit readable. This uses existing note semantics honestly; it does **not** provide a new database FK or guarantee independent of retained corpus availability. If strict first-class evidence associations, new relational integrity or additional immutable snapshots are required instead, stop for schema approval rather than overloading another column.

At minimum the note retains the reference for manager review. An application-level “View reviewed evidence” action can use the stored case/event reference, protected manager authorization, and exact document/version/chunk plus revalidated passage hash. Do not turn arbitrary note URLs into links or treat notes as authoritative knowledge. If the original source is unavailable or the hash no longer matches, say so; never substitute the latest source. Existing plain-note display is sufficient for the minimal release, so a custom note parser/viewer is optional rather than a prerequisite.

No managed item is needed to retain this review decision. The separate already-approved managed passage-binding migration remains independent; do not modify it or Stage 7 schema for this flow.

## Proposed application touch points and tests

- `app/ai-assistant/review/ApprovedAnswersPanel.js`: adjacent evidence/decision controls; keep return/retest clear; do not open Draft until No; preserve current block rules.
- `app/lib/aiApprovedAnswersService.js`: safe case context and selected-provision validation; reuse `aiApprovedSourceBinding.js` for identity.
- `app/api/ai-assistant/approved-answers/route.js` or the existing protected review route: narrow decision handler delegates to the existing review action; no new SQL function.
- `app/lib/aiReviewService.js`: reuse existing category mutation, review token and audit access; only add a helper if needed for composing the bounded validated note.
- Existing review/managed tests plus a production-format 6.2.1/6.2.2 fixture.

Regression plan: explicit Yes changes category and appends one correct audit event, no managed rows/embedding/feedback/capture mutation; status/occurrence unchanged; exact retry does not duplicate; changed case/source/forged identity rejected; already-categorized case still records deliberate decision; all unauthorized roles denied; No preserves existing authority/duplicate blocks; rule 6.2.2 and 6.2.1 remain distinct; source view and decisions adjacent on desktop/mobile with predictable focus; Retest prefills original question without automatic submission; Resolve never occurs automatically; historical reference never substitutes a newer document.

Implementation would run the full existing suite plus lint, type check, PDF bundle verification, build and diff check. No such workflow implementation or new test run is claimed by this diagnosis pass. All previously completed local passage-binding code/tests remain intact.

## Outcome

Rule 6.2.2 is existing official knowledge. Do not create an Approved Answer for this case. The minimum decision workflow fits the current schema using an audited category change with a bounded evidence reference. Diagnosis/design is recorded for LMS-0721 / 0.1.543; no version increment, deployment, production classification or retrieval change was performed.
