# LMS-0721 — Approved LWR Answers / Managed Knowledge: diagnosis and proposed design

Date: 2026-09-06. **Governing design approved; implementation authorized, including the subsequent Authority Warning workflow clarification.** Current production is **LMS-0721 / 0.1.543, deployed but not production accepted**. LMS-0720 / 0.1.542 is the last accepted release; Stage 7A/B remain accepted. The manager-origin correction below is local only, pending review and production authorization. See the implementation report for validation.

This report covers the owner's diagnosis request and the additional future document-activation-history requirement. The supplied request ends at section 38, after “Design tests covering:”; the acceptance matrix below is derived from its preceding requirements.

## 1. Findings and recommendation

Add controlled knowledge alongside the existing PDF corpus, using three dedicated tables and an **Approved Answers** tab inside AI Feedback & Review. Creation starts from a genuine unanswered case or an authorized manager, saves a Draft, and requires explicit Commissioner or League Manager activation. Notes, feedback and case resolution never become knowledge automatically. Preserve published revisions from the first release.

The unanswered club-website example is **not missing knowledge**: active League Rules 1.1 already provides the main website, and 1.2 provides the LMS website. Creating a duplicate Approved Answer would hide an existing retrieval/applicability defect. The kitchen/NVZ case remains excluded pending separate diagnosis. No inspected case is an unconditionally validated acceptance-policy candidate; the reimbursement question is only a conditional candidate if management actually establishes an official policy after authority review.

Two design decisions need explicit approval with implementation: (1) the conservative precedence/conflict rules below; (2) citation-bound historical access to retired revisions, resolving the request's tension between “do not expose retired content” and “historical citations remain viewable.” Retired revisions would never be searchable or publicly enumerable, but an authorized historical citation would still open its exact formerly approved revision.

## 2. Existing accepted architecture

| Component | Existing behavior and implication |
| --- | --- |
| `ai_request_outcomes` | Lightweight outcome/diagnostics, with protected and clarification handling; not a knowledge store. |
| `ai_question_groups` and `ai_question_fingerprint_routes` | Deterministic HMAC routing, full normalized question retained with a 32 KiB byte bound. Preserve grouping and HMAC unchanged. |
| `ai_review_occurrences` | Original/effective question, answer and bounded historical source/evidence snapshots; one occurrence per answer identity. Never promote this table into authoritative knowledge. |
| `ai_manager_review_cases` | One case per group; New, Reviewing, Resolved, Dismissed; category, Normal/High priority, revision, review cutoff and closing reason. |
| `ai_manager_review_events` | Append-only manager/system history, including notes and status/category/priority decisions. Its current action constraint has no managed-knowledge action. |
| Review authorization | Protected server routes plus explicit Commissioner/League Manager role checks; private/no-store responses. Browser roles do not directly access the quality tables. |
| `ai_review_case_action` | Transactional mutation, operation-id replay protection, expected-revision checks, group-then-case locking and atomic audit. Preserve its accepted semantics. |
| Review UI | Needs Review, Unanswered, Feedback and Resolved views; detail, notes, Mark Reviewed, Resolve/Dismiss/Reopen and history. |
| Retest Question | One-use, five-minute session-storage prefill into Test AI Assistant; no automatic request or automatic resolution. |
| Historical viewer | Resolves the exact stored PDF version/chunk, including superseded versions, rather than silently substituting the currently active PDF. Temporary signed URLs are created only for access, not persisted. |

Primary local evidence: `app/ai-assistant/review/page.js`, `app/lib/aiReviewShared.js`, `aiReviewHttp.js`, `aiReviewService.js`, `aiQualitySnapshots.js`, and the LMS-0716/LMS-0718 SQL definitions under `lwrpc-admin`.

Place **Create Approved Answer** in a separate Knowledge decision section of case detail near Retest Question. Enable it only after the manager identifies genuine missing static club knowledge. Protected/live-data, clarification-only and technical-error cases are ineligible. An existing linked item opens that item instead of creating a duplicate. Show guidance: “Check existing official sources first. A retrieval or selection failure requires an AI correction, not duplicate knowledge.” Direct creation from AI Assistant Management is deferred.

## 3. Manager flow and interface

1. Open genuine insufficient-evidence case; inspect question, evidence and diagnostics.
2. Review existing official material and classify missing knowledge versus AI defect. Knowledge creation is a deliberate manager decision, not an automatic inference from the result kind.
3. Create Approved Answer; enter title, canonical question, approved answer, topic/policy key, league scope, Standing/Season, effective/expiry dates, optional related official passage and optional public links.
4. Save Draft. It has no embedding and cannot be selected, cited or player-viewed. A plain manager text preview is sufficient; no Draft model/retrieval preview in release one.
5. Activation preflight shows the exact text, scope, dates, related source, overlapping items and authority warnings. The manager explicitly confirms that it will become available to players when effective.
6. Generate and validate the embedding, then atomically activate with audit. Failure leaves the Draft and any previous Active revision unchanged.
7. Retest through the existing manager console. Then explicitly Resolve the original case, with a reason. Activation does not prove answer quality or resolve the case.

The Approved Answers tab lists Draft, Active and Retired revisions/items, with search, scope and status filters. Active rows can have derived Scheduled, Expired or Needs authority revalidation badges; these are eligibility states, not additional publication statuses. Detail shows revision history, linked case, manager audit, Edit as New Draft, Activate and Retire. Use existing responsive detail conventions, full-width stacked form controls on phones, clear focus/error handling and tappable actions. Do not add another System Setup entry or merge either existing AI management tool.

Both Commissioner and League Manager may activate. Every substantive change to published text, scope, dates, references or links creates a new Draft revision. Replacement activation retires the former revision in the same transaction. Retirement requires a reason, including Incorporated into Official Source with a trusted reference when applicable. No deletion or automatic PDF editing.

## 4. Proposed schema contract — no SQL applied

Use three new tables. Names and fields below are proposed, not existing. UTC instants use `timestamptz`; user-facing date-only policy boundaries use `date` and the club's America/New_York calendar.

| Table | Fields and invariants |
| --- | --- |
| `ai_approved_answers` | `id uuid` PK; `source_review_case_id uuid` FK RESTRICT, unique for the first-release create-from-case flow; `created_at`, `updated_at`; trusted `created_by_user_id`, `updated_by_user_id`; `row_version bigint`. Derive the source group through its case rather than storing a contradictory duplicate group pointer. No active-version pointer is needed: the partial unique index below identifies it. |
| `ai_approved_answer_revisions` | `id uuid` PK; `answer_id uuid` FK RESTRICT; positive `revision_number`; `status` Draft/Active/Retired; `title` up to 160 characters; `topic_key` up to 80; `canonical_question` up to the existing 2,400 characters; `approved_answer` up to 6,000 characters; `league_scope` all/weekday/saturday/primetime; `temporal_scope` standing/season; nullable `season_id` FK RESTRICT; `effective_on`, nullable `expires_on`; optional `related_chunk_id` FK RESTRICT; trusted related-rule display identity; structured `public_links` JSON array up to three label/URL pairs; `content_hash`; authority-manifest hash; `embedding vector(1536)`, `embedding_model`, `embedding_created_at`; generated search vector; create/update/activate/retire timestamps and trusted actors; retirement reason; optional `replaced_by_revision_id`; optimistic `row_version`. |
| `ai_approved_answer_events` | `id uuid` PK; `answer_id`, optional `revision_id` FKs RESTRICT; `operation_id uuid`, ordinal and request hash for idempotency; action created/draft_edited/activated/replaced/retired/linked_to_case/linked_to_source; trusted actor; database timestamp; bounded before/after snapshots and reason. Append-only. Published revisions plus events reconstruct history. |

Constraints: unique `(answer_id, revision_number)`; partial unique indexes for at most one Active and one Draft revision per item; unique event `(operation_id, ordinal)`; nonblank content; expiry strictly after effective date; Season requires a valid season and expiry, Standing has no season; activated revisions require complete valid embedding/model/hash and activation metadata. Retired revisions retain their embedding and public text for history but are excluded from new retrieval. Drafts never persist an embedding. Limit the complete revision's serialized public content to 32 KiB UTF-8 bytes as well as field character bounds, rejecting rather than truncating it. Audit payloads have a separate explicit bounded size sufficient for before/after copies.

Active/Retired public content is immutable. Lifecycle transitions and replacement pointers are allowed only through audited transaction functions. The server derives document/version identities from `related_chunk_id`, verifies any specific rule identity against trusted passage content, and stores the historical display identity at activation. One optional related passage keeps the initial schema small; multiple related authorities should be a separately justified extension, not arbitrary unvalidated JSON references.

Use a manager-selected policy/topic key as an overlap aid, not a hardcoded user-question phrase list. Activation serializes checks for that key and rejects overlapping effective league/season scopes across different items until the manager consolidates or distinguishes them. This catches declared duplicates, not every possible semantic duplicate.

Add B-tree indexes for source case, item/revision/status, scope/date eligibility and event history; a GIN search-vector index is optional after measurement. At tens/hundreds of revisions an exact vector scan over eligible Active rows is adequate. No HNSW index or separate vector service is initially necessary.

## 5. Scope, expiry and formal-source change safety

Support All LWR Leagues, Weekday, Saturday and PrimeTime; no division scope initially. Do not silently infer league from a broad word such as “weekend.” Sunday makeup scheduling is not automatically equivalent to every weekend scheduling question. Standing means policy persists across seasons, not that a dated deadline is permanent. Season-specific facts require season and expiry; date-sensitive deadlines cannot be saved as an unbounded standing fact without correction.

Eligibility is deterministic: Active, effective date reached, expiry not reached, matching explicit/resolved scope, matching season where required, valid embedding and approved authority manifest. Missing scope that can change the answer yields bounded clarification or insufficient evidence; it never selects the nearest scope by vector score. The expiry date is an exclusive boundary and the form must explain that convention. Already expired items are ineligible without waiting for a scheduled job.

Record the active official-source manifest at approval. For the first conservative release, a changed official manifest makes managed answers ineligible pending revalidation, so an old interpretation cannot silently survive newly governing rules. Revalidation creates an audited replacement revision; an unchanged embedding may be reused only when its exact embedded content hash/model match. This may temporarily suppress more answers than strictly necessary, but avoids an unproven automatic impact classifier. Scope-specific invalidation can be considered later.

## 6. Authority and conflict decisions

Current code in `aiGoverningSources.js` treats league_rules/league_supplement as controlling LWR, USAP as governing fallback and other types as supporting guides. Important Dates is a controlling supplement. Do not assume every document called a policy is already classified controlling: Code of Conduct is currently type `other`. No metadata reclassification is performed in this diagnosis.

Direct applicability and scope come before authority. Recommended order for a *shared issue*: applicable formal LWR rule/controlling supplement or established policy, then directly applicable existing LWR operational guidance, then Approved Answer filling an actual gap. USAP continues to govern rules of play where no applicable formal LWR exception exists. Preserve existing selected-match-ball handling.

| Scenario | Recommended deterministic handling once overlap/conflict is established |
| --- | --- |
| A: Rule X versus Approved Answer Y | Rule governs; exclude the conflicting managed revision and flag it for manager review. No semantic-score override. |
| B: LWR procedure versus generic USAP | An Approved Answer can establish a club administrative procedure that USAP does not govern. It cannot invent an exception to a USAP playing rule. A departure requires a directly supporting formal LWR rule/policy reference; that formal evidence must actually authorize the exception. |
| C: Current Important Dates versus old answer | Applicable Important Dates governs; expired/wrong-season managed answer is excluded and flagged if still apparently Active. |
| D: Captain Guide differs | Preserve the currently accepted directly applicable guide procedure. Block conflicting managed activation until the discrepancy is resolved in formal guidance or a supported controlling source; do not introduce an implicit manager override. |
| E: Two managed answers conflict | Block known overlapping activation. If an unresolved same-authority collision reaches selection, use existing conflict behavior, not whichever ranks higher. |
| F: Managed interpretation of Rule 5.5 | Select/cite the exact supporting Rule and clearly labeled Approved Answer when both are needed and consistent. The linked number is not permission to invent an exception. |

Similarity is not contradiction detection. No deterministic algorithm can reliably prove arbitrary free-text policies consistent merely from vector ranking. Deterministic enforcement covers status, scope, dates, trusted references, declared overlaps and priority once applicability is established. Human authority review is required before activation; semantic overlap results are review aids. Ambiguous applicability or same-authority meaning must be handled conservatively, not labeled a proven contradiction without evidence. This limitation is an implementation acceptance condition, not a promised automatic guarantee.

Before allowing Create Approved Answer, check for an existing linked Draft/item and present available active official evidence for the question. A confirmed directly answering official passage blocks duplicate creation and directs the manager to **AI/Retrieval Review** (existing `ai_retrieval_selection` category). A merely similar candidate produces a warning requiring a recorded missing-policy distinction. Do not reuse Stage 4's negative decision as proof of a corpus gap: this would repeat the website false negative. Managers need a way to inspect the existing active passages independently of the selected-answer list. Repeat this check at activation because sources may have changed. This is an overlap safety feature, not authorization to fix website answer selection.

Activation preflight also blocks confirmed formal-source conflicts, declared scope overlaps, stale references/manifests and invalid dates. Similarity alone is not a fabricated conflict. The owner-approved Authority Warning clarification replaces the originally underspecified runtime case/capture behavior. A correctly grounded formal answer stays `answer`, cites the formal source and retains feedback eligibility. Store only bounded `authorityWarnings` source/revision identities, scope and fixed discrepancy codes in existing outcome diagnostics. Do not create an automatic occurrence, unanswered/conflict case or feedback event solely for a warning. Existing metrics, HMAC and grouping retain their meanings. The authorized Approved Answers tab shows retained warning observations separately, links the exact revision and formal source, and supports Retest through revision detail. There is no hide/acknowledge shortcut: replacement or retirement corrects the underlying Active revision; historical observations remain intact. Ordinary complementary evidence does not itself generate a warning.

## 7. Retrieval, generation and activation mechanics

Keep PDF processing and the existing Stage 3 RPC unchanged. Add a dedicated server-only managed-answer retrieval RPC. Reuse the original question embedding already obtained by the accepted request; do not make another question embedding or classification-model call. One bounded managed lookup per resolved official question, at most four candidates, and a maximum of four selected sources overall. Preserve the original raw/effective question, accepted typo interpretation limits and PDF candidate/authority budgets; managed candidates must not displace formal authority from the PDF review pool.

Semantic similarity plus lexical matching retrieves candidates from canonical question, title and approved answer. Scope/date/publication/authority checks then qualify them. Existing strict lexical passage matching cannot simply be imposed on arbitrary approved prose and still promise paraphrase support. Implementation must introduce and validate a bounded managed-evidence applicability path, retaining uncertainty handling and selected-evidence-only generation. Ranking thresholds require production-format fixtures and calibration; the PDF .35 threshold is not evidence that an unrelated managed score has equivalent quality. Do not approve a threshold solely because it makes positive examples pass.

Natural paraphrases must be tested alongside adjacent but materially different questions. No list of special question strings or blanket first-person exemption. If qualification is ambiguous, clarify or abstain. Protected/live requests remain guarded before retrieval. Static approved knowledge cannot answer current ratings, rosters, standings, opponents, personal eligibility or Match Setup state.

Use the current embedding model, `text-embedding-3-small`, 1,536 dimensions, once for the exact proposed revision at activation. Activation preflight binds item/draft row version, content hash, scope and current source manifest. Generate outside the database transaction. The transaction rechecks authorization, expected revision, manifest, eligibility and overlap under locks; stores embedding and publication metadata; retires the predecessor; appends audit; commits together. A failed/invalid embedding, expired preflight or concurrent edit leaves the Draft and old Active revision unchanged. A repeated operation ID returns the same result, not another revision/event. Never hold database locks across a model call.

Use the existing grounded answer model and feedback behavior. Supply trusted approved text plus its immutable source identity; attach citations on the server. No separate canned-answer generation path is necessary. A model may paraphrase but may not extend policy beyond selected evidence. Recheck revision eligibility before final delivery when retirement/replacement races are detected; bounded retry or conservative fallback rather than claiming a retired source is current. A managed lookup failure must not suppress a directly supported higher-authority PDF answer. Where missing managed authority makes a fallback unsafe, return existing insufficient evidence rather than guessing.

## 8. Sources, history, URLs and Stage 7 compatibility

Introduce a backward-compatible tagged source representation: existing sources without a kind remain PDF; managed sources use `sourceKind: approved_answer`, item ID, revision ID, revision number and content hash. Do not fill PDF document/version/chunk fields with invented IDs.

Player label: **LWR Pickleball Club Approved Answer — [Title]**, optionally with effective date. The safe viewer shows title, approved text, scope, effective/expiry dates and a verified related Official Source. Manager actor IDs, notes, case discussion, diagnostics and audit never appear. A related rule remains a distinct Rule citation, not a renamed managed item.

Current discovery permits only eligible Active revisions. Historical access uses a user-bound citation capability to the exact previously activated revision, including a retired revision with a clear historical badge. Drafts are never viewable through that path. There is no anonymous list or arbitrary revision-ID browser lookup. Managers can view full history through authorized routes. This is the proposed resolution of the retired-access requirements and should be included in implementation approval.

Keep the existing Stage 7 macro `source_family` values: a managed LWR source is `lwr`, or contributes to `mixed` with USAP. Add explicit source-kind and revision metadata to the bounded source/evidence serializers, feedback receipts and manager diagnostics, and distinguish managed sources in detail/filtering where practical. This avoids changing every existing family constraint while still recognizing managed provenance. Update player source conversion and viewer routing, which currently assume PDFs. Old snapshots are not rewritten; historical PDF behavior and legacy feedback remain supported.

Not Helpful feedback creates normal review information correlated to the exact revision. Managers decide whether wording, policy, retrieval or formal guidance needs work. It never edits or retires knowledge automatically. Dedicated knowledge events record creation/activation/case linkage; existing review events continue to record case decisions. Add the proposed `approved_lwr_answer` action category explicitly to the case constraint and app allowlists; do not overload note text as the authoritative audit.

Public links should be structured label/HTTPS URL fields, up to three, rendered separately from Official Sources. Initially allow approved official public domains; reject credentials, signed/token URLs, unsafe schemes, private/local hosts and unapproved query parameters. Do not fetch URLs during save/activation. Plain approved text is not arbitrary HTML or executable markdown. Server-validated link fields are authoritative; the model cannot invent destinations. Keep the existing telemetry URL/PII redaction; revision identity can resolve approved public text in the viewer without weakening snapshot privacy rules.

## 9. Security and retention

Enable RLS on all new tables, with no direct anon/authenticated access. Explicitly revoke production default grants from PUBLIC, anon, authenticated and service_role before granting the intended final access. Do not change project-wide defaults or existing feedback/document privileges.

Recommend service-role SELECT only on new tables, with mutations through narrowly scoped audited SECURITY DEFINER functions. Revoke default function EXECUTE, grant only service_role, fix the search path and fully qualify objects. Functions must never use a definer's `current_user` as proof of the caller's manager identity. Protected routes authenticate the user and supply the verified actor; the transaction should revalidate that actor against the application's authoritative role mapping. Validate membership/role identifiers using existing authorization conventions during implementation, not browser-supplied actor fields.

No direct service-role UPDATE/DELETE of published content or events. RPCs validate permitted transitions, expected row versions, operation replay and content bounds. No permanent deletion in the manager UI. Retain published revisions and their audit for as long as historical citations are retained; no automatic purge is proposed. Drafts/events must not contain copied member data or private case discussion. If future retention requires removing personal actor identifiers, preserve the event and timestamp with an unavailable-actor label rather than rewriting history.

Security tests must exercise effective operations under production-like default grants and migration replay, not merely inspect GRANT text. New SECURITY DEFINER functions are a deliberate new security boundary requiring review; existing Stage 7 functions and role grants remain unchanged except any explicitly approved category compatibility change.

## 10. Read-only production examples

Inspected current New/Reviewing player unanswered cases and targeted active official-source text, without an embedding or answer-model call. Candidate review included website, kitchen/NVZ, reimbursement, tungsten and questions already addressed by accepted robustness controls.

**Website:** “What is the website for Lakewood ranch pb”. Active **LWR Pickleball Club DUPR League Rules, page 2, CLUB LEAGUE FORMAT** explicitly says:

> 1.1. Club main website: https://lwrpickleballclub.com
> 1.2. League Management System (LMS) website: https://league.lwrpickleballclub.com

The active Captains Guide page 3 also distinguishes the LMS from the main website; page 4 gives the leagues registration page. Rules 3.1 and Captains Guide page 7 supply membership guidance. These are existing sources, not facts requiring managed-knowledge duplication.

The retained “Lakewood ranch pb” occurrence ended `stage4_no_applicable_evidence`, with no selected evidence. Stage 3 ran with 32 candidates. Its stored top eight were Captain Guide cover .5027, Player Guide cover .5022, Rules mission .4907, Code of Conduct .4895, Rules 6.2 .4227, Captains Guide Manage Roster .4194, Captains Guide cover .4188 and Rules Rule 5 .4114. Rule 1.1 is not in that stored top eight. The stored snapshot does not establish whether it appeared in the other candidates or authority pool. Current generic applicability requires issue-term/operative-language support, which can reject a short website fact; that is a plausible additional limitation for this stored wording, not a complete reproduced causal trace.

**Additional owner-supplied production diagnostic, “What is the website for the club”:** Rule 1 is Stage 3 rank 3 at approximately .464 and contains the direct Rule 1.1 main-website answer. Stage 4 excludes it for issue applicability/material contribution, while selecting the rank-4 Players Guide candidate containing only the DUPR website and club contact email. This establishes an **AI/Retrieval Review — Stage 4 applicability/material-contribution defect**, not a managed-knowledge gap. These ranks describe the owner's supplied diagnostic, not the different retained wording above. Preserve this example for a future bounded Stage 4 diagnosis; do not implement its selection fix in LMS-0721 without separate authorization. Neither website wording is an Approved Answer acceptance candidate. The creation/activation overlap gates must detect or surface existing direct official evidence even when the normal selector previously excluded it.

**Conditional policy candidate:** the lost-prescription-sunglasses reimbursement case. A targeted active LWR text scan for reimbursement, sunglasses and lost-property wording found no matching passage. Together with the earlier tangential-waiver diagnosis, this makes it worth manager policy review, not proof of a Yes/No answer or proof of exhaustive semantic absence. Use only if management deliberately establishes an official static policy and reviews all applicable authority. Do not hardcode the example.

Tungsten is out of scope. Kitchen/NVZ remains a separate AI-quality diagnosis. Previously corrected medical/ball/roster/typo questions are not evidence of missing club knowledge. Therefore no second genuinely missing-policy example is asserted. A management-approved real policy is a prerequisite to a safe production activation acceptance item.

## 11. Future document activation history — separately approved work only

Read-only production catalog inspection confirms that `ai_documents` has created/updated timestamps and actors, while `ai_document_versions` has created/updated/processed timestamps and a processing actor. **Neither has an activation timestamp or activation actor.** The only non-internal triggers on these two tables update `updated_at`. No activation/audit table was identified in the public schema; the existing feedback and manager-review event tables do not receive document activation events.

The deployed `activate_ai_document_version(document_id, version_id)` matches the local Stage 2.1 function: lock the document, validate the ready version/searchable embeddings, set the document's active pointer/status, and mark the previous ready version superseded. It does not record activation time or user. The protected documents route passes only document/version IDs to that RPC. Its locally available manager identity is not passed on activation. The management list/detail projections and version rows do not currently expose activation history.

Consequently this is **not a UI-only addition**. `ai_documents.updated_at` can change on metadata edits; `ai_document_versions.updated_at` changes on processing or supersession; `processed_by_member_id` identifies processing, not activation. None can truthfully be relabeled Activated or Activated By. Platform operational logs have not been established as complete historical activation evidence and are not a backfill source by assumption.

Smallest future option for the present one-time version lifecycle: nullable `activated_at timestamptz` and `activated_by_member_id` on each version, set by the activation transaction only on its first real inactive-to-active transition and never changed on supersession. Pass the actor from the authenticated server route. This supports a clearly labeled first activation time, but cannot represent multiple activation intervals if reactivation becomes supported.

Preferred small durable audit option: a dedicated append-only `ai_document_activation_events` with ID, document ID, activated version ID, previous version ID, database `activated_at`, verified actor and idempotent operation ID. Write it atomically with pointer promotion; a repeated activation of the already active version creates no false activation event. This preserves every future activation interval without conflating first and latest activation. Display the applicable event on each version and optionally expand history. No corpus or embedding changes are needed. Apply the same server-only/RLS/default-grant safeguards and do not grant browser access to actor identifiers.

For existing versions show **Activation time not recorded** and omit Activated By or show **Not recorded**. Current Active status can still be shown from the pointer, and Superseded status from stored state; neither establishes a historical timestamp. Do not backdate from filename/version labels, upload, processing or modification times. Only independently verified authoritative records could support a separately reviewed historical backfill; none was established here.

Render stored UTC instants with the manager browser's local timezone using `Intl.DateTimeFormat`, including a timezone indicator and an accessible full timestamp. Do not treat the club's policy-date timezone as the manager display timezone. On phones stack the activation details under the version label. Superseded versions retain the same recorded event, including an unavailable actor label if the actor record is later removed. Tests should cover two manager timezones/DST, absent historical data, processing versus activation separation, repeated activation, replacement, actor attribution and rollback. Implement only after separate approval; exclude this schema/UI change from default LMS-0721 managed-knowledge scope.

## 12. Likely implementation files and migration scope

New files would include the three-table migration and narrow managed-knowledge RPCs, managed knowledge validation/service/retrieval modules, protected manager routes, a player-safe approved-answer viewer and focused tests. Names should follow existing `aiReview*`/`aiOfficialDocumentViewer*` conventions.

Existing integration points: `app/ai-assistant/review/page.js`, `app/lib/aiReviewShared.js`, `aiReviewService.js`, `aiReviewHttp.js`, `aiRetrieval.js`, `aiAnswerGeneration.js`, `aiGoverningSources.js`, `aiQualitySnapshots.js`, `askLwrPlayerAnswer.js`, existing feedback receipt/source validators, document-viewer dispatch and the manager test diagnostics page. Enumerate exact receipt helpers during implementation before changing their serialization. The existing case-category CHECK needs a bounded additive value if the proposed category is approved; thus the migration is mostly additive, not honestly “new tables only.” Existing PDF search RPC, document processing, embedding corpus, HMAC and accepted feedback toggle behavior do not change.

Normal version/docs updates belong to the separately approved implementation: app version, package/lock build version, roadmap and implementation report. The future PDF activation-history work would separately touch the document activation RPC, `app/api/ai-assistant/documents/route.js`, `app/ai-assistant/page.js` and its own schema/audit tests.

## 13. Implementation sequence and acceptance plan

1. Obtain implementation approval for this contract, especially precedence, retired citation access, conservative manifest revalidation and the true policy acceptance item.
2. Implement schema/functions locally. Test effective privileges with production-like defaults, concurrent activation, atomic replacement, duplicate operations and replay. Verify existing table/function grants are unchanged.
3. Implement manager Draft workflow/audit and explicit activation preflight; then bounded retrieval/source union/generation integration; then historical viewer, feedback and Stage 7 diagnostics. Keep changes independently testable.
4. Run the full existing regression suite plus focused cases; lint, `npx tsc --noEmit --incremental false`, PDF server-bundle verification, production build and `git diff --check`. If the known Windows cache lock follows successful compilation, distinguish it and run the established isolated clean build.
5. Only after separate production authorization: additive migration/security verification, application deployment as LMS-0721 / 0.1.543, then controlled production acceptance. No migration, deployment or embedding generation occurs in this diagnosis.

| Gate | Required evidence |
| --- | --- |
| Draft isolation | Draft not embedded, retrieved, cited or player-viewable; manager note/feedback cannot create knowledge; invalid/protected case rejected. |
| Existing-source duplicate prevention | Website Rule 1.1 remains discoverable in the review check even when the normal selector rejected it; confirmed existing answer blocks Create Approved Answer and routes to AI/Retrieval Review. Similarity without direct support warns rather than inventing a match. Recheck at activation. |
| Activation | Explicit two-role authorization, denied player/captain/anonymous requests; successful atomic publication; embedding failure, stale form and racing edit leave prior state unchanged. |
| Semantic relevance | Canonical question and natural paraphrases select the same exact revision; nearby different policies, ambiguous weekend/Sunday scope and generic word matches do not. No extra query embedding/classifier call. |
| Authority A–F | Formal rule/date/guide controls preserved; no unsupported USAP exception; unresolved managed collision does not become a fabricated answer; both references correctly cited for a supported interpretation. |
| Scope/date | Standing versus season, future-effective, expiry boundary, wrong season/league, ambiguous scope and changed official manifest. |
| Historical integrity | Activate v1, answer/feedback, edit v2 Draft, activate v2 atomically, open v1 historical citation, retire v2, verify no current retrieval; no draft leak or substitution of v2 for v1. |
| Stage 7 | Source kind, exact revision and bounded evidence persist; Helpful/Not Helpful dedup/correlation unchanged; manager_test separate; old PDF and legacy feedback sources still open. |
| Security | Effective SELECT/INSERT/UPDATE/DELETE/EXECUTE matrix, default grants and replay, actor spoofing, source-token tampering, arbitrary revision lookup, append-only audit and cross-item reference attacks. |
| Links/privacy | Unsafe/signed/private URLs rejected, no HTML injection or server fetch, public links distinct from citations, no notes/PII/credentials in player payload. |
| UI | Desktop/mobile tab/form/viewer, focus/Escape/error handling, long title/text and touch targets; existing Ask LWR layout and review controls preserved. |
| Accepted controls | Full LMS-0720 suite: typography/interpretation bounds, medical context/reset, protected questions, equipment, community Rule 3.5, ball/NVZ controls, governing sources, citations and fail-open capture. |
| Production lifecycle | Approved real policy: Draft exclusion → Activate → paraphrase tests → Retest → explicit Resolve → revision replacement/history → Retire. Record measured lookup latency and bounded failure behavior without injecting unsafe production faults. |

A production test that activates knowledge changes official answering behavior and requires an approved actual policy, not an invented answer for a convenient test. No such activation was performed. Approval of this design alone should not be represented as production acceptance.

## 14. Diagnosis changes and limitations

This pass produced documentation only and used scoped read-only production queries. No code, SQL files, schema, corpus, document content, embeddings, HMAC, application version or production deployment was changed. No embedding or answer model was called. No new test outcome, feedback event, case or knowledge item was created. Existing uncommitted LMS-0720 acceptance documentation was preserved.

The read-only evidence establishes the website source exists and activation metadata is absent from the application schema/path. It does not reconstruct unretained Stage 3 candidate ranks, prove arbitrary policy consistency, or recover historical activation times from unrelated timestamps. Those boundaries must remain explicit in implementation and owner review.

## 14. Authorized implementation decisions and validation (2026-09-06)

The owner separately approved the metadata-only Authority Warning clarification after the initial capture-contract stop. This section records its implementation without changing existing Stage 7 outcome/metric definitions. The full local validation and controlled deployment gates are in `lms-0721-implementation-report.md`.

The manager tab reads the most recent 100 warning-bearing outcomes and most recent 300 revisions, labels that bounded window, and shows only warnings whose implicated revision is still Active in the list. It does not claim an all-time warning metric. Historical observations are retained. Replacement and retirement provide correction; there is no hide/acknowledgment action that could leave contradictory knowledge silently Active. Exact revision details link the originating review case and support retest.

Five service-only functions accompany the three-table migration: authority manifest, managed-knowledge manifest, audited mutation, managed retrieval and independent formal source review. Explicit revoke/regrant and production-like ACL replay/operation tests apply to all new objects. The approved existing review-category compatibility extension preserves its function's existing ACL. No change to capture SQL, HMAC or grouping is needed.

Activation binds both formal and managed manifests to the saved revision. A short transaction takes the managed mutation lock, revalidates manifests, and prevents a formal promotion between the check and commit. Per-revision embeddings use the configured 1,536-dimensional model; Draft save never embeds. Failure leaves Draft and prior Active unchanged. Current formal-source changes conservatively require new revision review rather than assuming continuing authority.

Measured synthetic embedding fixtures established a .65 managed semantic gate plus scope/day/weekend/numeric/duration safeguards; the initial .82 provisional value was rejected by measurement. Positive scores were .6639–.7352, but semantically adjacent wrong-day questions scored about .799, so raw similarity never establishes policy applicability. These fixtures are a small bounded calibration, not a universal guarantee. When managed content participates in generation, the existing single response call additionally verifies direct support through its strict support field. Formal playing-rule evidence remains controlling; managed prose is not appended to recognized rules-of-play questions or used standalone to invent playing exceptions.

Source-review results are bounded and deliberately independent of Stage 4. A direct existing answer blocks knowledge creation/activation; similar evidence requires an audited missing-policy distinction. The website Rule 1.1 fixture exercises this separate prevention path; its player selection defect remains deferred.

Actual Approved Answer activation actor/time is retained and displayed in local time, including historical revisions. The separately requested document/PDF activation history remains deferred as specified in section 11; no upload/processing timestamp is relabeled.


## Approved bounded correction — manager-originated knowledge (2026-09-06)

The owner's manager-origin approval supersedes the earlier first-release case-only creation restriction. This remains LMS-0721 / 0.1.543. Production correction/deployment is not authorized automatically after local validation.

- Origin is represented by the existing case FK: NULL means Manager-created; non-NULL means case-originated. Keep FK ON DELETE RESTRICT and standard UNIQUE semantics (multiple NULLs, one item per non-NULL case). No origin sentinel or synthetic Stage 7 record.
- `New Approved Answer` in the Approved Answers tab opens the same Draft editor. An explicit `id: null` on create uses the manager path. Missing/invalid IDs are rejected; supplied case IDs still require the unresolved, unmerged unanswered case and one-per-case validation.
- Existing protected route and SQL actor-role revalidation restrict both paths to Commissioner/League Manager. Retain table RLS/ACLs, safe function search path, all content/dynamic-data/URL checks, independent formal-source review and activation conflict/manifest checks. Activation preflight now includes same-topic, overlapping-scope/date Drafts as well as Active items from other knowledge objects; this is not a claim of comprehensive semantic Draft deduplication.
- The related-source model and governing hierarchy are unchanged. Consistent linked supplemental knowledge may contribute; it never overrides formal Rules. Direct creation does not bypass confirmed existing-source blocks or the required missing-policy distinction.
- Create keeps the existing operation UUID, advisory transaction lock and request hash. Replays return the same item/revision; changing payload, actor or origin cannot reuse an operation ID. Content edits remain immutable after publication.
- All lifecycle audit remains; `linked_to_case` is emitted only for a non-NULL genuine case. Null detail lookup is skipped, and the manager sees `Source: Manager-created` with no broken linked-case navigation. No new listing/filter subsystem is needed.
- Manager-origin lifecycle never changes Stage 7 data. For the scheduling acceptance item, skip linked-case Resolve. Preserve and test the genuine case path and explicit Resolve separately in the isolated database.

Corrective migration: `lwrpc-admin/supabase/migrations/20260906172546_lms0721_manager_originated_approved_answers.sql`. It changes only column nullability and the existing managed mutation function, explicitly reinstating that function's service-only EXECUTE ACL. The original applied migration stays historical and is not edited/reapplied.

The owner-approved scheduling text in the implementation report is the production continuation item, not a source-code fixture or hardcoded answer. Its first production Draft/activation remains pending authorization and live authority checks.
