# LMS-0725 / 0.1.547 — Official Rules badge completeness correction

September 8, 2026. Application-only correction; STOP FOR REVIEW BEFORE DEPLOYMENT. Production remains NOT accepted; Q87–Q89 remain paused.

## 1. Exact root cause

The ordinary document path computes correct telemetry from `answer.selectedEvidence`, but `toPlayerAnswerResult` constructed a public result without processing provenance. `resultSourcePresentation` requires provenance for document badges and otherwise recognizes only legacy Live results. Thus both Season DUPR policy contrasts reached the player renderer with an Official Source section but no processing badge. The metadata was never constructed, rather than lost in JSON serialization. No question-string or routing patch was needed.

## 2. Affected result shapes

Audited the player flat result, shared View-As document execution, manager nested `{answer,retrieval}` response, deterministic eligibility results, legacy Live results, clarification/protected/insufficient/conflict results, and serialized public responses. Ordinary player/View-As documents and manager documents lacked provenance. The manager also had a separate hardcoded Live presentation branch and assumed policy eligibility responses had ordinary document diagnostics. These presentation branches now use the same trusted classification. Existing cached responses produced before this correction are not retrospectively inferred from text or citations; new answers carry the metadata.

## 3. Propagation correction

`aiResultSource.js` now owns the existing unchanged document-family calculation and a trusted document-execution provenance constructor. `aiQualitySnapshots.js` imports that same calculation, retaining existing `lwr`, `usap`, `mixed`, `unknown`, and `none` telemetry values and selection limit. Successful official-document results receive `DOCUMENT_ONLY` metadata at construction in `askLwrPlayerAnswer.js` and the manager answer route. This metadata survives JSON serialization and reaches the already-shared player/View-As badge helper. The manager renderer also uses the helper, preserves citations, and only renders a timestamp when actual Live processing supplies one.

No request-provided provenance is accepted. Neither question wording, intent name, citation count nor prose determines the new badge. Citations remain separate evidence provenance. Non-success player fallback response shape is unchanged. Eligibility service/security and Q78 persistence/recovery are unchanged.

## 4. OFFICIAL RULES controls

Permanent deterministic controls cover all ten required questions: Season DUPR establishment, lock and change; DUPR5 requirements and range; roster entry; Women's Weekday league start; PrimeTime age-reference; Weekday Rally applicability; and general Rally mechanics. The eight ordinary document controls exercise actual adapter, JSON serialization, player rendering and telemetry. The two DUPR5 policy controls execute the actual deterministic eligibility service with official-source fixtures and assert zero SELF reads. Routing and citation/retrieval behavior remain covered by the unchanged 120-case deterministic benchmark.

These badge tests use synthetic prose; they do not claim new generated-answer or production citation acceptance. Existing exact-evidence validation and current-source selection were not changed.

## 5. Hybrid controls

Both “Can I play on a DUPR5 team?” and “Am I eligible for DUPR5?” retain LIVE LMS + OFFICIAL RULES only when authorized SELF data is used. Authorized missing inputs retain truthful UNKNOWN behavior. Denial, ambiguity, unavailable season, unperformed lookup and source failure do not falsely become hybrid.

## 6. Live-only controls

SELF_RATING and roster results retain LIVE LMS DATA. Arbitrary policy wording or citations cannot relabel a Live result. Policy questions containing “my” remain document-only.

## 7. Telemetry/UI parity

Permanent assertions compare trusted document-family metadata against actual quality outcomes and require the document badge after serialization and rendering. Eligibility controls compare persisted family/provenance with badge and View-As diagnostic family. LWR, USA Pickleball, mixed official documents and approved-answer family fixtures are included. Actual manager eligibility rendering is covered separately. No Q78 payload architecture or retry behavior changed.

## 8. USA/LWR terminology

The owner's approved DOCUMENT/POLICY ONLY → OFFICIAL RULES terminology applies to successful LWR and USA Pickleball document processing, including date/guide answers. The label is the high-level processing category; exact citations and `usap`/`lwr`/`mixed` telemetry remain distinct. No new terminology was introduced.

## 9. Eligibility regression

The complete suite includes SELF-only RF, RF <29, RF=29 boundary, independent NR precedence, missing RF UNKNOWN, private-history exclusion and effective-user View-As regressions. No eligibility service, RF projection, authorization or SQL changed in this correction.

## 10. Q78 regression

The complete suite includes frozen payload/correlation, reconciliation, bounded retry, callback reentry, privacy, fail-open response and exactly-once logical-outcome controls. No intentional production timeout or production traffic was used.

## 11. Local verification

**PASS: 990/990 tests; 44/44 source-classification controls; 120/120 deterministic benchmark cases; lint (zero errors, 10 existing warnings); standalone typecheck; PDF server bundle; production build; git diff whitespace check.** No full generated benchmark. [Focused matrix](lms-0725-badge-focused.txt), [full tests](lms-0725-badge-tests.txt), [deterministic benchmark](lms-0725-badge-benchmark.txt), [lint](lms-0725-badge-lint.txt), [typecheck](lms-0725-badge-types.txt), [PDF verification](lms-0725-badge-pdf.txt), [build](lms-0725-badge-build.txt).

[Browser evidence](lms-0725-badge-browser.json): actual player Exchange rendered with compiled application CSS and synthetic response at 1440px, 390px and 320px. Badge visible; no horizontal overflow; accessibility-tree text present; citation keyboard focus retained. External requests blocked. Screenshot at 320px visually inspected. This bounded badge verification does not substitute for production authentication or a full application accessibility audit.

The first full run exposed old public-key allowlist expectations and a fallback-shape regression; the latter was removed and the allowlists updated for approved non-sensitive metadata. The initial build compiled but could not write an existing Next cache file (EPERM); local cache-write retry was used. No deployment occurred.

## 12. Model calls and cost

Zero OpenAI calls, zero embeddings, zero model input/output tokens; incremental model cost $0. No generated-answer benchmark was run.

## 13. SQL and integrity

No SQL, migration application/replay, schema/RLS/grant change, corpus/Approved Answer mutation, model change, production configuration change or business-data mutation. Version remains 0.1.547. This is local verification, not a fresh production integrity certification.

## 14. Production continuation after review

1. Deploy the reviewed application-only correction and verify READY; do not apply SQL or replay the RF migration.
2. First run DUPR5 requirements and range controls: OFFICIAL RULES, current citations, document telemetry, zero SELF reads. Stop on a material failure before correction.
3. Run personal DUPR5 eligibility, genuine SELF Season DUPR, establishment and change contrasts; reconcile badge, actual access and telemetry. Preserve RF/NR/missing-input security. Use the remaining exact badge contrasts only as needed for the approved acceptance scope, not an automatic full model benchmark.
4. If safely bounded, verify View-As policy/personal controls using the effective user's authority. Do not implement View-As parity.
5. Verify Q78 outcomes/correlations without manufacturing timeouts, and perform read-only production integrity checks including migration-once, RLS/grants, corpus/business data, maintenance, identity links and security.
6. Only after source-classification controls pass, resume Q87–Q89 only. Stop before correction on any material failure. Record actual model usage and avoid duplicate generations.
7. Mark production accepted only when all required gates pass. Do not start a new version automatically. Real LMS View-As parity and mini-LMS removal remain the next mandatory work after acceptance.
