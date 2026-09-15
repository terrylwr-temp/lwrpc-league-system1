# LMS-0730 / 0.1.552 — schedule Captain-name parity design

Status: DIAGNOSIS COMPLETE; STOP FOR REVIEW. LMS-0729 / 0.1.551 remains the accepted production/application baseline. No implementation, migration file, production SQL mutation, deployment, or OpenAI call. Only diagnostic artifacts and roadmap updated. Synthetic fixture setup runs solely in isolated local PostgreSQL-compatible memory.

## 1. Next version

Reserve LMS-0730 / 0.1.552. Do not bump package/version files until implementation approval. Scope is missing authorized schedule leadership display only; rank, contact-directory parity and broad Data API hardening remain deferred.

## 2. Exact reproduction

Run `node docs/lms-0730-reproduce.mjs`. [Results](lms-0730-reproduction.json) use accepted LMS-0726/0728/0729 SQL, the real projection adapter, the normal schedule's selection shape and the unchanged TeamScheduleModal name functions. No proposed correction is installed.

| Same effective fixture user | Normal selected Other Team | View-As selected Other Team | Team set |
|---|---|---|---|
| Captain, member ending 002 | Synthetic Person9, Synthetic Person6, Synthetic Person7 | absent | same two teams |
| Player, member ending 001 | same three names | absent | same two teams |
| Club Pro, member ending 005 | same three names | absent | same two teams |

Own team displays Synthetic Person2, Synthetic Person3, Synthetic Person4 in both modes. This exactly reproduces the reported own-team/other-team difference at SQL, loader and formatter level. Normal fixture rows model the deliberate normal query; this is not a fresh full browser or normal-session RLS test. Browser navigation, visual/mobile and populated match-field parity remain implementation acceptance gates, not claimed completed here. Production has no matches/standings at the accepted baseline; no real schedule rows were fabricated.

## 3–4. Root cause and first divergence

`captain-dashboard/page.js:2515 openDivisionSchedule` / `player-dashboard/page.js:1106 openDivisionScheduleForTeam` → `auth.js` chooses normal Supabase or View-As display client → identical nested teams/member select → adapter relationship lookup → shared TeamScheduleModal.

Normal mode resolves `teams.captain_member_id`, `co_captain_member_id`, `co_captain_2_member_id` to members. View-As `page_read` builds the dashboard using `lms_read_private.competition(jsonb,text,jsonb)` and `people(jsonb,text,jsonb)`.

The FIRST loss is competition's other-team JSON branch (accepted migration `20260909153000_lms0726_view_as_real_ui_reads_role_compat.sql:142`): only own viewer.teams retain leadership relationship IDs. The next loss is people's row predicate at line 151: other-team leaders are not generally included unless independently included as roster/played-match participants. Even an independently present name row cannot repair the missing relationship ID.

`viewAsProjectionClient.js:related` cannot resolve the missing FK; it returns an empty relationship. TeamScheduleModal's existing formatter sees no name and suppresses the Captains line. This is not stale assignment data or a rendering bug. Adding only names or only FK references is insufficient.

## 5. Normal authorization proof

Both normal dashboards deliberately request all three leadership joins in their division-schedule loaders, under their normal `requireRole` gates. The shared modal displays those names for whichever team the user selects. Captain and Player both load divisions through `buildActiveDivisionOptions`, without restricting the selectable active-division list to their own team. Club Pro uses the Captain dashboard by existing role hierarchy; multi-role uses the established highest effective role, not the initiating Commissioner's role.

Read-only production catalog confirms authenticated SELECT policies on teams and members, predicate true. This proves technical read capability, but is NOT the justification to expose all member fields: the explicit schedule query and renderer establish intended product display. The broader direct API footprint remains separately deferred. [Read-only evidence](lms-0730-readonly-security-evidence.json).

Player names are therefore applicable, not a Commissioner-only feature. No-target-Auth support continues through existing effective-member proof; no target session or role row is created.

## 6–8. Exact fields and existing display semantics

Authoritative relationships: `teams.captain_member_id`, `teams.co_captain_member_id`, `teams.co_captain_2_member_id`. Shared loader aliases: `captain`, `co_captain_1`, `co_captain_2`. Each new display object needs only `id`, `first_name`, `last_name`, `full_name`. Relationship IDs need not be added to the broad dashboard payload if scoped nested objects are returned directly.

Order: Captain, Co-Captain 1, Co-Captain 2. Format: full_name, otherwise trimmed first + last; comma-space joining. Existing formatter does not deduplicate repeated assignments. Club Pro is NOT a fourth displayed Captain. Null assignments / missing names produce no text, and an empty combined name hides the whole Captains line without failing the schedule.

**Privacy exception requiring explicit recognition in review:** the normal query includes email and the formatter uses it as a final fallback when all name fields are absent. This release must not add email to View-As. In that rare email-only case View-As will omit that individual, preserving the user's explicit privacy requirement; exact normal email-fallback parity is not claimed. Normal query/formatter must remain unchanged. Do not disguise an email as full_name. If review instead requires identical email fallback, stop: that conflicts with the approved no-contact scope.

## 9–10. Schedule scope and privacy

Do not add leadership for all teams in competition/people: that payload currently contains competition teams across divisions before local filtering and cannot distinguish the currently opened schedule.

Use a single selected-division schedule read. Server derives the eligible active team set from the validated effective viewer and the existing normal schedule entry/selector rules. No caller-controlled member IDs, role, actor, SQL projection, arbitrary team list or multi-division array. Active selector semantics must match `buildActiveDivisionOptions` (false excludes, not invented stricter null semantics). A target-linked initial/historical schedule entry must be checked against that existing supported entry path separately; it must not silently turn into unrestricted historical division access.

Within that approved division, only teams returned by the existing `is_active = true` schedule query can contribute leaders. Client merge intersects response team IDs with its already-loaded schedule teams; it cannot append any team/match/division/season. Server independently enforces the same set, not merely trusting that intersection. The existing published-match/byes/locations queries stay identical. No new schedule generation or record selection.

New leadership objects exclude email, phone, address, RF, ratings, notification preferences, roster/member-profile data. Use an ephemeral schedule overlay, not global members enrichment: otherwise another shared query could repurpose these rows. Existing authorized own-team contact behavior outside this overlay is unchanged. Selection changes discard the prior overlay; repeated opens read current assignments with no persistent name cache. Denial/failure does not expose old names from another division or viewer.

## 11–13. Reuse, SQL requirement and smallest safe correction

SQL IS REQUIRED: the browser cannot recover deliberately omitted private fields. Existing reader column grants already include all three team relationship IDs and members id/first_name/last_name/full_name. No new business-table grants, browser privileges, RLS changes, or write operations are needed.

Proposed contract (design, not implemented): add one private `lms_read_private.schedule_captains(p_viewer jsonb, p_args jsonb)` projection returning team ID and the three minimal nested aliases. Reuse existing context/actor/target locking, authorization and server-mediated `page_read` dispatcher with a narrowly validated `schedule_captains` contract. Do not change existing dashboard contract output. Guard exact args `{divisionId}` and validate scope server-side as above; no arbitrary member lookup. Revalidate context after data retrieval.

Proposed helper owner `lms_view_as_reader`, SECURITY INVOKER, fixed empty search_path, executed through the existing reader-owned private boundary; no PUBLIC/anon/authenticated/service direct helper EXECUTE. Existing wrapper remains SECURITY DEFINER with reviewed owner/ACL. Implementation review must show exact function definitions, owners/ACLs and migration SHA before production approval. Reuse existing temporary owner-switch/cleanup pattern only if required; final role memberships and schema privileges must match baseline exactly.

At application level, a small schedule-loader helper retains the normal SELECT unchanged. View-As performs its existing team read and requests the scoped leadership overlay, then supplies the same nested shape to TeamScheduleModal. Avoid changing the general adapter, normal auth, Captain assignment logic or shared rendering. A SQL-only broad enrichment is fewer lines but violates the selected-schedule boundary; it is rejected.

## 14. Normal regression plan

Freeze LMS-0729 application hashes and normal schedule JSON/render snapshots. Compare all non-name schedule fields before/after for the SAME normal users: opponent, dates/times/location/home-away, teams, matches, byes, status/results, sorting and active filtering. Normal name objects/formatter output must also be identical. Preserve normal Captain/Player/Club Pro and manager dashboards, rosters, Match Setup, matches, scores, standings, permissions. No production writes for testing. Run full deterministic tests, lint/build/type checks as appropriate; no generated model benchmark.

## 15. View-As parity/security matrix

- Same Captain, Player, Club Pro and multi-role effective users; normal source assertions plus actual shared browser modal parity.
- Own/other team leaders; all three assignments; missing assignment; missing member name; duplicate assignment; reassignment on reopening; long names.
- No-auth valid implicit Player; no role backfill; forged actor/target/role/member/team/division inputs deny.
- Active/inactive teams, another division/league/season, no-team viewer and historical entry rules; before/after team/match ID sets identical.
- New objects contain only the allowlist; email-only fallback remains omitted under the privacy exception. No cache/overlay crossover after selector change, target change, Exit or denied request.
- Normal navigation and View-As navigation, reload, supported `/captain-dashboard` and `/player-dashboard` routes followed by modal opening. The popup has no standalone schedule URL; do not invent one. Explicit Exit, dedicated origin, read-only denial, maintenance and original admin tab retained.
- LMS-0729 implicit Live identity, deterministic record and deferred rank; LMS-0728 implicit Player banner; LMS-0727 Rule 3.5 deterministic controls. Zero OpenAI calls.

## 16. Mobile/accessibility

Use unchanged TeamScheduleModal at desktop, 390px, 320px with three long names, missing names and email-only fixture. Compare normal/View-As visible name text, existing truncation/title behavior, mobile team selector, no horizontal overflow, keyboard selection/focus and existing modal close semantics. No View-As-specific label or new render format. If layout needs normal UI changes, stop for scope review rather than bundling them.

## 17. Expected changes after approval

- New exact reviewed migration: scoped helper plus narrow `lock_viewer`/`page_read` contract handling as required; no broad competition/people expansion.
- `app/api/view-as/read/route.js`: allow/validate one scoped page contract while preserving existing cases.
- Small shared schedule data-loader helper, called from Captain and Player schedule loaders only; `viewAsPageState.js` request access if needed. Preserve normal queries verbatim.
- Dedicated deterministic SQL/loader tests and local browser fixtures; version/package sequencing and release docs.
- NO TeamScheduleModal rendering, normal policy/RLS/grants, assignments, schedule generator, Match Setup, score, rank or AI production-model changes.

## 18. Controlled production sequence, later and separately approved

Approve local design/implementation scope first, including no-email fallback exception. Complete isolated production-matched SQL and browser gates; freeze exact candidate/migration SHA, test rollback and prove no privilege expansion/business mutation. Return local review before production authorization.

Later approved preflight: accepted LMS-0729 deployment/migration history/source/grants/maintenance and 19 business fingerprints; owner activity distinguished. Apply exact authorized migration once, verify scoped objects/ACL and fingerprints before app deploy. Deploy exact candidate. NORMAL LMS FIRST with legitimate owner Captain/Player checks; integrity checkpoint; only then targeted View-As parity. Final business/security/maintenance/context cleanup. On regression/extra data/privilege drift stop without automatic correction. Application rollback to accepted LMS-0729; separately reviewed SQL rollback restores only scoped function definitions, never business data.

Review disposition: bounded design ready for review, with privacy exception and unexecuted browser gates explicit. No request to broaden contact access or normal-LMS security scope.
