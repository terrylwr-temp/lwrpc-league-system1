> Current phase reservation (2026-09-05): LMS-0716 / 0.1.538 Stage 7A is production accepted. LMS-0717 / 0.1.539 is the separately approved AI quality-hardening release. Stage 7B manager reporting is deferred to **LMS-0718 / 0.1.540**, not started. Earlier phase/version references below are historical planning checkpoints. The Stage 7A schema, capture, grouping and feedback semantics are unchanged by LMS-0717.

# Stage 7 — AI Feedback, Unanswered Questions & Quality Management

Complete design revision 2 — 2026-09-05, with owner-approved Unicode constraint and service-role ACL corrections. **The owner approved this governing design, LMS-0716 / 0.1.538 implementation and subsequently its controlled production migration/configuration/deployment sequence. LMS-0718 manager reporting/workflow is not authorized.** This revision replaces the provisional design, including its single-release recommendation.

**Current production status:** **LMS-0716 / 0.1.538 — PRODUCTION ACCEPTED. Stage 7A — COMPLETE.** Final read-only review on 2026-09-05 found no new defect. The owner-authorized live authorization and failure-injection limitations are accepted and remain documented for operational review; they do not block Stage 7B unless new evidence indicates a problem. Stages 1–6 remain accepted. LMS-0718 / Stage 7B and Live LMS Intelligence have not started and are not authorized by this acceptance. See the final acceptance section of `lms-0716-implementation-report.md` for read-only evidence and the two accepted limitations. The migration, HMAC configuration, pipeline and corpus were not changed in the final review.

**Recommendation:** six additive tables; lightweight outcomes without question text for all completed authenticated requests; detailed capture only for genuine unanswered/conflict outcomes and existing voted answers; individual occurrence → recurring-question group → one optional review case. Keep the accepted feedback event table and behavior. Implement capture/schema as LMS-0716 / 0.1.538, then manager reporting/workflow as LMS-0718 / 0.1.540, subject to separate authorization.

Inspection basis: current LMS-0715 source, feedback schema definition, permissions, receipts, answer helper, diagnostics, viewer and navigation; earlier read-only production schema inventory. That inventory found documents, versions, chunks and feedback events, not Stage 7 tables. This revision does not claim a fresh production security audit or new production tests. Source anchors and implementation boundaries appear in section 17.

## 1. Exact proposed database schema

These are design definitions, not executable SQL. All six tables are proposed in `public`, with RLS and browser grants revoked. `NN` means NOT NULL; `NULL` means nullable. No default exists unless stated. All timestamps use `timestamptz` in UTC; all generated primary keys use random UUIDs. Text bounds below are validation/CHECK limits on PostgreSQL `text`. Enumerated text uses CHECK constraints, not PostgreSQL enum types. JSON fields require the specified object/array shape, server allowlists and a combined 32 KiB maximum occurrence snapshot. No JSON field accepts arbitrary request payloads.

### A. ai_request_outcomes — lightweight completed request

| Column | Type/nullability/default | Purpose/constraint |
|---|---|---|
| id | uuid NN, PK | Server-generated interaction ID; shared feedback answer_id for eligible answers |
| request_started_at | timestamptz NN | Request start |
| completed_at | timestamptz NN | Final server outcome time, not feedback time |
| recorded_at | timestamptz NN, now() | Persistence time |
| origin | text NN | player_interface / manager_test |
| final_kind | text NN | answer / insufficient_evidence / conflict / clarification / protected / technical_error |
| reason_code | text NULL, max 80 | Existing bounded outcome reason |
| assistant_version | text NN, max 80 | LMS/build identity from server |
| model | text NULL, max 120 | Actual model where known; null when not called |
| feedback_eligible | boolean NN, false | Existing eligibility decision |
| source_family | text NN, 'none' | lwr / usap / mixed / none / unknown |
| selected_evidence_count | smallint NN, 0 | 0–4 |
| stage3_invoked | boolean NN | Whether retrieval ran |
| model_call_skipped | boolean NULL | Null if unavailable |
| guard_classification | text NULL, max 80 | Existing guard code only |
| resolver_classification | text NULL, max 120 | Existing bounded resolver code only |
| diagnostic_snapshot | jsonb NN, {} | Scalar allowlist: retrieval/selection status, candidate counts, configuration version; no text excerpts or identities |
| total_ms | integer NULL | Nonnegative elapsed duration |
| input_tokens | integer NULL | Nonnegative, only if returned by existing model call |
| output_tokens | integer NULL | Nonnegative, only if returned |
| telemetry_version | smallint NN, 1 | Positive observation schema version |

Checks: completed_at >= request_started_at; feedback_eligible implies final_kind=answer. Protected requests have stage3_invoked=false, source_family=none and selected_evidence_count=0. No question, generated answer, auth/member ID, conversation ID, IP, user agent, receipt or fingerprint is stored here. Indexes: PK(id); (completed_at DESC,id); (origin,final_kind,completed_at DESC,id); partial (origin,completed_at DESC,id) WHERE feedback_eligible. Request retries reuse id; conflict on id is a no-op after invariant comparison, never a different outcome overwrite.

### B. ai_review_occurrences — one reviewable answer/request

| Column | Type/nullability/default | Purpose/constraint |
|---|---|---|
| id | uuid NN, random, PK | Stable occurrence identity |
| answer_id | uuid NN, UNIQUE | Shared new outcome ID or existing legacy feedback answer_id |
| outcome_id | uuid NULL, FK A.id ON DELETE SET NULL | Optional telemetry correlation; UNIQUE when non-null |
| group_id | uuid NN, FK C.id ON DELETE RESTRICT | Current group membership |
| first_feedback_event_id | uuid NULL, FK ai_answer_feedback_events.id ON DELETE SET NULL | Provenance pointer, not the complete vote history |
| provenance | text NN | live_capture / feedback_capture / legacy_feedback |
| origin | text NN | player_interface / manager_test / legacy_unknown |
| occurrence_kind | text NN | grounded_feedback / insufficient_evidence / conflict |
| answer_completed_at | timestamptz NULL | Known server completion only; unknown for legacy |
| first_observed_at | timestamptz NN | Final outcome time or first legacy feedback time |
| recorded_at | timestamptz NN, now() | Ingestion time; supports late-arriving review activity |
| original_question | text NN, 1–1000 | Redacted original question |
| effective_question | text NN, 1–2400 | Redacted effective question |
| output_text | text NULL, max 6000 | Retained no-source/conflict response; grounded answer remains in existing feedback snapshots |
| source_snapshot | jsonb NN, [] | At most four safe historical citation identities/labels |
| selection_snapshot | jsonb NN, {} | At most four evidence records and bounded retrieval diagnostics |
| resolver_snapshot | jsonb NN, {} | Existing classifications, bounded resolved subject; no conversation history |
| assistant_version | text NN, max 80 | Original LMS/build |
| model | text NULL, max 120 | Actual model if known |
| source_family | text NN, 'unknown' | lwr / usap / mixed / none / unknown |
| redaction_applied | boolean NN, false | Whether detail was redacted |
| redaction_version | smallint NN, 1 | Positive policy version |
| snapshot_version | smallint NN, 1 | Positive snapshot schema version |
| payload_purged_at | timestamptz NULL | Retention redaction time |

Check outcome_id is null or equals answer_id. Indexes: PK(id), UNIQUE(answer_id), partial UNIQUE(outcome_id) WHERE non-null; (group_id,first_observed_at DESC,id); (origin,occurrence_kind,first_observed_at DESC,id); partial (first_feedback_event_id) WHERE non-null. There is deliberately no mandatory answer_id foreign key: legacy feedback is valid without telemetry. Feedback joins on answer_id. A conflicting same-ID snapshot is an integrity error, not permission to blend different questions. Snapshots are immutable except explicit retention redaction; group_id may change only through audited merge/split. At detail expiry replace question text with '[detail expired]', clear output/JSON payloads, set payload_purged_at, and retain structural counts for their retention period.

### C. ai_question_groups — recurring problem/question

| Column | Type/nullability/default | Purpose/constraint |
|---|---|---|
| id | uuid NN, random, PK | Stable group |
| origin | text NN | player_interface / manager_test / legacy_unknown |
| family | text NN | grounded_feedback / unanswered / conflict |
| title | text NN, 1–240 | Redacted display title; generic after detail expiry |
| canonical_question | text NULL, max 2400 | Redacted representative question; retention-limited |
| topic | text NN, 'unclassified' | unclassified / dupr / roster / match_setup / scoring / equipment / nvz / dates / other |
| created_at | timestamptz NN, now() | Group creation |
| first_seen_at | timestamptz NN | Earliest member occurrence |
| last_seen_at | timestamptz NN | Latest member occurrence |
| merged_into_group_id | uuid NULL, self FK ON DELETE RESTRICT | Redirect for preserved merge history |
| revision | integer NN, 1 | Positive optimistic concurrency version |
| updated_at | timestamptz NN, now() | Last membership/edit change |

Check first_seen_at <= last_seen_at, redirect not self; transaction rejects redirect cycles. Indexes: PK(id); (origin,family,last_seen_at DESC,id); partial (merged_into_group_id) WHERE non-null. Counts derive from distinct occurrences; first/last fields maintained transactionally and reconcilable. Group titles/topics do not rewrite occurrence classifications.

### D. ai_question_fingerprint_routes — deterministic grouping aliases

| Column | Type/nullability/default | Purpose/constraint |
|---|---|---|
| id | uuid NN, random, PK | Route identity |
| origin | text NN | Same bounded origins as C |
| family | text NN | Same bounded families as C |
| normalizer_version | smallint NN, 1 | Positive grouping algorithm version |
| key_version | smallint NN, 1 | Positive analytics HMAC key version |
| fingerprint | bytea NN | Exactly 32 bytes |
| collision_slot | integer NN, 0 | Nonnegative discriminator under the same digest |
| normalized_question | text NN, 1–32768 UTF-8 bytes | Full redacted normalized text for collision comparison; enforce octet_length, never truncate |
| group_id | uuid NN, FK C.id ON DELETE RESTRICT | Destination group |
| assignment_kind | text NN, 'automatic' | automatic / manager_routed |
| created_at | timestamptz NN, now() | Creation |
| updated_at | timestamptz NN, now() | Rerouting time |

Indexes: PK(id); UNIQUE(origin,family,normalizer_version,key_version,fingerprint,collision_slot); (group_id). Unique index prefix supplies digest lookup. Do not index full normalized text as a B-tree key: long multibyte strings can exceed index tuple limits. Serialize allocation for a digest with a transaction-scoped lock, compare stored normalized strings exactly, reuse matching slot or allocate a different collision_slot. This is collision-safe and race-safe without assuming hashes cannot collide. Multiple routes can intentionally point to a merged group; one route has one current destination.

**Approved correction:** Unicode normalization/lowercasing may expand a permitted effective question. For example, 2,400 `İ` characters become 4,800 characters / 7,200 UTF-8 bytes. Keep effective_question at 2,400 characters; replace only the route normalized_question limit with 32 KiB in bytes. Preserve the entire normalized value used for hashing and exact comparison. Reject an over-limit analytics/grouping operation without truncation or failure of the player's answer. Tests cover expansion, exactly 32,768 bytes and 32,769 bytes in both application validation and PostgreSQL constraints.

### E. ai_manager_review_cases — one workflow per group

| Column | Type/nullability/default | Purpose/constraint |
|---|---|---|
| id | uuid NN, random, PK | Review case |
| group_id | uuid NN, UNIQUE, FK C.id ON DELETE RESTRICT | At most one case per group |
| status | text NN, 'new' | new / reviewing / resolved / dismissed |
| action_category | text NN, 'unclassified' | Exact bounded set in section 5 |
| priority | text NN, 'normal' | normal / high |
| assigned_to | uuid NULL, FK auth.users.id ON DELETE SET NULL | Authorized manager assignee |
| created_at | timestamptz NN, now() | Creation |
| created_by | uuid NULL, FK auth.users.id ON DELETE SET NULL | Manager actor; null for automatic creation |
| updated_at | timestamptz NN, now() | Latest workflow edit |
| reviewed_by | uuid NULL, FK auth.users.id ON DELETE SET NULL | Last reviewing manager |
| reviewed_at | timestamptz NULL | Last explicit review decision |
| reviewed_through_at | timestamptz NULL | Ingestion/activity cutoff acknowledged by that review |
| resolved_at | timestamptz NULL | Current resolved status timestamp |
| closed_at | timestamptz NULL | Current resolved/dismissed timestamp |
| resolution_summary | text NULL, max 2000 | Required nonblank when closing |
| revision | integer NN, 1 | Positive concurrent-edit token |

Checks: resolved_at non-null exactly when status=resolved; closed_at non-null exactly when status is resolved/dismissed; summary required for those statuses. Reviewing/closing transactions require authenticated manager attribution before later actor deletion may null the FK. Indexes: PK(id); UNIQUE(group_id); (status,priority,updated_at DESC,id); (action_category,status); partial (assigned_to,status) WHERE non-null. Notes are separate events, not an overwritten notes field.

### F. ai_manager_review_events — append-only manager/system history

| Column | Type/nullability/default | Purpose/constraint |
|---|---|---|
| id | uuid NN, random, PK | Audit event |
| operation_id | uuid NN | Stable server-validated retry identity |
| event_ordinal | smallint NN, 0 | Nonnegative sub-event within transaction |
| group_id | uuid NN, FK C.id ON DELETE RESTRICT | Group affected |
| case_id | uuid NULL, FK E.id ON DELETE RESTRICT | Optional case affected |
| occurrence_id | uuid NULL, FK B.id ON DELETE SET NULL | Optional occurrence moved |
| actor_user_id | uuid NULL, FK auth.users.id ON DELETE SET NULL | Server-derived manager actor |
| actor_kind | text NN | manager / system / retention |
| action | text NN | case_created / status_changed / category_changed / priority_changed / assignment_changed / note_added / review_completed / group_merged / group_split / occurrence_moved / fingerprint_routed / retention_redacted |
| before_state | jsonb NN, {} | Allowlisted status/category/priority/assignment/membership/revision values |
| after_state | jsonb NN, {} | Corresponding new values |
| note | text NULL, max 4000 | Plain-text manager note/reason |
| created_at | timestamptz NN, now() | Event time |

Indexes: PK(id); UNIQUE(operation_id,event_ordinal); (case_id,created_at,id); (group_id,created_at,id). Operation uniqueness also supplies operation lookup. Normal use permits insert only. Note corrections append a new note. Authorized retention is the explicit redaction/deletion exception. Manager operation retries must compare actor, target and payload before returning prior success.

### Existing ai_answer_feedback_events — unchanged

Retain its current id PK; answer_id; auth_user_id; nullable member_id FK; helpful; original_question; effective_question; generated_answer; source_snapshot; selection_snapshot; assistant_version; model; nullable comment; created_at. Keep existing constraints, indexes, grants, RLS and append-only route semantics. answer_id currently has no parent FK. Existing answer/user/time lookup supports chronological detail. Add a reporting date index only if representative query plans justify it during implementation; not part of the required six-table schema. Never add UNIQUE(answer_id,helpful): a later legitimate return to Helpful must remain representable.

Separation is intentional: lightweight denominator data has different privacy/retention from full exceptional detail; individual occurrences survive grouping; groups have multiple fingerprint aliases; one mutable case has immutable audit history; accepted feedback remains the source of vote truth. No seventh answer-snapshot table is needed initially.

## 2. Identity and correlation

Generate one UUID on the authenticated server before running an answer request. Reuse it for outcome.id and, if eligible, the sealed feedback receipt's answer_id. Change receipt creation only to accept this trusted optional ID; retain the existing random fallback, user binding, sealing, 24-hour expiry, eligibility and validation. Do not accept a browser-supplied answer ID or change the separate 20-minute conversation receipt.

Persistence retries reuse that ID; a genuinely new user submission gets a new ID. Eligible new feedback and its outcome therefore correlate without storing user identity in lightweight outcomes. For noneligible results, answer_id in an occurrence still equals the shared interaction ID even though no feedback receipt exists.

Legacy LMS-0712–0715 feedback remains directly readable by answer_id with a LEFT JOIN to optional outcomes. Do not fabricate outcomes, completion dates, model usage or eligibility denominators. Legacy occurrence answer_completed_at is null; first_observed_at is the first actual feedback timestamp; provenance=legacy_feedback and origin=legacy_unknown. Missing new parents after capture failure remain visible as unlinked feedback, distinguished from known legacy where deployment boundaries establish that distinction. A generation timestamp is never inferred from a vote. Historical versions remain the stored original versions.

## 3. Occurrence → group → case

One genuine no-source/conflict completion creates one occurrence. Multiple vote transitions on one grounded answer create only one grounded_feedback occurrence, with its separate existing event history. Every occurrence belongs to one group. A group has at most one optional review case.

A no-source occurrence automatically creates a New case if absent. Confirmed conflict does the same at High priority. The first Helpful vote can create a feedback occurrence/group without a case; any Not Helpful transition creates a case if absent. Later Helpful does not delete the case or erase earlier concerns. Repeated identical clicks remain governed by the accepted feedback endpoint and do not create occurrences/cases again.

Use separate grouping families and origins, so unanswered and answered occurrences do not silently become the same issue. Managers can see related wording across families but initial merge is restricted to the same family and origin. All original occurrence IDs and snapshots remain available within retention after merge/split. Preserve existing accepted same-interface feedback behavior; this work does not redesign cross-device vote serialization.

## 4. Exact review workflow

Four statuses: **New, Reviewing, Resolved, Dismissed**. Rule/Guide Update Needed and AI/Retrieval Review Needed are action categories, not extra workflow states.

| Transition/action | Required behavior |
|---|---|
| Automatic creation → New | Reason/source event recorded; conflict High, otherwise Normal |
| New → Reviewing | Set reviewed_by/at/through; append status event |
| New or Reviewing → Resolved | Require resolution summary; set reviewer/cutoff, resolved_at and closed_at |
| New or Reviewing → Dismissed | Require dismissal summary; set reviewer/cutoff and closed_at; resolved_at null |
| Reviewing → New | Explicit manager reason; audited reassignment to queue |
| Resolved or Dismissed → Reviewing | Explicit Reopen with reason; clear current closed_at/resolved_at/summary, preserve prior values in audit |
| Change category/priority/assignee | Audit before/after; do not rewrite occurrences |
| Add note | Append note and actor/time; does not acknowledge all later activity |
| Mark reviewed | Set reviewed_by/at/through and append review_completed |

No automatic close on a Helpful vote. New negative feedback transitions or new no-source/conflict occurrences after reviewed_through_at show a **New activity** badge and bring closed cases into Needs Review; reopening remains explicit. Use signal ingestion time, not only answer time, so a late Not Helpful vote on an older answer is not missed. Review cutoff is computed by the server from the activity snapshot actually shown, not blindly advanced past unseen concurrent arrivals. Case revision + transaction + operation_id prevents lost edits and duplicate retries. Notes are plain text, retain attribution, and are corrected through new notes. Resolved-to-Dismissed requires reopen first.

## 5. Bounded action categories

| Stored value | Manager label |
|---|---|
| unclassified | Unclassified |
| lwr_rule_update | LWR Rule update |
| lwr_guide_update | LWR Guide update |
| dates_source_update | Important Dates/source-document update |
| ai_retrieval_selection | AI retrieval/selection issue |
| clarification_wording | Clarification/wording issue |
| usap_no_lwr_change | USAP / no LWR change |
| future_live_lms | Future Live LMS Intelligence |
| not_a_problem | Not actually a problem |
| other | Other — explanatory note required |

Category is editable with audit history and independent of status, priority and topic. Future-live classification of an existing manager-reviewed issue does not implement live access or rewrite the original guard/outcome. Protected telemetry itself never enters this queue.

## 6. Deterministic grouping, merge and split

1. Use the server's effective question; fall back to the original only when effective text is absent in legacy data. Apply the bounded redaction policy first. Protected requests never reach this step.
2. Normalize Unicode NFC, straighten typographic quotes/apostrophes, collapse whitespace, trim and lowercase, and remove terminal question marks. Preserve numbers, negation, dates, league/division qualifiers and all other words. No stemming, synonym substitution, keyword extraction or stop-word deletion.
3. Build an unambiguous length-delimited input containing origin, family, normalizer version and the entire normalized question. Compute HMAC-SHA-256 using a separate server analytics secret; persist key_version, never the key. Do not reuse receipt/auth secrets.
4. Under a digest-scoped transaction lock, look up routes by origin/family/versions/digest and compare normalized_question exactly. Reuse an exact match. If different strings share a digest, allocate another collision_slot and group. The unique digest/slot constraint prevents races; a failed transaction retries the same operation.
5. If redaction removed identity-bearing content that could make different questions indistinguishable, isolate that occurrence in a group with no automatic route and flag for manual grouping. Never merge all '[person]' substitutions automatically.

“What ball are we using?” and “What are the legal ball specifications?” remain different full strings and therefore separate groups. Conservative false splits are preferable to misleading merges. No model or embedding call is added for analytics. Algorithm/key version changes never silently reclassify historical groups; routes can coexist and a later migration plan can explicitly reconcile them.

**Merge:** manager selects source and target groups of the same family/origin, reviews occurrence counts and both case states, and chooses the surviving target classification if both have cases. In one transaction lock groups in ID order, validate revisions, move occurrence memberships, redirect routes, mark source group redirected, and append merge/membership/route events. Retain a source case as Dismissed with 'Merged into …' summary and linked audit; exclude redirected groups from ordinary queues/counts. Create a target case if required. Reject cycles. Counts use distinct current occurrence membership, not both old and new groups.

**Split:** select concrete occurrences, create a new group, move memberships with before/after audit and create a case when the moved signals require one. Do not delete or regenerate snapshots. By default future routing stays unchanged. A separate explicit 'Route future exact matches here' action moves the selected fingerprint route and is audited; identical text cannot automatically route to two destinations. Per-occurrence membership events and operation ID make both actions inspectable. No one-click blind merge undo: use an explicit audited split/reassignment.

## 7. Manager UI — System Setup → AI Feedback & Review

A third, separate manager entry; preserve **AI Assistant Management** and **Test AI Assistant**, labels and roles. Exact active matching prevents another double-highlight. No player Ask LWR UI change.

| View | Content and columns | Default order |
|---|---|---|
| Overview | Completed grounded answers, eligible answers, answers with feedback, participation, current Helpful/Not Helpful, Helpful %, unanswered count/rate, conflict count/rate; recent Needs Review; capture health | Recent actionable activity |
| Needs Review | Group title, signal/family, occurrence count, new activity, status, action category, priority, last signal time, assignee | High first, latest signal DESC, ID tie-break |
| Unanswered | Question/group, count, reason, first/last seen, source family, status/category, LMS versions | Last seen DESC, ID; optional count DESC |
| Feedback | One row per answer: question excerpt, current vote, number of transitions, answer time or Unknown, last feedback time, source family, LMS version, case state | Last feedback time DESC, answer_id |
| Conflicts | Confirmed conflict groups, priority, occurrences, source labels, first/last seen, status/category | High first, last seen DESC, ID |
| Resolved | Resolved/Dismissed groups, disposition, resolution summary excerpt, reviewer, closed time, recurrence badge | Closed time DESC, ID |

Separate collapsed panels show protected **Future Live LMS Intelligence demand**, normal clarification totals and technical-error totals. These are not missing-rule cards. Manager tests and legacy-unknown origin are explicitly selectable, excluded from player defaults.

Default date range: last 30 calendar days in the manager's displayed timezone, converted to UTC half-open boundaries. Overview uses answer-completion cohorts; Feedback has an explicit feedback-activity mode. Labels must identify the basis. Filters: date, current Helpful/Not Helpful (Feedback), status, category, source family LWR/USAP/mixed/none/unknown, bounded topic, question text, LMS version, origin, new activity. Source family describes selected/retained evidence; no-source may be none/unknown rather than guessed LWR. Limit search to 200 characters and retained redacted text; escape wildcard semantics. Arbitrary regex/SQL is not accepted.

Server pagination: 25 rows default, 50 optional, hard maximum 100; stable cursor contains sort values and ID and is bound to the filter set. Reset cursor on filter change. Prefer bounded indexed aggregates over downloading events. Counts and rows use a common as-of timestamp to avoid contradictory cards during activity. No bulk export, realtime subscription or auto-refresh over unsaved notes in the initial release.

Desktop uses a readable table and detail panel/page. Mobile uses stacked rows/cards and full-width detail, wrapping filters and adequate touch targets. Preserve focus on return, keyboard navigation, visible labels, loading/empty/error states and unsaved-note protection. Tabs have proper semantics; status is not conveyed by color alone. Never alter the existing mobile player panel to implement this manager page.

## 8. Review detail and safe navigation

Opening a group shows its case and related occurrences; opening a Feedback answer focuses that occurrence. Show:

- Redacted original and effective questions, with explanation of differences where the bounded resolver record supports it.
- Outcome/reason, known answer completion time, first observed/recorded time, and an explicit Unknown for historical generation time.
- Exact retained answer/exception response, or 'Answer not retained/detail expired'; do not generate a replacement answer for the report.
- Complete retained Helpful/Not Helpful transitions in chronological order and current state separately; no default player identity.
- Historical Official Sources: document/version/chunk IDs represented through safe labels, title, source family, page/rule references, version metadata and whether currently active.
- Selected evidence: at most four retained records including role/reason, safe document identity and available excerpt. Resolve chunk text on demand through a manager-authorized server operation when not retained. Missing historical evidence is labeled unavailable.
- Bounded diagnostics: existing retrieval status, candidate count, top candidate IDs/scores up to eight, selected count, governing/supporting roles and reason codes, probe/configuration identity when available. No full candidate corpus, raw prompt, embeddings, secrets or unrestricted debug object.
- Resolver classifications and a redacted resolved subject if useful, without conversation history; related occurrences with dates/outcomes/versions; LMS and actual model version where known.
- Status, category, priority, assignment, reviewer/time/cutoff, resolution summary, append-only notes and workflow/membership history.

**Historical/current source link:** the server reauthorizes the manager, resolves document/version/chunk IDs and creates a short-lived access URL only at click time. Do not persist signed URLs. Historical inactive versions display 'Historical — not current governing source'; offer a separately labeled current-version link where available. Never redirect an old page citation silently to the current PDF. If the old file is unavailable, show that fact. Use a separate manager historical-source endpoint; preserve the player's active-source viewer checks.

**Test AI Assistant:** choose original/effective retained question and prefill via short-lived same-tab/session handoff, clearing it after consumption; avoid raw question text in URLs/access logs. Do not auto-submit. Pass neither user identity nor old receipts/history. The normal manager test pipeline runs only after the manager submits.

**AI Assistant Management:** navigate using a validated document ID to its source-management context. This is navigation only; no processing, activation, editing or version change occurs from the review page. No arbitrary storage paths or external URLs from snapshot text are trusted.

## 9. Exact metric definitions

Let the reporting cohort be outcomes with origin=player_interface and completed_at in [start,end), observed as of T. Only retained captured rows count; this is not a claim of lossless traffic measurement. Eligible status comes from the existing runtime decision, not an inferred source count.

| Metric | Formula |
|---|---|
| Completed grounded answers G | COUNT DISTINCT id where final_kind=answer |
| Feedback-eligible answers E | COUNT DISTINCT id in G with feedback_eligible=true |
| Answers receiving feedback F | DISTINCT eligible IDs with at least one retained feedback event created_at <= T |
| Feedback participation | F / E × 100; N/A if E=0 |
| Current Helpful H | Number of F whose latest retained feedback event as of T is helpful=true |
| Current Not Helpful N | Number of F whose latest retained feedback event as of T is helpful=false |
| Helpful percentage | H / (H+N) × 100; N/A if denominator=0 |
| Unanswered U | DISTINCT outcome IDs with final_kind=insufficient_evidence |
| Substantive final outcomes D | G + U + C |
| Unanswered rate | U / D × 100; N/A if D=0 |
| Conflicts C | DISTINCT outcome IDs with final_kind=conflict |
| Conflict rate | C / D × 100; N/A if D=0 |

Clarification, protected, technical-error and manager-test outcomes are excluded from D. Answer IDs, not events or groups, are denominators. Select the latest event before filtering by Helpful/Not Helpful. Helpful → Not Helpful means F=1, H=0, N=1 and two history entries. Unvoted answers are unknown, not negative.

Feedback chronology uses created_at. If conflicting events have identical timestamps and no reliable persisted order, flag an ambiguous latest state instead of claiming UUID order establishes causality; exclude ambiguity from H/N and show the excluded count. Existing accepted events are not rewritten to add sequence numbers. Repeated identical events, if ever observed, are shown as stored and diagnosed, not silently removed from history.

Legacy/unlinked feedback has its own answer-level current-satisfaction summary and history with 'No parent outcome telemetry'. It contributes no completed-answer or participation denominator. Feedback-activity mode selects answers with activity in the date range, then computes their latest state as of T from all retained events, not only matching-value events in the range. Never mix that population into completion-cohort cards.

Full feedback/snapshot retention is 180 days; satisfaction/participation cohort selection is limited to that horizon and labeled retention-limited. Lightweight volume/rates can use 365 days. A health warning identifies incomplete capture; no invented zeroes or reconstruction from session logs. Group count is a separate workload metric, not a question/answer count.

## 10. Protected-intent demand

Approve lightweight protected outcomes with no raw/effective personal question, auth/member identity, receipt, group fingerprint or review detail. Classify only from existing guard output. Current code distinguishes raw/effective guard paths and does not supply a reliable semantic taxonomy of ratings, rosters and schedules: display an unspecified protected/live-data bucket plus existing guard-path counts, not fabricated topic categories.

Show those counts separately as future Live LMS Intelligence demand. They never create unanswered groups/cases or increase missing-rule rates. 'What is my DUPR?' is not a rules gap. Do not add intent-model calls or broaden guards solely for analytics. Later permission-aware ratings, rosters, standings, opponents, schedules and Match Setup/navigation remain a separate stage.

## 11. Conflict capture

Only a confirmed final kind=conflict automatically creates an occurrence, a conflict group and a High-priority New case. Capture the actual final response plus safe selected-source/evidence diagnostics already available. Candidate-level conflict hints alone do not create a case or increment C. A successful answer with an internal hint remains an answer.

Repeat confirmed conflicts join the conservative matching group, preserve each occurrence and show new activity. A reopened/active conflict case remains High unless a manager explicitly changes it with audit; new confirmed conflict should surface High again and record that escalation. Closed cases reappear with a recurrence badge but require explicit reopen. Do not run a second model call to decide whether to log a conflict.

## 12. Clarifications

Normal clarification creates only a lightweight clarification outcome; no question snapshot or review case. Clarification → eventual insufficient_evidence is represented by the final insufficient-evidence occurrence and relevant bounded resolver classification/subject. Do not store the conversation to connect the two, or label the earlier clarification a failure.

This design does not promise clarification-completion funnel metrics: those would require extra correlation beyond the proposed privacy-minimal outcomes. A manager may categorize a reviewed issue as clarification/wording without changing conversation behavior. Technical exceptions are operational errors, not unanswered rule gaps.

## 13. Security, roles and attribution

| Role | Access | Reason |
|---|---|---|
| Commissioner | Full review/reporting/workflow | Existing supervisory manager authority |
| League Manager | Full review/reporting/workflow | Owns official league guidance and quality resolution |
| Club Pro | No initial access | Current role is below league_manager; coaching role does not imply access to player question/audit data |
| Captain / Player | No manager reporting access | Keep existing player answer/feedback permissions only |

Use the existing trusted `authorizeAdminRequest(..., 'league_manager')` pattern on every list/detail/mutation/document endpoint; current permission hierarchy includes Commissioner above League Manager. Resolve roles from trusted server state, never editable user_metadata or client flags. UI hiding is not authorization. Validate assignees are eligible managers; derive actor from authenticated request, not body. Show manager reviewer attribution, not player identity by default.

Enable RLS on every new table; revoke direct anon/authenticated SELECT/INSERT/UPDATE/DELETE and default PUBLIC function execution. Use the service-role client only after server authorization. Service-role bypass means RLS does not replace endpoint authorization. Transaction helpers should be SECURITY INVOKER restricted to the trusted server role with fixed search_path; no browser-callable privileged reporting views/RPC. Keep functions narrowly scoped to validated fields and bounded operations. Reauthorize every historical document link; reject guessed IDs and arbitrary file paths.

New capture fields are allowlisted, bounded and redacted. Never store conversation history, credentials, receipts, signed URLs, vectors, raw model prompts or unrelated member data. Raw typed text can still include personal details despite guards: strip detected email/phone/credential patterns and omit unsafe free text when safe redaction cannot be established. Do not describe heuristic redaction as a guarantee of anonymous content. Restrict sensitive retained detail to managers; mask legacy content on read without silently rewriting accepted rows. Treat stored text as untrusted plain text, and use private/no-store responses. No bulk export or notification delivery in this scope.

Security basis: Supabase's documented distinction between table grants and RLS, and service-role bypass, informs this server-only design: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Securing your API](https://supabase.com/docs/guides/api/securing-your-api). Verify current platform details again during authorized implementation.

## 14. Exact initial retention policy

These are proposed policies for approval, not deletion instructions executed in this pass. Normal feedback history is append-only; a separately authorized retention task is its only planned deletion exception.

| Data | Initial retention and expiry action |
|---|---|
| Lightweight outcomes | 365 days after completed_at, then delete; nullable occurrence FK becomes null |
| Full no-source/conflict and occurrence detail | 180 days after first_observed_at, then redact question/output/source/resolver/selection payloads; preserve structural occurrence temporarily |
| Existing feedback events and their answer snapshots | 180 days after each event's created_at, then delete through privileged retention only; never synthesize replacement vote events |
| Structural occurrences | 365 days after first_observed_at; if referenced by a retained case, keep redacted structure until that case/history expires |
| Closed review cases and audit history | 365 days after closed_at, then delete together in dependency order; reopening resets the eventual closure clock |
| Open New/Reviewing cases/history | Retain until closed, with mandatory manager privacy review every 90 days; full occurrence detail still expires at 180 days |
| Group canonical text/title and route normalized text | Remove identifying question text after 180 days without an unexpired occurrence supporting it; delete obsolete routes and replace title with generic label |
| Unreferenced groups/routes | Delete after 365 days without occurrences or a retained case; respect merge redirects/history dependencies |
| Operational capture logs | Target 30 days, subject to verified platform capability; no question or user data |

Case notes can contain sensitive text: the 90-day review must remove inappropriate sensitive note content through a controlled redaction operation with a non-sensitive audit marker. Normal note editing still appends corrections. Do not retain raw question text in titles/audit JSON indefinitely as a workaround for payload expiry. Open-case retention is for workflow, not indefinite full answer retention.

A future daily bounded retention job processes expired details, feedback, eligible history/cases, occurrences, and finally unreferenced aliases/groups in explicit dependency order, with counts and retry safety. No broad cascade from document or member deletion to cases. Audit links from merges are checked before purging; clear eligible redirects in the same transaction where necessary. Where case history still references a group, retain its redacted shell until history expiry. Removing an expired fingerprint route means a later identical question may form a fresh group; show this retention limitation honestly.

All retention cutoffs are UTC instants. Export/archive, legal holds and long-term anonymized materialized aggregates are not in the initial implementation. Do not imply that expired full history remains available. Approve and validate the retention job separately before enabling any deletion of existing feedback.

## 15. Capture failure and operational visibility

The existing AI response must not fail because Stage 7 persistence failed. Compute the normal result once. Attempt a bounded awaited capture transaction with an initial 500 ms total telemetry budget; use actual cancellable DB/network timeout controls, not an abandoned promise that keeps uncontrolled work running. Benchmark the budget before production. At most one retry within that same budget and only with the same interaction ID. Never rerun retrieval/model generation or alter answer content because capture failed.

After timeout/failure return the normal answer/receipt and emit one sanitized structured platform log event: capture_failed, time, LMS version, capture stage and bounded failure code. No question, auth/member ID, receipt, credential, SQL payload or raw exception string. Logging failure does not recursively attempt database logging. A successful feedback insert remains successful if subsequent Stage 7 grouping fails; reconcile missing occurrences from actual retained feedback later. Capture and review writes never rewrite the accepted vote history.

Manager health combines recent successful outcome recorded_at with an **independent existing platform-log signal** over the last 15 minutes:

- Recording: recent successful persistence and no observed failures.
- Degraded: capture failures observed, even when some writes succeed.
- No recent confirmation: quiet/no recent outcome; not automatically healthy or broken.
- Unknown: independent monitoring signal unavailable or permission denied.

Expose only aggregate health/counts through an authorized server adapter, not raw logs. Phase 1 must verify access to the configured hosting log/monitor facility and its retention, without inventing a new logging database. If programmatic access is unavailable, retain an explicit Unknown state with a documented operator check/link; do not claim automated health coverage has passed. Resolve that operational choice before Phase 1 acceptance. Current platform entitlement/access has not been established by this documentation pass.

This is best-effort analytics, not guaranteed delivery. Lost unvoted answers/no-source requests cannot be reconstructed after a failed write. Show capture-health caveats on metrics. Durable queueing would require a separately approved design; an outbox in the same failed database does not solve independent persistence outages.

## 16. Proposed migration structure and backfill — prose pseudocode only

No SQL statement or migration file is authored here. The schema tables in section 1 are the concrete DDL specification. Future migration structure:

1. Verify the accepted feedback schema/grants/indexes and database capabilities without changing feedback data.
2. Create outcomes (A) and groups (C), including checks and keys.
3. Create occurrences (B), referencing the existing feedback table and optional outcomes.
4. Create fingerprint routes (D), cases (E), then audit events (F).
5. Add all explicitly listed indexes/unique constraints; do not add full-question B-tree keys or broad JSON indexes.
6. Enable RLS and revoke browser grants in the same migration boundary, before any application route is enabled.
7. Add narrow server-only transactional operations for capture/group allocation, reviewed-state mutation, merge/split and retention; revoke PUBLIC/client execute permissions, pin search_path and validate input sizes.
8. Validate fresh install, repeated application behavior, FK deletion semantics, grants and rollback compatibility in a nonproduction environment. Existing LMS-0715 must continue working with the additive schema present.
9. Deploy separately authorized capture code only after schema validation. No activation of manager UI until Phase 2.
10. Backfill and retention are separately controlled jobs with dry-run counts, bounded pages and idempotency; neither is hidden in schema migration execution.

**Capture transaction pseudocode:** validate allowlisted outcome → insert once by shared ID → if genuine unanswered/conflict, redact and normalize → lock digest → compare exact route text/allocate collision slot → obtain group → insert occurrence once by answer_id → ensure one case and required priority → append automatic history only on an actual change → commit.

**Feedback enrichment pseudocode:** let accepted feedback route finish its existing decision/write → upsert one occurrence from sealed/validated snapshot or stored event → correlate optional outcome → find/create grounded-feedback group → create case on negative signal → append only new Stage 7 history. On failure keep the accepted response and flag health; reconciliation retries from the existing event ID/answer ID.

**Manager mutation pseudocode:** authenticate authorized role → validate actor/target/payload and operation ID → lock case/group → verify revision and displayed activity cutoff → apply permitted transition → append before/after audit → commit; mismatched retry payload or revision returns a conflict for refresh, never silently overwrites.

**Merge/split pseudocode:** authenticate → lock all affected groups in stable order → verify same family/origin and no cycle → move memberships/routes according to explicit selection → update case disposition and first/last bounds → append operation-linked audit → commit atomically.

**Retention pseudocode:** compute approved cutoffs → select bounded eligible IDs → redact expired payloads → purge eligible child rows before parents → retain any still-referenced redacted shell → record aggregate success/failure outside request processing. No player path runs retention.

Possible backfill: create one legacy occurrence per existing answer_id using actual stored question/answer/source/version information, preserve all original feedback events, mark unknown completion time and legacy origin, group conservatively and create a case if a retained negative event exists. No-source/conflict parents are not fabricated. Validate same-answer snapshots for unexpected differences rather than choosing silently. First_feedback_event_id is only provenance; all events stay individually viewable until retention expiry.

Impossible reconstruction: historical total grounded answers, unvoted answer text, genuine no-source/conflict requests never captured, original generation timestamp, suppressed duplicate click attempts, protected/clarification volume, unrecorded model usage or lost telemetry. Existing feedback cannot establish those denominators.

## 17. Safest implementation sequence and likely files

**Recommend two separately reviewed releases.** Next numbers assume no intervening release. Neither version changes during this design pass.

### Phase 1 — LMS-0716 / 0.1.538: schema and capture

Create the six additive tables and protected transaction helpers; shared request identity; lightweight final-outcome observation; genuine no-source/conflict detail; deterministic grouping and automatic case seeds; feedback enrichment/reconciliation; protected aggregates; capture health and fixtures. No new manager navigation/page yet. Seed cases are data readiness, not complete manager workflow acceptance. Validate existing LMS-0715 works before and after schema installation.

Likely existing files under `C:/lwrpc-league-system/lwrpc-admin`:

- `app/lib/aiConversation.js`: optional trusted answer ID for feedback receipt, preserving sealing/expiry/eligibility and fallback.
- `app/lib/askLwrPlayerAnswer.js`: bounded server observation of existing final branches and available diagnostics; no new classification or answer decision.
- `app/api/ask-lwr/route.js`: request ID, timed fail-open capture, unchanged player payload.
- `app/api/ai-assistant/answer/route.js`: mark manager test origin; observe only its existing execution path.
- `app/api/ask-lwr/feedback/route.js`: Stage 7 post-success enrichment only; preserve accepted suppression, insertion, validation and response behavior.
- New server-only `app/lib/aiQualityCapture.js`, `aiQualityGrouping.js`, `aiQualitySnapshots.js` and related tests; final module split may follow existing conventions.
- New migration(s) in the established SQL delivery location after authorization; no filename/file created during diagnosis.

Do not change `aiAnswerGeneration.js`, retrieval, governing selection, prompts or corpus merely to enrich diagnostics. If a desired diagnostic is not exposed, report unavailable unless a narrowly reviewed observation-only return field is necessary. Do not add another model request. Runtime schema-missing/capture-failed behavior must preserve accepted player operation.

Phase 1 gate: full accepted regression suite, telemetry/identity/privacy/idempotency/outage tests, schema/RLS checks, legacy readability, protected separation and verified capture-health operational path. A separately approved production migration/deployment and safe acceptance run follow. Stage 7 as a whole is still not complete.

### Phase 2 — LMS-0718 / 0.1.540: AI Feedback & Review

Build the six manager views and exact metrics, detail/source links, review statuses/categories/notes, concurrent-edit protection, audited merge/split, manager test prefill, and explicit legacy reporting. Enable approved backfill and retention only with separate execution review. No new answer/guard behavior.

Likely additions/changes:

- New `app/ai-feedback-review/page.js` and focused manager UI components.
- New protected `app/api/ai-feedback-review` handlers for list, metrics, detail, workflow, membership and health; exact child route names decided during implementation.
- New server report/workflow modules, e.g. `app/lib/aiQualityReporting.js` and `aiQualityReview.js`.
- `app/components/AppHeader.js` and, only if needed, `app/lib/navigationActiveState.js`: add the separate exact-match System Setup route and preserve both existing tools.
- New manager historical-source access handler; leave player viewer authorization unchanged.
- `app/ai-assistant/console/page.js` only for safe optional prefill consumption, with no automatic submission or pipeline changes.
- Existing permissions/auth helpers reused, not a new role hierarchy; no Club Pro access expansion.
- Focused test files alongside `test/aiConversation.test.mjs`, `test/aiStage6Correction.test.mjs` and related existing regressions.

At each authorized implementation release update `app/lib/version.js`, package.json/package-lock.json and all normal current-version references plus roadmap and that release's implementation report. Preserve historical LMS-0714/0715 references. Read relevant installed Next.js guidance before editing Next.js code.

Deployment order after explicit authorization: additive schema → capture release → verify → manager release → verify. Roll back application functionality by disabling new capture/UI or reverting to accepted code; do not drop populated tables as an automatic rollback. A missing Stage 7 table must not take down Ask LWR. No SQL, migration, deployment or backfill is authorized by this document.

Later stages: permission-aware live ratings, rosters, standings, opponents, schedules, Match Setup/navigation. Also defer semantic/embedding clustering, broad exports, automated notifications and durable telemetry queues unless separately approved.

## 18. Complete test and production-acceptance matrix

| Area | Nonproduction regression / fixture | Production acceptance after separate authorization |
|---|---|---|
| Accepted baseline | Preserve all existing LMS-0714/0715 tests, including the prior 185-test baseline; retrieval, hierarchy, guards, conversation, viewer and mobile layout unchanged | Recheck normal grounded answer and existing manager navigation; Stages 1–6 remain accepted |
| Shared identity | Eligible receipt ID=outcome ID; retry same ID; genuine new request new ID; no browser ID substitution | One safe grounded answer correlates to outcome and subsequent feedback |
| Legacy | Feedback without parent readable; no fabricated time/origin/denominator; unexpected snapshot mismatch flagged | Read representative existing legacy answer with Unknown generation time |
| Feedback | Helpful → Helpful → Not Helpful → Not Helpful yields two events, one occurrence, one case; changing back can append third transition; no overwritten history | Owner's approved same-answer four-click test; inspect exactly two chronological events |
| Eligibility | Only existing eligible grounded path permits feedback; noneligible outcomes no receipt | Unvoted grounded answer increments eligible denominator, not negative count |
| Genuine no source | Stage 3 and Stage 4 no-applicable-evidence fixtures capture once without vote; retries no duplicate | One safe genuine no-source question automatically creates occurrence/New case |
| Conflicts | Final conflict High; candidate hint plus successful answer no case; recurrence/escalation audited | Inspect fixture evidence/results; never alter production corpus to manufacture conflict |
| Protected | Raw and effective guard paths produce text/identity-free aggregate only; no fingerprint/group/case | Safe protected question appears only in separate demand count |
| Clarification | Normal clarification metadata only; eventual no-source captures final occurrence with bounded context | Approved clarification/follow-up sequence preserves player behavior |
| Technical errors | Errors distinct from no-source; no rule-gap case | Use fixture results; do not force production outages |
| Capture outage | Missing table, permission error, timeout, connection failure preserve answer/receipt; bounded overhead; sanitized independent health | Confirm healthy operational signal and documented degraded/unknown handling without disrupting production |
| Feedback enrichment outage | Existing feedback success preserved; reconciliation creates one occurrence/case | Inspect capture health/reconciliation dry-run, no fabricated events |
| Deterministic grouping | NFC/whitespace cases, negation/numbers/league qualifiers, ball examples, version changes, forced hash collision and simultaneous inserts | Inspect recurring safe questions grouped conservatively |
| Redaction | Email/phone/credential-like input, identity placeholders, oversized payloads, unsafe free text omitted; no raw payload logs | Inspect safe stored columns without exposing member identifiers |
| Merge/split | Preserve occurrence IDs/snapshots; aliases and counts correct; duplicate operation, cycle, cross-family merge, stale revision rejected | Manager performs approved reversible merge/split on real review items only when suitable |
| Workflow | Every permitted/forbidden transition; closing reason, reviewer/cutoff, note attribution, reopen history, late negative signal and concurrent arrival | New → Reviewing → Resolved; fresh activity badge; explicit Reopen; audit inspected |
| Categories | All bounded categories and Other-note requirement; change does not rewrite occurrence | Change category on chosen item and inspect history |
| Metrics | Distinct IDs; latest-vote-before-filter; zero N/A; tied timestamp ambiguity; UTC boundaries/DST; legacy/origin/capture gaps; retention limits | Compare cards with read-only counts over the same cohort and as-of timestamp |
| Historical sources | Active/inactive/deleted version; never old citation silently mapped to new PDF; guessed ID rejected | Open available historical and current sources with clear labels |
| Review security | Commissioner/League Manager allowed; Club Pro/Captain/Player/anon denied; forged actor/assignee/IDs and direct Data API writes denied | Verify authorized page and denial using permitted role accounts; inspect grants/RLS read-only |
| Manager UI | Six views, filters, cursor ties/reset, empty/error states, keyboard/focus, mobile touch/wrapping, no double-highlight | Desktop and actual phone checks on manager page; player panel remains unchanged |
| Safe actions | Test prefill no URL text/no auto-submit; source link no processing/activation | Prefill then explicitly submit through existing test pipeline; navigation preserves source state |
| Retention | 180/365-day boundaries, FK/references, open cases, redacted titles/routes, old votes, merge shells, bounded retries | Dry-run counts reviewed before separately approving destructive retention execution |
| Performance | Representative volume query plans, index use, bounded JSON/rows/search, no N+1 downloads, capture budget | Inspect latency/capture-health baseline; do not load-test production without separate scope |
| Compatibility/rollout | LMS-0715 with additive schema; new code with unavailable schema; capture off; independent UI rollback | Schema then Phase 1 acceptance then Phase 2; no automatic table drop |

For each implementation phase run `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run verify:ai-pdf-server-bundle`, `npm run build`, and `git diff --check`. Preserve the entire existing suite; do not replace accepted tests with telemetry-only tests. If normal build compiles then hits the known `.next/cache/.tsbuildinfo` lock, use the established isolated clean production build and distinguish cache failure from compilation failure. Add database grant/RLS and transaction/concurrency tests in an isolated database; browser tests for Phase 2 and any touched Phase 1 user flow.

No test feedback, production outage, corpus alteration or synthetic production row is authorized in this design pass. During implementation acceptance use owner-approved safe interactions and isolated fixtures for exceptional cases. Final Stage 7 acceptance requires both phases and reporting/workflow production review; Phase 1 alone is not completion.

**End of complete Stage 7 design revision 2 — all 18 requested sections included. Governing design and the Unicode byte-limit correction approved; only Stage 7A / LMS-0716 implementation is authorized. No automatic production migration/deployment or LMS-0717 implementation.**

## Approved service-role default-privilege correction — 2026-09-05

Production preflight discovered postgres-owned default table ACLs granting service_role ALL. A narrower GRANT does not subtract inherited privileges, so it cannot by itself establish the approved minimum-access model. The owner approved an explicit REVOKE ALL on only the six new Stage 7A tables, including service_role, immediately followed by the intended grants: SELECT/INSERT for immutable outcomes and append-only audit events; SELECT/INSERT/UPDATE for occurrences, groups, fingerprint routes and cases. DELETE/TRUNCATE/REFERENCES/TRIGGER remain denied to service_role on all six. Browser roles remain denied and RLS remains enabled. Capture RPC execution remains restricted; no project-wide defaults or existing feedback/document/LMS ACLs change. This corrects implementation of the approved design, not its grouping/retention semantics.

Local tests now recreate production-like default grants before the exact migration, execute permitted/prohibited operations across all six tables, compare the existing feedback ACL, and prove replay restores the same final permission state even after isolated grant broadening. All 209 tests passed. Production migration then applied successfully; catalog comparison, effective ACL/RLS checks and 72 actual zero-row permission operations passed. Existing schema/ACL/default-ACL hashes and feedback/document/version/chunk data hashes were unchanged. Synthetic rows were precisely identified and cleaned up. Full results and limitations are recorded in the LMS-0716 implementation report.

Historical execution gate at this correction checkpoint: HMAC configuration initially could not proceed. The owner subsequently configured Production variables; deployment and resumed capture testing are documented in the current status and implementation report. Do not treat this historical gate as current. Do not start LMS-0717 or Live LMS Intelligence.

## Resumed acceptance operational decision and deferred scope — 2026-09-05

Use existing Vercel runtime logs with manual operator verification and explicit Unknown endpoint health; Hobby retains logs for one hour. The operator checks recent capture_succeeded/capture_failed events in the deployed project's last 15 minutes rather than inferring health solely from database recency. No new log database, drain or automated health feed was configured. Production successful capture intervals measured 27–75 ms across eight answers/clarifications/protected/manager requests. The default 500 ms cancellation/fail-open path returned the identical answer in 503 ms in isolation; this is not a deployed fault-injection result. Authenticated health role allow/deny/degraded behavior passed an isolated current-source harness, while live anonymous denial passed separately. The implementation report retains these two live verification gaps for acceptance review rather than silently waiving them.

The owner-approved future generic Stage 4 applicability/generation investigation and exact player disclaimer are recorded in the roadmap. Neither changes this governing Stage 7A capture design. Rank/authority must not substitute for direct applicability, and unsupported policies must not be inferred or incorrectly labeled grounded; a separately authorized later correction must be generic, without reimbursement/sunglasses/lost-property/waiver hardcoding. Future UI text: `Ask LWR PC AI may make mistakes. Check Official Sources for important information.` Small muted centered text immediately above the composer on desktop/mobile; no answer/source behavior change. Both remain unimplemented in LMS-0716.
