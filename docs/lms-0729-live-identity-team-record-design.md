# LMS-0729 / 0.1.551 — Ask LWR Live identity and team-record design

Owner decisions accepted; see [rank-authority diagnosis and final contracts](lms-0729-owner-decisions-rank-review.md). That addendum supersedes provisional stored-rank recommendation and identity/visibility review choices here. View-As feedback remains disabled. Implementation remains on hold for rank/scope review.

**DIAGNOSIS COMPLETE — STOP FOR DESIGN REVIEW.** September 9, 2026. LMS-0728 / 0.1.550 remains the accepted, unchanged production release. LMS-0729 is reserved in this design/roadmap only; package/version files are not changed. No implementation, SQL mutation, deployment, account/role mutation, standings rebuild, or OpenAI call was performed.

Evidence: [read-only production catalog/function snapshot](lms-0729-read-only-design-evidence.json). Production at 21:12:37 UTC has zero matches and zero standings rows. Populated data behavior below is established from accepted code, not claimed tested against live results.

## 1. Version and bounded scope

Next sequence: **LMS-0729 / 0.1.551**. Two connected changes: correct normal authenticated Live member identity without a mandatory stored Player role; introduce deterministic team-record/standing queries. Keep normal operational screens, calculations, scores, writes, account provisioning, and broader Data API hardening outside this release.

## 2. Exact normal identity root cause

Normal path: serverSupabase.authenticateRequestIdentity verifies the bearer token online with Auth.getUser, rejects anonymous identities and invalid/expired/mismatched claims, and returns an Auth user UUID plus a session-bound receipt binding. liveLmsService then calls service-only public.ai_live_lookup, whose current private lookup signature is **ai_live_private.lookup(uuid,uuid,jsonb)** (actor, request, query). The old migration's session argument is not the current production signature.

The current SQL selects member and role from user_roles JOIN members, requiring user_roles.user_id = verified actor and active member = true. No row means denied, before SELF/team resolution. Thus (a) a genuinely implicit Player has no row from which to derive member identity; (b) an existing member-side role with missing Auth linkage also cannot resolve. These are different states. The query also has no explicit role-precedence order and must not treat an arbitrary row as authoritative.

Normal document authorization instead uses email/member lookup and Player baseline in serverSupabase; its permissive inactive/null/duplicate fallbacks are unsuitable for copying into a protected Live resolver. Account-entry prospective linking only updates existing role rows; it cannot link an absent row. View-As already has a protected selected-member identity and LMS-0728 now permits otherwise-valid no-role Player. That does not fix normal Auth-to-member resolution.

**Second occurrence:** production public.ai_live_feedback(uuid,uuid,boolean,jsonb) independently requires an Auth-linked role/member row. Lookup-only repair leaves implicit Player feedback broken. Manager review remains explicitly manager-only and must not gain baseline access.

## 3. Smallest identity proposal and security boundary

Propose a narrow transaction-scoped private normal identity resolver returning only status, memberId and effectiveRole to trusted SQL callers:

- Preserve verified Auth actor from the existing server authentication; never accept browser member/role/email as identity.
- For existing durable role links, require one unambiguous active member, no conflicting member/Auth mappings, recognized roles with deterministic existing precedence. Preserve explicitly assigned management authority; reject ambiguous mappings rather than choosing one.
- For genuinely zero-role members, propose strict **read-only verified-email identity matching**, explicitly for review: read authoritative Auth email internally, require confirmed email, no pending change, non-anonymous/non-deleted/non-banned account, exact normalized unique Auth/member match across all rows, active member = true, and no conflicting linkage. Return baseline Player only when the member has zero role rows.
- Do not grant Captain/manager authority from an unlinked role found merely by email. Return identity-review-required for incomplete/conflicting nonempty-role linkage. No repair/backfill/account writes as a side effect.
- Missing, inactive, null-active, duplicate, unknown-only role, unconfirmed email, pending change or conflict → fail closed with useful Live identity limitation, never document fallback.
- Serialize identity inspection using existing identity writer coordination keys, then re-read under locks in the same lookup/feedback transaction. Require synthetic races for email change, deactivation, role insertion/link change and deletion. No broad UPDATE privilege to obtain locks.

This is a new bounded identity policy proposal, **not** an already-approved email fallback. Existing identity_repair_private.eligible contains useful strict confirmed/unique/conflict checks; eligible/take_keys are postgres-only invoker helpers. Do not grant service_role direct access to those helpers or Auth tables. A narrowly coded private SECURITY DEFINER resolver owned by postgres can reuse them internally, with empty search_path, no dynamic SQL, fixed minimal output, and EXECUTE only to service_role (normal trusted SQL path). It must not invoke repair/link functions. Review and isolate this function before approval. Alternative if read-time email binding is rejected: a separately reviewed durable identity mapping/provisioning design; do not silently create one.

Use the same resolver in lookup and feedback. Keep existing explicit-person field permissions, RF self-only rules, manager-origin restrictions and audit semantics. Normal login/navigation code stays unchanged.

## 4. Intent architecture and wrong-route hard gate

Add bounded semantic classification before generic SELF_TEAM matching and before any RAG entry:

- TEAM_RECORD with metric record/wins/losses/played/points/place.
- DIVISION_LEADER for “Who is in first place?” with authorized division clarification.
- TEAM_STANDING_EXPLANATION for personal “Why are we in third place?”; never treat the claimed ordinal as fact.
- Pure policy questions retain document classification: how standings are calculated, how ties are broken, points awarded per win.

Normalize straight/curly/missing possessive apostrophes and recognize “our record,” “we won/lost/played,” not just the word team. Exclude unrelated world records, medical records and generic win-point policy. A recognized dynamic question with unavailable capability, failed identity, missing data, expired choice or technical failure returns a **Live limitation**, never null/document insufficient-evidence. Apply this invariant in normal and View-As routing and continuation handling, not only one regex.

## 5. Authoritative structured source and existing exposure

Existing source is **public.team_standings**, keyed uniquely by league_id/division_id/team_id, with season via team → division → league → season. It stores counts, points and rank. No standings-specific RPC/view was found in the inspected public/ai_live_private/lms_read_private function inventory.

standingsRebuild.rebuildDivisionStandingsForDivision calculates and persists this table; it also updates matches and match_lines and deletes/reinserts standings. **Never call it from Ask LWR.** There is no need to rebuild or rescore to answer.

Production RLS enables authenticated SELECT true on team_standings; anon has table privilege but no applicable SELECT policy. This is authenticated LMS information, not demonstrated anonymous public data. Player-accessible standings UI and division selectors support intentional competition-result visibility. It does not imply public member/contact/rating/roster access.

## 6. Record definition

Read existing fields verbatim: match_wins, match_losses, match_ties, matches_played, standings_points. Display W–L, adding ties when nonzero; identify team, division, league and season. Matches are team matchups, not individual line/game wins. Points are standings_points, not raw points_for or a new win-points formula.

Absent standings row → “No standings record is available for [team/context] yet,” not invented 0–0. Existing zero-valued row → zero completed recorded matchups. Preserve decimal standings points. Negative/inconsistent/nonfinite fields or inconsistent league/division/team joins → data limitation; never repair from raw games.

checkedAt means retrieval time, not confirmation the table has been rebuilt recently. updated_at can support freshness reporting only through reviewed grants/projection; it is not a transactional freshness guarantee. Existing delete/reinsert rebuild can expose an empty/partial snapshot; do not fill missing rows. No rebuild atomicity redesign here.

## 7. Proposed authorization matrix

| Effective user | “My team” candidates | Named team / division record |
|---|---|---|
| Explicit or implicit Player | Current authorized roster relationships | Minimal competition standings already exposed to authenticated Player UI |
| Captain | Roster plus trusted captain/co-captain assignments; all applicable teams | Same authenticated competition projection |
| Authorized Co-Captain | Trusted co_captain_member_id/co_captain_2_member_id assignment, not arbitrary browser label | Same competition projection; no new member-data access |
| Club Pro | Roster or actual club_pro_member_id team assignment; role alone does not identify a team | Same competition projection |
| League Manager / Commissioner | Personal roster/assigned leadership for “my”; broad management scope is not personal membership | Existing broader competition access, still bounded query/projection |
| View-As | Same matrix using effective target only | Same effective competition visibility; real actor never widens it |
| Anonymous / invalid identity | Denied | No new anonymous endpoint |

Co-Captain is a team assignment, not a separate global role in ROLE_LEVELS. This design does not change roster controls. Revalidate each referent against authoritative current scope. A named team uses an exact bounded resolution, not arbitrary ID authorization.

For review: adopt authenticated standings visibility for this minimal capability, supported by RLS and Player UI; do not generalize that permission to any other Live capability. If some standings are intended private/unpublished, the current table has no per-row publication flag; a new privacy policy requires separate review, not inference from grants.

## 8. “My team” resolution

Start from resolved member, never community/location or administrator dashboard selection. Join retained active team_members membership and actual leadership assignment columns. For current default require applicable active team/division/league/season. Management authority alone must not turn every team into “my team.” For a leadership-only member use actual assignment, with existing recognized role/authorization validation where required.

One candidate → answer. More than one → clarify. None → “I couldn't find a current team linked to your LMS account.” A server-validated dashboard context may narrow choices; an arbitrary browser-selected team cannot.

## 9. Clickable clarification

Reuse encrypted, expiring, session-bound Live receipts and aiClarificationChoices. Choice labels include team — division, league, season; never omit season for same-name teams. Five choices per page plus bounded continuation, following existing architecture. Include metric and intended scope in sealed context so a click cannot change wins into roster or SELF into named-person lookup.

Extend the current option/argument/receipt allowlists deliberately for division and historical scope, not arbitrary JSON passthrough. Revalidate all choices when selected, even with a valid receipt. Stale/forged/wrong-user/wrong-View-As-context choices deny or re-clarify without leaking hidden names.

## 10. League and season resolution

Default current: applicable active-season choices, no arbitrary first season/date guess. Preserve Weekday/PrimeTime/Saturday and divisions independently.

Explicit historical season: resolve the requested season even if inactive; do not redirect to current. Read retained historical competition standings under the same authenticated-result permission. “My historical team” requires a retained trustworthy affiliation; current community or current team is not proof of past membership. A deleted relationship cannot be reconstructed: ask for named team/season or report missing affiliation. Retained inactive membership is a candidate for historical review, not proof of exact participation dates.

Same names across seasons/divisions always clarify unless explicit context uniquely identifies. No cross-season aggregation. “Last season” with ambiguous league chronology clarifies rather than selecting global latest.

## 11. Place/rank: existing inconsistency and review gate

There is **not one uniform display-ranking path**:
- Rebuild sorts configured nonempty tiebreaks then team name and saves sequential rank.
- MiniStandingsLeaders and Captain standings use stored rank.
- Admin division popup orders stored rank, filters inactive teams, then displays index+1.
- Player/full standings use sortStandingsByDivisionRules, which supplies default rules and falls back to stored rank then name; displayed row position may differ.

Recommend Ask LWR report **stored official rank from the standings snapshot**, matching the rebuild/mini-leader authority, with no second ranking calculation. Reuse standingsRuleValue/standingsTiebreakRules only for explanation/comparison when approved. Detect missing/nonpositive/duplicate ranks and relevant disagreement with the existing display sorter: return record fields plus “Current place needs League Management confirmation,” rather than choosing a competing place. Do not renumber after hiding an inactive team; label stored position.

**Review decision required:** endorse stored-rank authority with this limitation, or specify an existing display path as authoritative. Do not claim universal UI parity or modify the normal ranking algorithms in this release.

## 12. Incomplete, forfeit, retirement and other results

Accepted rebuild considers status=completed AND score_status=verified. Future/scheduled/incomplete/cancelled/postponed rows outside that conjunction do not count. It does not separately require is_published for its verified-match calculation; published schedule is used for final bye adjustments. Do not add a different publication rule to Ask answers.

Special match result types are forfeit and weather. They use recorded match-level scores; higher score wins, equal scores add ties. Missing/nonfinite special scores stop rebuild. Retired outcomes are handled at game level alongside forfeit_home/away in gameSummary. Do not infer the side's meaning from the enum name independently of accepted scorer.

Normal played matches resolve winner from saved winner, then team points/line wins/game wins/raw points, with a final home/away fallback; do not invent ties based on equal visible points. Bye adjustment can add average points only after the published schedule is fully completed/verified and the existing mixed-bye conditions hold. Ask reads the resulting stored points; it never awards another adjustment.

No new treatment for a hypothetical top-level retired status: reflect stored results and flag absent data. These findings describe existing implementation, not a new policy endorsement.

## 13. Zero-model architecture

Dynamic classifier → online authenticated identity or protected View-As context → bounded read projection → deterministic formatter → LIVE LMS DATA and accepted telemetry. Answer-model calls=0, embedding calls=0. Exceptions/timeouts/unsupported paths remain Live. Mock provider functions must throw if invoked in these tests.

Only public-policy requests may use the existing document architecture under the governing cost policy; no calls authorized by this design. No Live facts or raw personal question should be forwarded as model prompt/context.

## 14. Source classification

Team record, count, points, place, leader, no-team/no-record and Live capability limitation use LIVE LMS DATA. Pure policy uses OFFICIAL RULES only with actual governing evidence. Do not attach official citations to dynamic values. Telemetry records intent, status, effective relationship, source family, release and numeric timings/zero model tokens; no names, emails, RF, roster payloads or prompts for cost accounting.

## 15. Hybrid “Why are we in third?”

Recommend bounded two-part deterministic answer in this release: resolve actual stored place, show approved competition comparison values and configured tiebreak order from the existing helpers. This is LIVE LMS DATA (configuration is not itself an official document citation). If snapshot/rank cannot substantiate the claimed third place, say so.

Only add OFFICIAL RULES when an independently retrieved exact current policy passage is genuinely supplied. Future combined design may append a separately sourced policy segment using league/division-only policy keys; it must not send the personal question, team label, counts, rank or comparison rows to OpenAI. Existing personal-eligibility composition can inform separation, but is not automatic authorization to reuse RF/member inputs. No numeric rationale should be invented by a model.

For review: ship the Live-only factual/configuration explanation with an actionable separate policy question, or explicitly approve a bounded zero-model exact-policy appendix. Full generated hybrid explanation is excluded.

## 16. View-As

Keep dedicated origin, confirmation, locked context/expiry/revalidation, READ-ONLY, Exit and diagnostic telemetry. Resolve target from protected context, not normal actor identity helper. Do not emulate target Auth or require target Auth account. Preserve LMS-0728 member_role semantics unchanged.

Extend only the bounded View-As Live lookup branch needed for the new capability; never call normal lookup with real Commissioner to obtain records. Both paths call the same minimal competition projection/formatter after their respective authorization. Any new private helper has no browser/service shortcut around context validation.

## 17. Implicit Player

Valid zero-role target remains Player in View-As. Normal zero-role authenticated member becomes Player only through the reviewed strict identity proposal. No user_roles insertion, Auth creation, automatic provisioning, member mutation or presentation-label grant. Explicit higher roles retain reviewed precedence; unknown/conflicting roles never silently downgrade to Player.

## 18. Minimal projection / privacy

Public response: context labels, requested wins/losses/ties/played/points/place, optional available-team count, checkedAt, status and sealed clarification choice keys. No email, phone, member list, RF, unrelated ratings or raw identity.

Internal bounded competition row: teamId/name, divisionId/name, leagueId/name, seasonId/name, match_wins/losses/ties, matches_played, standings_points, rank. For rank consistency/explanation only: line_wins/losses/ties, point_differential, points_for and configured three tiebreak keys. These are team aggregates, not member facts. Read all required rows for one authorized division before asserting rank/leader; never infer from a truncated page. Apply a documented row limit and return unavailable if exceeded rather than partial ranking.

## 19. Infrastructure reuse

Reuse stored standings, labels/context joins, existing tiebreak utility, trusted relationships, sealed choices, deterministic Live formatter/service and telemetry, View-As authorization/locks. Do not reuse the whole shared-page people snapshot: it contains fields unrelated to team records. Do not invoke standingsRebuild. No normal standings source edit, new rank formula, broad repository refactor or schema backfill.

## 20. Exact proposed SQL boundary — requires review

No-SQL is insufficient for normal identity because production lookup and feedback enforce the role-row join. An application service-role standings read alone would still leave that broken identity and duplicate authorization.

Proposed reviewed migration surface, not generated/applied:
1. New private normal identity resolver described in section 3, fixed input actor UUID; output status/memberId/effectiveRole only. Restricted definer; no Auth table grants to service/browser roles.
2. Replace only identity blocks in existing normal private lookup and public feedback; preserve signatures, remaining privacy restrictions and existing ACLs.
3. Add a private competition snapshot helper callable only by the normal trusted SQL path and View-As executor; fixed member/effective-role/query inputs are internal only. No direct anon/authenticated entry. Return exactly section 18 plus authorized choices/status; no operational writes.
4. Extend normal and View-As Live lookups to dispatch new intents after revalidation. Keep public View-As dispatcher/context/security structure unchanged wherever the existing lookup operation suffices.
5. Extend existing audit/feedback intent CHECK lists for TEAM_RECORD, DIVISION_LEADER, TEAM_STANDING_EXPLANATION only where persisted. Use existing missing/no_team/no_season/denied codes where truthful. Current feedback version CHECK is literally LMS-0723 and function hardcodes it; choose an explicitly reviewed additive release-version contract instead of silently mislabelling new feedback.
6. Inspect View-As feedback/outcome constraint compatibility before final migration approval; inventory any additional required constraint change explicitly. Do not discover and apply it during production rollout.

No changes to business-table RLS/grants, normal writes, Auth rows, identity repair config/manifests, role provisioning, standings schema/rebuild or deferred hardening. Exact function bodies/owners/ACL/hash and isolated concurrency evidence are required before production authorization; this report is not SQL approval.

## 21. Permanent controls (planned, not run)

| Case | Required result |
|---|---|
| What is my team's record? / What is our teams record? / What is our record? | TEAM_RECORD; correct context/W-L(-T); no RAG |
| How many matches have we won/lost/played? | Exact respective stored count |
| What place are we in? / What place is my team in? | Validated stored place or explicit rank limitation |
| What are our standings points? | Stored standings_points, decimal preserved |
| Who is in first place? | Authorized division selection, valid leader or limitation |
| How are standings calculated? / How are ties broken? / How many points do teams receive for a win? | Pure document policy; no unrelated personal lookup |
| Why are we in third place? | Actual-place check, bounded Live explanation, no protected model payload |
| One / multiple / zero teams | Answer / clickable authorized choices / natural no-team |
| Active + historical / explicit history / same-name seasons | Prefer current by default; preserve explicit historical scope; clarify |
| Explicit Player / implicit Player / Captain / Co-Captain / Club Pro / management | Matrix and actual relationships, no arbitrary team selection |
| View-As Captain/Player | Effective user's relationships; Commissioner authority absent |
| Identity duplicates/inactive/null/pending email/role races | Fail closed; no role/account writes |
| Forged IDs/choice, stale receipt, wrong session/context | Deny/re-clarify without hidden data |
| Missing/zero/partial standings, rank conflict | No fabricated zero/rank; no rebuild |
| Verified played/forfeit/weather/retired games, unverified/future/cancelled/postponed, byes | Matches accepted stored computation; no alternate scorer |
| Team aggregate request plus email/RF/roster injection | Minimum projection, protected boundary retained |
| Unsupported/error/timeout recognized dynamic intent | Live limitation; model/embedding spies remain zero |
| Normal and View-As feedback + telemetry | Correct identity, metadata, constraints; no prompt/fact leakage |

Use table-driven deterministic intent tests and synthetic DB/browser fixtures with all role/season combinations, ties and configured tiebreaks. Prove normal/View-As parity for the same member without sharing credentials.

## 22. Normal-LMS regression plan

Freeze exact accepted LMS-0728 artifact/catalog. Differential source gate forbids normal business workflow modifications. Run existing deterministic suite, focused identity/security/routing/telemetry tests, isolated PostgreSQL apply/replay/rollback and concurrency tests; verify only allowlisted objects changed and all business fingerprints unchanged. Run lint/build/types/PDF checks after authorized code changes.

Paired normal Player/Captain/manager fixtures cover login, dashboards, teams/rosters, schedules, Match Setup, score entry and standings/rebuild behavior unchanged. Test completed standings and final-bye fixtures locally, not by constructing live matches. Browser desktop/390/320 checks focus on Ask input/choices/source badge and View-As. No generated-answer benchmark needed for this deterministic capability.

## 23. Estimated scope and review decisions

Approximately 6–10 focused application/library/test areas plus one reviewed SQL migration/rollback and evidence documents; estimate is scope guidance, not a promised completion time. Main areas: Live intent/service/receipts/clarification, normal identity and feedback, private competition projection, View-As dispatch branch, deterministic presentation and fixtures. Normal standings/scoring/login screens remain untouched.

Decisions before implementation:
- Approve strict zero-role verified-email read-time identity binding (no higher-role promotion), or require a separate durable mapping design.
- Approve minimal authenticated standings visibility evidenced by existing RLS/UI; keep private member information excluded.
- Select stored rank as authority with discrepancy limitation, given current screen differences.
- Select Live-only factual/configuration hybrid explanation versus separately reviewed exact official-policy appendix.
- Review exact private helper privileges and telemetry CHECK compatibility in final SQL specification.

No open-ended expansion into general identity repair or security hardening.

## 24. Controlled production sequence

After design approval: implement locally; deterministic tests first; isolated SQL/hash/object/rollback review; exact candidate review. Request production authorization only for concrete reviewed migration and application hashes. Before deployment: authenticate normal Commissioner, arrange owner normal Captain/Player checks, capture accepted artifact/migration history/security/catalog and business fingerprints.

Apply only approved migration once; verify exact history/source, function/owner/search_path/ACL and constraint diff, no business mutations. Deploy exact artifact. **Normal LMS first** → owner Captain/Player PASS → integrity checkpoint → targeted normal Live implicit/explicit/Captain queries → View-As effective-user checks → feedback/telemetry/privacy/zero-provider-call verification → final integrity and Exit cleanup. No automatic full model benchmark, business test data or unsupported production role changes. Any regression/drift stops before further acceptance; no automatic alternative SQL.

**STOP FOR REVIEW.** All tests above are proposed controls, not new PASS claims. Diagnosis used source reads and read-only catalog/count queries only.
