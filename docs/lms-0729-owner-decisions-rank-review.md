# LMS-0729 / 0.1.551 — owner decisions and rank-authority diagnosis

**STOP FOR REVIEW — no implementation authorized yet.** September 9, 2026. This addendum applies the owner's accepted decisions and supersedes the baseline report's unresolved identity/visibility choices and provisional stored-rank recommendation. Production remains accepted LMS-0728 / 0.1.550.

## 1. Final implicit-Player identity contract

A uniquely resolved, valid active member has baseline Player access without a persisted Player row; explicit Captain/Club Pro/League Manager/Commissioner roles and multi-role precedence remain intact. Co-Captain remains an authorized team relationship. Unknown special roles, conflicts, invalid/inactive/unresolvable membership do not become valid Player.

For normal Live, preserve online Auth validation and transaction-scoped identity revalidation. Use the accepted baseline's strict confirmed unique authoritative Auth-email/member matching for a genuinely no-role member, not browser email or permissive normal UI fallbacks. Existing durable links remain authoritative only when valid/unambiguous. Do not promote unlinked elevated roles solely via email; that identity needs review. Preserve explicit role collections and compute effective precedence deterministically. No account/member/role mutation, provisioning or backfill. Normal LMS semantics must agree, but this release does not rewrite general login/navigation or relax their security checks.

View-As continues to resolve the protected target directly; it must not require target Auth or use the real Commissioner as SELF. LMS-0728's resolver/security remains the baseline.

## 2. Feedback identity impact

Normal lookup and normal feedback each currently require an Auth-linked role row. Both must use the consistent resolved identity. Existing verified user, signed feedback receipt, answer ownership/session binding, eligibility, idempotency and permissions remain mandatory.

**View-As feedback remains disabled.** Do not add a View-As feedback operation, receipt, button or SQL permission. Diagnostic outcome telemetry remains allowed as before. This clarifies the baseline's generic feedback test wording: test View-As denial, not submission.

## 3. Standings visibility contract

Owner approved the same competition standings information intentionally available to authenticated LMS users. Production team_standings SELECT RLS allows authenticated reads; no anonymous SELECT policy. Minimal team result/standing facts are distinct from member email, RF, ratings and roster access. Historical named-team competition results retain their exact season context. No generic private-data expansion.

## 4. Stored-rank source and lifecycle

app/lib/standingsRebuild.js:
- loads every team in the selected division (no team-active filter);
- consumes completed AND verified matches;
- derives existing scores/counts/points and final bye adjustment;
- sorts by nonempty configured standings_tiebreak_1/2/3 using standingsRuleValue;
- uses team name for a final tie;
- saves rank=index+1 in team_standings.

Rebuild is called by normal match verification/special-result paths in matches/[id]/page.js, manual standings rebuild, and schedule-editor match deletion. It is not a continuously evaluated database view. Teams reset can also clear an individual standing's rank to null. Current inspected database has no noninternal triggers on divisions, matches or team_standings that automatically recalculate rank.

Division configuration save writes the tiebreak settings then reloads its screen; it does not rebuild standings. Thus stored rank is materialized derived state and can lag current settings. No evidence calls it a disposable cache with a formal freshness/version contract; it is also actively consumed as authoritative by many UI surfaces. Its updated_at does not prove it matches the latest settings.

## 5. Displayed-rank sources / screen inventory

| Surface | Current ordering / number |
|---|---|
| Full /standings page | Filters inactive teams, calls sortStandingsByDivisionRules with current division settings, displays index+1 |
| Player legacy detailed standings table/cards | Re-sorts division rows with same helper, displays index+1 |
| Current Player dashboard rank card | Uses standing.rank |
| Current Player leaders/chart/Full View | buildMiniStandingsLeaders re-sorts by stored rank, even if upstream rows were dynamically sorted |
| Current Captain rank card, division snapshot and Full View chart | Stored rank through standing / buildMiniStandingsLeaders |
| Commissioner Division Standings popup | Loads stored rank order, filters inactive teams, shared modal displays index+1 |
| Commissioner leaders/charts | Stored rank and stored-rank ordering |
| Player/Captain team cards and Division Team Schedules ordering | Stored rank; schedule comparator uses points/name fallbacks |
| View-As | Same shared screens and therefore same distinctions |

Concrete source references: standingsSort.js:31; standingsRebuild.js:79,513; standings/page.js:153,513,637; player-dashboard/page.js:875,1700,1761,2074; captain-dashboard/page.js:678,893; AdminDashboardClient.js:1013,2699; MiniStandingsLeaders.js:18–41; DivisionStandingsModal.js row rendering. Current dashboards are routed through design-preview/DesignPreviewView.js and design-preview/captain/CaptainDesignPreviewView.js; their rank cards use stored rank. “Preview” in the filename does not mean unused.

The earlier broad statement that Player dashboard dynamically ranks needs this qualification: its detailed legacy table does, while the current main card/leader path returns to stored rank.

## 6. Concrete reasons and isolated examples

[Executable read-only replay](lms-0729-rank-diagnostic.mjs) extracts the existing rebuild comparator unchanged and imports the existing display comparator. [Results](lms-0729-rank-examples.json) use invented Alpha/Beta/Gamma teams only.

| Case | Existing stored/rebuild path | Existing display path |
|---|---|---|
| Settings changed after last rebuild; Alpha previously #1 with 10 points, Beta #2 with 20; current primary is points | Stored Alpha then Beta | Current-rule sorter Beta then Alpha |
| Blank tiebreak settings; Alpha 0 points, Beta 10 | Rebuild skips blank rules → alphabetical Alpha then Beta | Display supplies default points/line percentage/differential → Beta then Alpha |
| All configured metrics tied, prior ranks Beta #1 / Alpha #2 | Rebuild's name fallback → Alpha then Beta | Display's stored-rank fallback → Beta then Alpha |
| Inactive Alpha stored #1, active Beta #2, Gamma #3 | Cards retain Beta #2/Gamma #3 | Filter then row-position numbering shows Beta #1/Gamma #2 |

These are four distinct mechanisms, not one stale-cache bug. The display comparator adds default rules and previous-rank fallback; it does not add head-to-head or another hidden official tiebreak. Line/game and match percentages share standingsRuleValue across both comparators. applyByeCounts on /standings adds bye_count only; it does not dynamically change standings_points.

[Current read-only production evidence](lms-0729-rank-current-evidence.json), 21:19:29 UTC: zero standings rows, zero matches; 18 divisions, zero blank rule settings; all use standings_points → line_wins → point_differential. Therefore no current populated production difference is asserted. Null-rule case is a supported isolated edge, not present configuration. No production standings were created or rebuilt to demonstrate it.

## 7. Authoritative-rank recommendation

Documented project intent (project-roadmap.md existing standings policy and LMS-0619 entry) says standings displays use the division's configured tiebreak order, with shared percentage definitions. This supports **current configured rules over materialized verified-result metrics** as the intended competition contract, rather than blindly preferring stale saved rank.

Recommend adopting existing **sortStandingsByDivisionRules** as the shared read/display ordering contract, with a single shared projection assigning displayed place across the complete applicable division. Ask LWR consumes that projection, not a third comparator. Keep its current default rules and stored-rank/name tie fallback initially to avoid inventing sporting tiebreak policy.

However, code/history alone cannot decide whether a team tied on all sporting metrics should be ranked by previous rank or name, or whether inactive historical competitors should retain competition positions. Current screens differ. For the bounded current-display contract, recommend matching the full Standings screen: active display population (existing is_active !== false behavior), sequential place, existing helper fallbacks. Label a residual all-metric tie as tied on configured metrics; do not claim previous rank/name is an Official Rules sporting tiebreak.

**This recommendation requires owner review before implementation.** It supersedes the earlier provisional “stored rank is official” recommendation. Until approved and UI consumers agree, definitive Ask LWR place/leader/why answers remain disabled with an explicit Live limitation.

## 8. Normal screens affected

Unifying definitive place requires reviewed changes to data adapters/consumers for full standings, Player/Captain dashboard cards/leaders, Commissioner popup/leaders, team rank cards, and schedule team ordering where it claims rank. The shared View-As pages inherit the approved correction.

Most rendering markup can remain; rank-bearing data must come from one division-scoped projection. Changing only Ask LWR or only MiniStandingsLeaders is insufficient: cards still read raw standing.rank and some callers have incomplete division rows. Incomplete payloads must not calculate a definitive place.

Do not include tournament standings: they are a separate competition engine. No automated edit to these normal screens was made.

## 9. Smallest consistency correction / bounded alternative

Recommended reviewed presentation correction:
1. Reuse existing sorter in a pure shared read projection; do not change metric formulas.
2. Normalize applicable division population once, return separate storedRank and displayPlace, ordered rows and completeness status.
3. Feed every affected normal rank consumer and Ask LWR that same projection; retain stored DB rank for provenance rather than writing it on read.
4. No standings/score rebuild or production rank updates.

This is a normal-LMS presentation change and needs explicit review. Stored rank remains derived state; it is not the current display-place authority under this proposal. Making the rebuild delegate to the same comparator would additionally change fallback/default behavior and is not necessary for a read/display unification; do not include that unreviewed scoring-write-path change.

**Smaller release alternative:** approve identity + wins/losses/played/points only, with place/leader/advanced why explicitly unavailable on the Live path. Existing screens remain unchanged. This does not resolve their discrepancy, but avoids shipping a contradictory Ask rank. Do not implement this alternative without owner scope approval; current instruction still holds all implementation for review.

## 10. Team-record data contract

For one resolved team/season/league/division, read stored match_wins, match_losses, match_ties, matches_played and standings_points. No independent recalculation. Keep ties when present, distinguish matchups from individual games, preserve numeric points precision. Missing row is unavailable, not fabricated 0–0; existing zero row can report zero recorded results.

Stored computation includes completed/verified matches, accepted forfeit/weather result handling, game-level retirements and final bye adjustments. Scheduled/incomplete/future matches outside that state do not count. Ask never calls standingsRebuild or writes matches/lines/standings. Place is optional and blocked until the rank contract is accepted.

## 11. My-team resolution

Trusted current roster membership and actual authorized captain/co-captain/club-pro team assignments, scoped through active season/league/division/team. Do not infer from community. Management-wide read scope is not “my team.” Implicit and explicit Players use the same member relationships.

Explicit historical requests remain historical. Require retained trustworthy affiliation to call it “my”; otherwise ask for the team/season rather than reconstructing membership. Named competition record access does not reveal roster history.

## 12. Multi-team clarification

One applicable team → direct result; multiple → bounded clickable authorized choices; none → natural no-team. Include league/division/season in labels; same-name teams stay distinct. Reuse sealed session/context-bound receipts, five choices plus continuation. Revalidate choice and current affiliation under normal identity or View-As target. No arbitrary browser team ID authorization or inherited Commissioner team.

## 13. Hybrid explanation feasibility

StandingsTiebreakDetails already shows configured aggregate metrics and a “deciding” rule, so simple pairwise explanations are feasible with the existing value/label helpers and a narrowly shared comparison result. But there is **no complete structured reason trace from the rebuild**.

Limits: the component groups teams tied on the primary metric, chooses the first secondary metric that varies anywhere in that group, and identifies the leading team from stored rank. In a three-team group where Alpha/Beta remain tied at that metric but Gamma differs, it does not explain Alpha versus Beta's later separating rule. Fully tied metrics have no sporting winner explanation. Stale rank can contradict its text.

Therefore do not reuse its prose as universal proof or build a broad new engine. Recommend basic team-record release without advanced why. Once rank contract is accepted, a bounded pairwise first-differing-existing-metric explanation is possible; residual ties/unknown outcomes must say so. A complete position explanation also needs the complete division, not one pair.

Structured configuration is LIVE LMS DATA. Use LIVE LMS + OFFICIAL RULES only when a real, exact governing official passage is also used; no fabricated rule citation. No advanced model generation required or approved.

## 14. Privacy

Normal authenticated competition snapshot exposes only aggregate team results and context. Rank comparison may need complete division aggregate metrics, never member email, roster, identifiers, private ratings or RF. Server-only identity data never enters responses, telemetry or model prompts.

Zero answer-model and embedding calls for dynamic record/rank paths, including unsupported/technical cases. Hybrid composition must keep relationships/member data server-side. View-As remains read-only and diagnostic; feedback denied.

## 15. Minimum SQL requirement

**Rank consistency itself requires no SQL** under the recommended read/display projection and no business data mutation. Minimum identity/team-record SQL is still needed because existing lookup and feedback enforce stored-role linkage:

- One restricted private normal identity resolver: actor UUID input; status/memberId/effectiveRole output; strict verified linkage/validity, coordinated revalidation; no account writes or direct Auth grants to browser/service roles.
- Replace identity checks in current ai_live_private.lookup(uuid,uuid,jsonb) and public.ai_live_feedback(uuid,uuid,boolean,jsonb), preserving ordinary authorization and signed server provenance.
- Add one minimum-projection private competition read helper and dispatch new approved intents through existing normal/View-As Live operations. Fixed team/context/metrics only; internal invoker under existing trusted callers, no new public browser endpoint.
- Add only required new intent enum/check entries for persisted normal feedback/audit, and a truthful reviewed feedback release-version contract (currently hardcoded LMS-0723). Existing no_team/missing/denied statuses can be reused. No View-As feedback extension.
- Retain owners/empty search_path and existing grants except narrowly reviewed new private helper EXECUTE. No business-table ACL/RLS or standings schema change.

Exact executable SQL/hash must follow the final rank/scope decision and local implementation authorization; no SQL file has been authored or applied here. Do not treat this list as mutation approval.

## 16. Final bounded scope pending review

Approved requirements: normal Live/feedback implicit identity, preserved explicit roles, authenticated minimal standings visibility, deterministic record counts/points, authorized team/season choices, View-As effective identity and disabled feedback.

Remaining release decision: include the reviewed shared current-rank presentation contract and its normal UI consumers, or defer place/leader/advanced why and ship the smaller record capability. No automatic broader UI fix. No scoring/rebuild redesign, backfill, account creation, general identity repair, Data API hardening, corpus/model changes or full generated benchmark.

## 17. Local validation

This diagnosis executed only synthetic comparator replay (four cases; seven assertions), source inspection and read-only aggregate/catalog queries. No application test PASS is claimed beyond those diagnostic assertions.

After implementation approval: validate role/link/feedback security, multi-team/history choices, Live routing hard gate, zero-provider spies, normal/View-As parity and minimum fields. For approved rank unification, use the four reproduced cases plus percentage tiebreaks, partial three-way ties, inactive/missing rows, configuration changes, historical contexts and complete-division limits. All rank surfaces and Ask must show the same place for the same scope. Test normal operational scoring/rebuild unchanged, isolated migration/rollback/races/metadata/business fingerprints, existing suite, lint/types/PDF/build and desktop/390/320 UI. View-As feedback must always deny.

## 18. Controlled production sequence

Design/scope approval → bounded local implementation → deterministic/local DB/browser checks → exact migration/application/rollback review → explicit controlled production authorization. Read-only preflight captures accepted LMS-0728 artifact/security/business state; apply only approved exact migration once; verify allowed changes/no business mutations before deployment.

Normal Commissioner then owner normal Captain/Player checks FIRST; integrity checkpoint; targeted normal implicit/explicit Live records/feedback and effective View-As tests; only approved rank cases; zero model traffic; final security/business integrity and Exit cleanup. No manufactured production matches/roles. Stop on regression or drift, without alternative SQL or automatic correction.

**Review requested:** approve the shared configured-rule read/display contract and affected presentation changes, or approve the counts/points-only release with place/advanced why deferred. No implementation or production changes have begun.
