# LMS-0726 / 0.1.548 — normal security foundation and cutover plan

**FINAL-GATE SUPERSESSION:** [Atomic Add Player and cutover report](lms-0726-atomic-add-player-gate.md) governs this baseline. The generic mutation dispatcher/audit proposal is withdrawn; Add and Remove are separate bounded operations. Location-only Club Pro reads confer no mutation authority. Unknown required admission returns REVIEW_REQUIRED. Real-LMS View-As parity begins only after Phase 2 security acceptance. Historical migration counts/sequence below are superseded wherever inconsistent with that report.

**DESIGN / IMPLEMENTATION PLAN ONLY — STOP FOR REVIEW.** The foundation blockers remain prerequisites to production acceptance. No application implementation, production SQL, deployment, mini-LMS deletion or OpenAI calls in this pass. Existing accepted LMS-0725 behavior/model is unchanged.

**Owner decision received this pass:** when a required Add Player admission fact is unknown, **hold the addition for League review**. Do not create a roster row provisionally. This supersedes the current client-only missing-ID/rating provisional-add behavior. It does not authorize a new override, fabricated facts or automatic approval by a manager.

## 1. Evidence and deliverables

- [Protected read/write source manifest](lms-0726-foundation-dependencies.md): 292 read expressions; 162 write/storage/RPC expressions, including **112 direct browser write expressions across 18 page files**. Counts are static expressions, not network calls. RPC inventory includes read/server operations and must not be interpreted as 162 writes.
- [Annotated read dependencies](lms-0726-foundation-read-dependencies.json) and [annotated write dependencies](lms-0726-foundation-write-dependencies.json): exact file/line, selector/payload/filter expression, operation, static importing consumers, intended authority, current DML policies and replacement family.
- [Current grants/RLS](lms-0726-data-api-inventory.md), [exact catalog](lms-0726-data-api-catalog.json), [trigger/constraint evidence](lms-0726-write-boundary-metadata.json), [72-record isolated SELECT proof](lms-0726-direct-read-proof.json).
- [Current official Rules evidence](lms-0726-foundation-rules-evidence.json): active version `v20260908162017-f0aad5ad`; Rules 3.1–3.5, 4.5.1–4.8, 5.5–5.7 and championship participation conditions. Earlier [Rule 4.1.1/4.5 evidence](lms-0726-review-rules-evidence.json) supplies the complete NR rule.

The request to refine existing exact SQL into runnable migrations is conditional. Prior reports contain signatures/manifests, **not complete function bodies**. This pass supplies the proposed object/permission/transaction design; it does not represent incomplete SQL as an implementation-ready, tested migration. Function-body implementation, complete dynamic dependency tracing, role/race tests and rollback rehearsal remain implementation work after this review.

## 2. Field authorization matrix

Classes: PUBLIC-FIELD means a non-private field disclosed only through the product's intended public/shared channel; it does not automatically grant anonymous table access. SHARED-AUTH means existing authenticated competition information. SELF means the effective member. TEAM-MANAGED means an authorized assigned-team workflow. LOCATION-SCOPED means the existing Club Pro assignment joined through teams.home_location_id. MANAGER means intentional LM/Commissioner administration. SERVER-INTERNAL never serializes to the ordinary browser.

| Field/data | Authorized classes and exact purpose | Direct browser disposition |
|---|---|---|
| Member name | SELF; managed roster/authorized opponent or published participant display; minimal candidate identification; MANAGER | No generic whole-member table read; named DTO includes name only for its authorized population |
| Member email/phone | SELF profile; TEAM-MANAGED/LOCATION-SCOPED contacts where accepted capability permits; MANAGER | No unrelated/candidate contact access, including direct Data API. Use accepted bounded Live contact capability or equivalent locked page contract |
| Season DUPR | SELF; one relevant season/type in authorized roster/candidate/match workflow; MANAGER | No unrelated seasons or whole rating rows |
| PrimeTime Season DUPR | Same, selected division/season only | No extra alternate ratings merely because available |
| Raw RF | Existing protected Ask SELF eligibility; existing explicit MANAGER rating administration; proposed SERVER-INTERNAL admission validation only if approved | No general authenticated SELECT; no candidate/setup browser RF; no cross-person Ask SELF call |
| NR status | Existing raw-DUPR NR review flag for the authorized roster workflow; protected personal eligibility; MANAGER; proposed internal admission classification | Minimal status only. False raw-DUPR flag or numeric Season DUPR does not establish RATED |
| Team membership | SELF team context; TEAM-MANAGED/LOCATION-SCOPED roster/history; MANAGER; published participant display only where intended | No global private member/team graph |
| Private Team Detail | Assigned Captain/Co-Captain/Club Pro managed scope or MANAGER | No global private notes/leadership/contacts through base table |
| Public team identity | PUBLIC-FIELD/SHARED-AUTH: id, name, abbreviation, division_id | Preserve via shared/public DTO; no private team fields |
| Standings | Intended shared/public competition audience | Retain existing sound access and published/public route behavior; no new anonymous exposure inferred |
| Match information | Published minimal result/schedule/participant fields: PUBLIC-FIELD/SHARED-AUTH. Unpublished, score management, saved lineups: managed scope/MANAGER | Published display distinct from private Match Detail and saved lineup payload |
| Roster candidate | Managed selected-team search; id/name + one season/type rating + non-sensitive checks/UNKNOWN | No email, phone, address, DOB, full member profile, raw RF, raw rating arrays or candidate history |
| Auth/member role mapping | SERVER-INTERNAL identity; SELF navigation labels; authorized MANAGER/Commissioner administration | No global user_roles graph |
| Member billing/provider/IP/admin data | SERVER-INTERNAL or explicit MANAGER field contract | Never passed through profile/candidate/roster DTO by wildcard |
| Venue/location | Name/address/courts where intended for competition; Club Pro ownership mapping SERVER-INTERNAL or authorized administration | Published venue data remains available; no blanket release of pro mappings/free-text admin fields |

The [column manifest](lms-0726-read-fields.md) remains the explicit upper bound for each named contract, narrowed by this matrix and the final eligibility-state gate. Candidate internal filter inputs are not output. Use field allowlists in the database serializer and response schema; stripping fields only in JSX is inadequate.

## 3. Protected dependencies and what moves

**Protected cutover set P (11 tables):** `members`, `user_roles`, `member_season_ratings`, `teams`, `team_members`, `locations`, `matches`, `match_lines`, `line_games`, `match_lineups`, `team_byes`.

The previous eight-table minimum expands to eleven because locations contains private leadership mappings, and line_games/team_byes can otherwise bypass match publication/resource scoping. This is still within the inventoried roster/match/page boundary. Their intended public/shared fields remain served through the shared competition contract; no new public-data API is needed solely for View-As.

For P, migrate **all browser SELECT and DML** to fixed server read/write operations before revocation. That avoids repairing UPDATE/RETURNING failures by regranting sensitive SELECT. Retain existing trusted server handlers where their checks are sound, but have protected atomic effects use the common normal mutation boundary described below. Do not pass service-role clients into browser components.

Remaining six inventoried tables — seasons, leagues, divisions, division_lines, team_standings, score_sheet_templates — keep existing sound intended shared reads and RLS-controlled administrative writes unless a protected compound operation requires moving its consumer. Their administrator/Commissioner threshold discrepancies remain explicit review cases, not permission to broaden roles. No whole-database revoke. Existing public event routes/storage channels are not automatically changed; profile-photo storage dependencies are separately enumerated for the self-photo workflow.

The manifest identifies exact fields via current selectors and write expressions, including wildcards as **legacy evidence**, not allowed replacement fields. Static imports identify shared helper callers. Dynamic payload builders, dynamic imports, Realtime subscriptions, import/export helpers and stale clients must be traced/verified during implementation; the source census is not falsely described as runtime-complete. Phase 5 cannot proceed with an unresolved P dependency.

## 4. Direct write inventory and replacement classification

| Existing family / files (exact sites in manifest) | Intended authority / current enforcement | Replacement and View-As treatment |
|---|---|---|
| Team Detail roster insert/delete; team copy roster operations | Assigned team Captain/Co-Captain/direct Club Pro or manager via private.current_user_can_manage_team; current INSERT lacks admission validation | `roster.add` / `roster.remove`, and reviewed manager-copy admission path; atomic server checks. View-As DENY |
| Captain flex-date / match score / score-entry / scoring pages | Assigned match operations where existing RLS permits; manager for scheduling/finalization/export/reset | Fixed match/score operations; reload scope/state, whitelist fields and phase transitions, preserve normal validation. No generic match patch. View-As DENY |
| Lineup save API and direct lineup deletes | Existing `/api/match-lineups` verifies actor, match side, roster, individual numeric range, pair maximum, duplicate players, then upserts; direct policy checks only team | Reuse endpoint and validators; use atomic `lineup.save/clear`, fix validated-to-write race, no direct bypass. Review NR and location-scope mismatch. View-As DENY |
| Member Detail edits/activation; member import; phone normalization; rating-page DUPR-ID update | Manager except explicit SELF profile; self UPDATE policy currently permits all granted member columns | `member.admin.*`, bounded import batches, `profile.update/photo`; no client-initiated normalization side effect on read. SELF fields strictly separated. View-As DENY |
| Profile photo helper and storage cleanup | SELF photo; storage upload/update/remove plus member RETURNING | Existing photo workflow moved behind authenticated server adapter; server chooses object path, validates upload and updates approved photo field. No arbitrary object paths. View-As DENY |
| Rating create/update/delete/upsert | MANAGER RLS | Fixed `ratings.admin.*` operations, selected member/season; ordinary browser cannot mutate RF/ratings. View-As DENY |
| Teams create/update; locations merge/admin | Manager database policy; Commissioner location UI | Fixed manager/Commissioner operation preserving intended role; transaction includes protected member/team mapping changes. View-As DENY |
| user_roles via Member Detail/identityRoleWriter | Current policy Commissioner-only; helper can be called after team assignment | `roles.admin.*` Commissioner only unless a separate existing approved role assignment capability applies. Do not turn LM team edit into arbitrary role grant. View-As DENY |
| Byes, generated schedules, resets and multi-table score deletion | Current managed-team/admin predicates, client multi-step effects | Existing normal orchestration calls fixed transactional operations, validates full selected league/division scope. No partial reset after revoked dependency. View-As DENY |
| Seasons/leagues/divisions/line configs/templates/standings | Existing manager-controlled policies; some UI thresholds narrower | Retain sound RLS paths for non-P tables, or move compound operations to server when they touch P. No permissions broadened for uniformity. View-As DENY |
| RPC calls | Per existing RPC signature/ACL, not all writes | Keep accepted read/lifecycle/Ask operations; classify actual mutations individually. No blanket RPC allowance on isolated origin |

Every write must have a normal-origin gate, current authenticated actor, exact operation input schema, database resource authorization, server-derived protected facts, and a minimal output. Shared components receive mutation availability but View-As never receives a writable transport. Reject View-As origin/context replay even if a normal token is also supplied. No writes in shared loaders/mount effects.

## 5. Replacement read architecture — six functions retained

Normal identity derives from verified Auth; effective member is its trusted member binding. View-As derives from accepted validated target context. No client-selected effective subject or role. Normal and isolated transport adapters call the same read coordinator and the same two projections.

All signatures return jsonb, fixed empty search_path, explicit qualified names:

| Signature | Owner / security / EXECUTE |
|---|---|
| `public.lms_page_read(p_actor uuid,p_contract text,p_args jsonb)` | lms_page_reader / DEFINER / service_role + owner |
| `view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb)` | lms_page_reader / DEFINER / lms_view_as_executor + owner |
| `lms_read_private.read(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb)` | lms_page_reader / INVOKER / owner only |
| `lms_read_private.lock_viewer(p_actor uuid,p_proof jsonb,p_contract text,p_args jsonb)` | postgres / DEFINER / reviewed internal executors only |
| `lms_read_private.competition(p_viewer jsonb,p_contract text,p_args jsonb)` | lms_page_reader / INVOKER / owner only |
| `lms_read_private.people(p_viewer jsonb,p_contract text,p_args jsonb)` | lms_page_reader / INVOKER / owner only |

Revoke PUBLIC/anon/authenticated EXECUTE; private schema is not exposed. New runtime role is NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOINHERIT and owns no business tables. Exact column grants come from approved field contracts, not SELECT *. Existing View-As security helpers/credential stores remain protected. Candidate branches do not read RF. Existing Ask SELF/Live/source paths remain unchanged and are not reused as a general candidate lookup.

## 6–7. Replacement normal writes and Add Player — superseded

The generic normal-mutation dispatcher and generic audit table are withdrawn. See the [final atomic Add Player gate](lms-0726-atomic-add-player-gate.md) for the exact single-purpose Add/Remove proposals, normal-only identity, protected internal admission evaluation, structured REVIEW_REQUIRED without a roster row, transaction design and narrow successful-operation receipts/notification proposal. That report also identifies unresolved source/locking/side-effect gates; no implementation or SQL approval is implied.
## 8. Which facts belong to which stage

| Condition / official evidence | Proposed enforcement stage | Unknown handling / important limit |
|---|---|---|
| Actor authority, candidate/team identity, duplicate membership, roster lock | Every roster mutation | Deny invalid authority/lock; no client trust |
| Valid membership / required DUPR identity and applicable individual/NR placement | Admission, then recheck eligibility for actual play | Required unknown holds admission per owner. Do not mark NR ineligible solely for an ordinary range failure |
| Community assignment / Rule 3.5 own-community team AND available roster place | Admission when cross-community restriction is applicable | Missing authoritative season community/availability → hold if needed to decide this admission; no inferred roster capacity |
| League.only_home_community_players flag | Existing configured admission restriction, pending explicit Rules/config review | Preserve current restriction until reviewed; it is not a substitute for all Rule 3.5 conditions |
| Rule 4.5.1 NR adjusted rating / 4.5.2 highest adjustment across divisions | Establish/validate applicable season adjustment context at admission; use it for later lineup calculations | No invented adjustment or historical rating overwrite. Unresolved required placement/adjustment → League review |
| Rule 4.6 pair aggregate | Actual Match Setup/lineup submission, recheck if pair changes | Do not sum whole roster or reject roster membership because no partner is selected. Unknown required lineup fact holds lineup, not a fabricated pair failure at roster-add |
| Waiver/DUPR-club/age and other participation requirements (Rule 3; PrimeTime 6.3.2) | Before participation; any condition needed to establish legal division admission also checked at admission | The current schema does not establish every authoritative fact. Required unknown at the applicable gate holds; no new DOB fields or fabricated verification. Exact evidence mapping is an implementation-review prerequisite |
| Roster before play / retroactive addition, Rule 5.6 | Roster membership before match; explicit retroactive workflow must validate membership/account/rating | No silent retroactive override added to normal Add Player |
| Prior regular-season participation for championship (5.15.5 / 6.3.13) | Championship match/lineup eligibility | Not a prerequisite to joining an ordinary-season roster |
| Paddle, match conduct, match completion and DUPR-posting conditions | Match/score/export stage where actually enforceable | Do not pretend candidate admission certifies future conduct/equipment |

The Rules text establishes participation requirements but does not by itself define a new automated verification data model. Required facts without an authoritative representation remain holds at their applicable stage. This can intentionally block admissions that current client code allowed; the owner chose that behavior. No hidden provisional approval is retained to make a test pass.

Existing Match Setup endpoint is useful: it already validates selected match side, actual team roster, duplicate lineup players and pair maximum. It currently reads only numeric ratings and performs a later upsert; it does not implement the complete RF/NR distinction or a single validated transaction. Reuse its UI/validation intent, replace the protected database effect with atomic normal mutation, and review the applicable NR algorithm at lineup stage. No separate View-As write implementation.

## 9. Manager overrides

Established current behavior: manager can administer locked rosters and override the configured home-community restriction; the client permits missing-ID/rating additions for ordinary Captains and sends information-check alerts. No reviewed general audited eligibility override was identified in these paths.

Preserve explicit administrative authority only where intended; do not convert it into a bypass of known ineligibility/unknown required facts. Owner's new hold decision replaces the missing-information provisional-add behavior. A new override would need exact condition scope, authorized role, explicit reason, immutable audit and no View-As access, plus separate approval. **No new override is proposed in this release plan.**

## 10. Phase 1 SQL proposal (additive)

Proposed generated migration slug `lms0726_security_foundation_additive`. Create through migration tooling during implementation; timestamp unassigned now.

Objects: six read functions/private read schema/read executor; one proposed normal mutation function/normal writer; one proposed internal audit table; additive `lms_view_as('page_read')` delegation. Exact signatures above. Grants are explicit columns/actions needed by fixed contracts; no ALL TABLES grant, no PUBLIC default EXECUTE, no browser schema access. Read executor remains SELECT-only. Normal writer receives only fixed-operation table DML and required SELECT, including internal admission facts; it cannot mutate arbitrary business tables through a supplied name.

Use role-specific RLS policies for the restricted executors; they do not themselves select the effective user, so fixed code must enforce actor/target/resource predicates. Retain normal browser policies initially for compatibility. Preserve accepted View-As helper owners, context/credential isolation, existing maintenance and mutations denial. Do not edit historical migrations.

Preconditions: accepted baseline catalog/hash, explicit command/field matrix, unknown-hold decision embedded, no unexpected function/policy drift. Test apply/replay/second replay/rollback, no browser EXECUTE, identity and relation races, admission idempotency and no sensitive output. Missing operation body/field mapping fails the implementation gate; this report is not executable SQL for those missing bodies.

## 11. Application cutover and Phase 2 privilege proposal

Migration B slug `lms0726_security_foundation_cutover`. Only execute later after all P browser read/write consumers have replacement paths deployed and verified. For the eleven P tables, proposed exact permission transition:

```sql
REVOKE ALL PRIVILEGES ON TABLE
  public.members, public.user_roles, public.member_season_ratings,
  public.teams, public.team_members, public.locations,
  public.matches, public.match_lines, public.line_games,
  public.match_lineups, public.team_byes
FROM anon, authenticated;
```

This removes table-wide SELECT/DML and nonessential privileges such as TRUNCATE/REFERENCES/TRIGGER/MAINTAIN together; these browser roles no longer need base-table P privileges after migration. Current metadata has no separate anon/authenticated column grants. Recheck at cutover and revoke any intervening browser column grants explicitly or reject drift. Check inherited/PUBLIC privileges as well; the postcondition is effective denial, not merely an ACL statement. Leave service_role and explicitly reviewed executor access intact; neither role is exposed in the browser.

Existing browser RLS policies on P may remain as defense-in-depth/history until a reviewed cleanup; without table/column privileges they do not confer access. No USING(true) browser policy is used as a confidentiality control. Do not change sound RLS on the remaining six tables or unrelated event tables. Legitimate public/shared fields of P now come from fixed server projection/public-display paths with their existing intended audience. No permanent safe-column exception is needed for browser writes because P writes migrate too.

This is a **conditional SQL proposal**, not permission to run a blanket revoke now. Only the listed objects have proven dependency-driven cutover scope. Any dependency discovered outside P is reviewed before expansion. Effective-privilege checks plus negative SELECT/DML/RETURNING/RPC tests must certify the final state. Views/RPCs that can expose P must be covered by the implementation dependency gate; text search alone is insufficient.

## 12. Compatibility window and deployment order

Prebuild and verify all artifacts in an isolated production-matched environment before production approval. Use one bounded normal read/write transport feature switch, not duplicate domain loaders. It selects old transport or shared server transport during the transition; remove the old transport after cutover acceptance.

Proposed production compatibility window: **15 minutes maximum from Migration A commit until Migration B completion/negative verification**, subject to separate controlled release approval. During that window, current old Data API exposure remains; do not claim the additive deployment is secure. Prepare exact preflight/canary/revoke commands and a compatible fallback build before starting. No long-running parity development or benchmarks in that window.

Order: A additive objects → deploy/activate already-tested normal shared-read/write consumers → verify targeted normal role workflows → validate accepted effective-context binding against the same contracts with real-UI activation held → B privilege cutover → direct negative and positive public/normal tests. The existing mini remains the visible View-As interface until foundation security and later real-page parity gates pass.

If B cannot be safely completed by the deadline, **fail the release and stop**. Do not blindly revoke before replacement consumers are ready, or quietly extend the window. Before B, revert application/unused additive objects to the pre-release state and report the still-existing exposure as unresolved; this is not a security fix or success. Do not leave new/old dual paths indefinitely. After B, use the secure compatible fallback/maintenance procedure below; do not restore broad RF/email grants automatically. A release-specific measured rehearsal may show 15 minutes infeasible; then revise/review the window before production, not during a silent overrun.

## 13. Rollback compatibility

Before B: old permissions still support accepted old app; roll back transport/build first, then remove unused additive objects after dependency checks. Record that exposure remains at baseline and the foundation release failed. Do not delete audit evidence or accepted security history.

After B: rollback only to a **pre-tested compatible build that also uses server read/write paths**. Old direct-browser builds are incompatible. Prefer roll-forward; if necessary use an explicit maintenance state while restoring the compatible build. Application maintenance alone is not a Data API security control; tightened database permissions remain. Any restoration of broad grants is an explicit owner-approved security rollback, not an automatic technical fallback.

Replay validates exact signatures/owners/ACL/search_path/policy/table shape and definition hashes. Identical replay succeeds; drift aborts. Apply A/B separately in transactions, and test failed halfway application, stale client, aborted B and recovery. No CASCADE over unknown dependencies.

## 14. Security and normal regression matrix

All entries below are **required future controls, not new test passes**. Existing exposure proof remains FAIL until correction.

| Area | Required acceptance |
|---|---|
| Player direct P queries | Unrelated email, raw RF, unrelated ratings, private team/member graph DENIED |
| Captain direct P queries | Candidate email/raw RF, unrelated ratings/private teams DENIED; no indirect RPC/view bypass |
| Club Pro | Out-of-scope private data DENIED; assigned/home-location workflow PASS |
| Shared/public data | Intended standings, team identity, published results PASS through correct audience/field contract |
| Browser function calls | Six read internals and normal mutation function denied to anon/authenticated; no target/actor forgery |
| Normal Player | Dashboard, self profile/rating, teams and published activity PASS |
| Normal Captain/Co-Captain | Dashboard, assigned Team Detail, Manage Roster, cross-community candidates and Match Setup PASS |
| Manager/Commissioner | Member/rating/team/import/scheduling/scoring and approved role/location administration PASS; no accidental role grant broadening |
| Add Player allowed | Authorized actor + authoritative admissible player → ADDED once |
| Add Player denied/held | Unauthorized → DENY; known required failure → DENY; unknown required admission fact → VALIDATION_REQUIRED and zero roster insert |
| Forged input | Browser-supplied rating/NR/role/eligibility ignored or rejected; server facts decide |
| NR/pair | Numeric adjusted Season DUPR can coexist with NR; pair aggregate enforced for actual lineup, not whole roster; no guessed partner |
| Race/idempotency | Role removal/addition, location change, roster-lock change, candidate/rating change and retries cannot bypass atomic checks |
| View-As | All writes including new mutation transport DENIED; same candidate states/read DTOs; no real-actor breadth |
| Cutover | No remaining P browser calls; stale clients fail closed/reload; no fallback to old SELECT; compatible rollback PASS |
| Member Detail button | M01–M15 action-row/style, real LM/Commissioner + valid target only, no gap, confirmation and isolated-tab flow, desktop/390/320/accessibility |

Positive tests must run before B and again after B. Direct negative tests are database/PostgREST-equivalent with synthetic roles/fixtures first, then only approved safe production acceptance. No destructive production probes. Existing AI deterministic contracts and model/cost policy remain unchanged; no OpenAI generation needed.

## 15. Normal-user change summary

Unchanged intended experience: authorized assigned-team/Club Pro work, Player dashboard, legitimate cross-community candidate discovery, manager administration, published/shared competition access, current normal mutation purpose, and accepted Ask/View-As infrastructure.

Explicit changes: protected base-table reads/writes no longer work from browser credentials; old unrelated private access disappears; missing required admission information now holds with no provisional membership; misleading full Eligible label becomes UNKNOWN/qualified condition status; mutation facts are reloaded atomically; stale clients must reload or fail closed. No automatic eligibility override, new Auth account, RF candidate entitlement, anonymous audience expansion or AI change.

## 16. Exact eight-phase implementation sequence

1. **Replacement server reads/functions:** freeze exact field/domain command manifests; implement/test Migration A (six reads plus proposed separate atomic normal mutation/audit), trusted viewer and internal eligibility boundary. Gate additional write function approval before coding it.
2. **Normal consumer migration:** move every P read/write/helper/import/RETURNING dependency to shared server contracts; retain sound non-P RLS. No UI parity implementation/deletion before the foundation paths are working.
3. **Normal validation:** Player/Captain/Co-Captain/Club Pro/manager workflows, unknown-hold admission, NR/pair stage, races, permissions, idempotency, audit, static+network dependency proof.
4. **Shared effective-context integration:** stage the SAME contracts for validated View-As, using existing protected boundary; deny mutation transport. Keep real-UI production activation held until foundation cutover passes. This is not a second domain loader or a separate mini replacement.
5. **Privilege tightening:** execute approved A/app/B production sequence only after readiness and later release approval; no revoke while dependent consumers remain.
6. **Bypass denial proof:** role-level direct SELECT/DML/view/RPC negatives, intended public/shared positives and normal workflow regressions. Foundation cannot be accepted while an old bypass remains.
7. **Real LMS View-As parity:** after foundation correction, activate/reuse actual shared screens, validate desktop/390/320, navigation, data, expiry/Exit, no-Auth targets and Member Detail action-row requirement.
8. **Mini deletion and cleanup:** only after full parity/security proof, delete obsolete mini presentation/navigation/loaders/CSS/test fragments and snapshot consumers, review forward snapshot retirement, preserve security tests/history. Remove temporary transport switch/legacy browser paths; lint/build/tests/docs and controlled final acceptance.

**Review status:** exact implementation/cutover plan prepared; owner UNKNOWN-hold decision incorporated. Existing read function bodies were not sufficient to generate tested runnable migrations in this design pass. Review the proposed seventh normal-write function/audit object and command/field implementation scope before implementation. Production remains accepted 0.1.547; LMS-0726 remains blocked until its security foundation is implemented, tested and accepted through the approved sequence.

