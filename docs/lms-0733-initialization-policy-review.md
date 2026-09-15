> SUPERSEDED WORKFLOW — 2026-09-10: The separate initializer is abandoned. Routine Upload protects populated working inputs and final ratings; explicit Clean Ratings may CREATE or UPDATE Season DUPR using current inputs and applicable Rules/divisions. Earlier blank-only or immutable-initialization statements below are historical, not current Clean policy. See [current reconciliation](lms-0733-clean-ratings-reconciliation.md).

# 2026 Fall Season Ratings — OWNER POLICY REVIEW

Read-only review, 2026-09-10. No implementation, migration, deployment, Clean Ratings, initialization, import, production mutation or OpenAI API calls. LMS-0733 Source Review UX remains accepted. This proposal does not authorize future writes.

## 1. Current governing evidence

Fresh direct catalog/chunk reads identify one active, ready, all-scope league-rules document:
- Title: LWR Pickleball Club DUPR League Rules.
- Document ID: 9c200d0f-be41-4c73-9f47-41c18dcd0132.
- Active version: 6ae10e5f-fdde-41be-a941-d1b7ed360d1a.
- Version label: v20260910133443-6ae10e5f; activated 2026-09-10 13:34:54.794991 UTC.
- Rules 4.1–4.3, PDF page 3, chunk 8834ecc0-0c39-405f-bed9-0b9b6d3d25d0.
- Rule 4.5 continuation, page 3, chunk bb63115a-8092-4bd1-ae9c-efe8465256c7.
- Rules 4.5.1–4.6.2, page 4, chunk 6d8c91e2-6cb8-4a7a-b171-13f102cdbff8.
- PrimeTime 6.3 age eligibility, page 12, chunk 45bef189-a068-452f-b83b-00078774912d.
- PrimeTime 6.3.2, page 12, chunk 08d019ec-e22e-465f-9ed6-ae15a4e904ea.

Exact relevant extracted passages and fresh aggregate counts are retained in lms-0733-initialization-policy-evidence.json. These are direct current evidence reads, not Ask LWR/OpenAI responses or old fixture policy. The accepted application is de36572acdbcd5b5e6f669ed451dc6db93c7778a.

Rule 4.1 establishes ratings on the communicated date before the first scheduled league match and keeps them for the season. It does not identify the actual Fall communication/effective date. Database season dates are October 14–December 3, 2026; that start date is not proof of the separately communicated rating date.

## 2–3. Regular Rated and NR rules

**Rated:** for active in-source players with valid numeric Doubles and RF ABOVE 29, proposed initial regular Season DUPR is the source Doubles truncated to one decimal (Rule 4.2), subject to effective-date and input validation. Example: 3.237 → 3.2. No rounding and no age metric substitution.

**NR:** Rule 4.1.1 explicitly classifies RF 29 OR BELOW as NR and sends the player to Rule 4.5. Literal DUPR NR also falls under 4.5. Numeric Doubles with low RF does not use the ordinary rated calculation.

Rule 4.5.1 assigns, **for team aggregate calculations**, the division's maximum individual DUPR minus 0.5. Rule 4.5.2 requires the highest adjusted assignment across multiple rostered divisions. Rule 4.2 supplies tenth truncation:
initial NR numeric aggregate input = truncate_to_tenth(maximum applicable division maximum − 0.5).
Example expressly given in 4.5.1: division maximum 3.8 → initial NR value 3.3. This numeric assignment does not erase NR classification or turn the player into an ordinary rated player for division admission.

Current Rules tables express some maxima as 3.899/4.899; configuration uses 3.8/4.8. Subtracting 0.5 and truncating yields the same 3.3/4.3. Validate applicable table/config compatibility rather than using team aggregate cap or arbitrary division numbers. Current configured PrimeTime 7 and 9 would yield 3.3 and 4.3 respectively **only for correctly placed NR players**.

No roster/division basis means no numeric NR proposal. Captain/co-captain assignment is not proof that the leader is rostered as a player (Rules section 2). There are currently zero team_members rows, so no NR assignment is calculable from roster membership now.

RF boundary is settled by the active Rules, not reopened as an owner choice. A future policy binding should retain evidence/version provenance; this review introduces no hardcoded threshold or change to Clean Ratings' user prompt.

## 4–9. PrimeTime source selection, NR and age

- Rule 6.3 uses DUPR's 65+ age-based rating system. An eligible, rated player with a valid 65+ metric and no conflicting age facts uses that source metric, truncated to one decimal under 4.2; not normal Doubles. Example 4.744 → 4.7.
- Rule 4.3 explicitly states that if a player has not established the 65+ age rating at season start, the 50+ age rating will be used. Thus 50+ fallback is supported by current Rules, not merely an importer convention.
- However, 6.3.2 explicitly states that a player not yet 65 at season start is NR. Whether 4.3's fallback overrides that specific statement for a player who turns 65 by December 31 is unresolved. Hold that subgroup for owner precedence decision. A 65+ metric by itself must not override conflicting actual-age evidence.
- For a verified already-65 player who lacks 65+ but has 50+, 4.3 supports 50+ truncation, subject to RF/NR and valid-input requirements. Metric provenance must remain visible.
- No 65+ or 50+ metric: Rules do not specify ordinary Doubles as a blanket substitute. Valid ordinary Doubles/RF alone does not establish a numeric PrimeTime rating. Keep blank pending policy review, unless a separately established NR rule and valid division basis apply.
- PrimeTime low RF: 4.1.1 is league-wide and 4.3 says age-based leagues still follow all rating/division rules. Therefore low RF still means NR; a high age metric does not exempt the player. The Rules support 4.5's assignment for that NR player rather than copying the age metric. What remains unresolved is mapping a highest NR assignment to the two stored rating fields and handling mixed regular/PrimeTime divisions or PrimeTime-only age-triggered NR.
- Eligibility is age 65 by December 31 of the applicable current year; for this Fall that is December 31, 2026. This is distinct from whether the player was 65 on October 14 and distinct from metric availability. Under-65 at year end is NOT APPLICABLE for PrimeTime. Missing proof is REVIEW REQUIRED, not automatically ineligible or NR.
- Reviewed schema has no dedicated birth/DOB/verified-age columns. No external membership record or free-text age assertion was evaluated; this is not a claim that the club has no age information anywhere. Exact eligible/under-65-at-start counts cannot be inferred from 65+/50+ labels.

## 10–12. Missing source, inactive and protection

Missing/invalid Doubles is not itself a numeric rating and must not silently become NR. Leave regular Season DUPR blank with MISSING SOURCE. Explicit literal NR is a valid NR marker, not a missing value; a verified low RF is also independent NR evidence. If an NR player lacks numeric Doubles, only a Rules-derived division assignment with approved inputs could supply a number. The owner must settle the partial-source case in Decision F below.

No source record: leave both values unchanged/blank, even if a legacy value or age can be found elsewhere; another authorized workflow may act separately. Inactive members excluded using the accepted is_active_member semantics and rechecked at confirmation.

Owner's blank-only contract is compatible with 4.1 season persistence and is an explicit operation-specific safety rule:
- Evaluate regular and PrimeTime fields independently.
- Database NULL/missing season row may qualify; any existing non-null value is PROTECTED, including 0, unusual values or existing NR text in any applicable representation. No automatic normalization.
- One populated field does not prevent a valid blank fill of the other.
- No write to established Season DUPR/PrimeTime. No mid-season reset, retrospective recalculation or source refresh disguised as initialization.
- Clean Ratings remains separate with its existing overwrite/prompt behavior; it is not invoked or modified.

## 13. Exact unresolved owner decisions

Choices marked recommended are proposals only. Alternatives that depart from current Rules require an explicit rule amendment/authorized exception, not an implementation shortcut.

### A. Under 65 at season start, 65 by December 31, valid 50+ metric and RF above 29
Evidence: 4.3 says use 50+ when 65+ unestablished; 6.3.2 says under-65-at-start players are NR. Precedence is not reconciled.
1. **Recommended:** apply the specific 6.3.2 NR treatment to this subgroup; use division-based 4.5 assignment when available. Eligibility remains allowed, but age metric does not determine initial numeric rating.
2. Make 4.3 fallback control for this subgroup; use truncated 50+. Requires owner reconciliation/amendment of the NR sentence.
3. Defer this subgroup pending case review; no PrimeTime value yet.
The same precedence must specify how to treat unexpectedly present 65+ metrics alongside contradictory age facts; recommend review rather than trusting metric as age proof.

### B. Verified eligible, RF above 29, normal Doubles valid, no age metric
Evidence: 4.3 supplies only 50+ fallback; 6.3/6.3.2 require age-based ratings, with a particular under-65 NR case. Missing metric for an already-65 player has no express universal rule.
1. **Recommended:** leave PrimeTime blank, MISSING AGE SOURCE, until metric/authorized review resolves it.
2. Explicitly designate this scenario PrimeTime NR and use 4.5 when division basis exists; requires an approved policy extension.
3. Permit normal Doubles truncated as a temporary PrimeTime fallback; requires explicit amendment/exception and changes the rating basis. Never silently use this option.

### C. One NR player appears in regular and PrimeTime divisions, or is NR only because of PrimeTime season-start age
Evidence: 4.5.2 says highest adjusted value across all divisions; 4.3 imports division rules into age-based leagues. Architecture stores separate regular/PrimeTime fields. The cross-field scope and mixed NR reasons are not specified.
1. **Recommended for owner consideration:** separate maxima by rating basis (regular across regular divisions; PrimeTime across PrimeTime divisions); preserve normal regular rating for age-only PrimeTime NR. Requires explicit clarification of 4.5.2 scope.
2. Apply one season-wide highest adjusted assignment consistently across both fields wherever NR treatment applies; define age-only NR impact explicitly. Closest to a broad literal “all divisions” reading, but can couple different rating bases.
3. Defer mixed-basis players and initialize only unambiguous single-basis cases.

### D. NR player has no current roster/division context (all 121 RF-NR sources currently)
Evidence: 4.5.1 needs an applicable division maximum; 4.5.2 explicitly uses rostered divisions. A captain's team leadership or self-rating does not establish playing placement.
1. **Recommended:** leave blank/REVIEW REQUIRED until genuine roster placement exists, then generate a fresh preview.
2. Allow a separately approved provisional intended division, recorded with captain/manager approval; that extends accepted inputs and needs explicit authorization.
No generic 3.0/zero/default-division choice is proposed because it would manufacture a rating.

### E. Authoritative age proof and which eligible members receive PrimeTime initialization
Evidence: 6.3 establishes age eligibility; reviewed member schema lacks structured verification; metric presence proves neither birthday nor participation.
1. **Recommended:** owner-verified eligibility/season-start-age roster supplied as a separately reviewed input; initialize PrimeTime only for verified eligible selected participants. Minimizes unrelated population.
2. Add a structured DOB/age-verification workflow, then initialize all verified eligible in-source members regardless of roster. Broader data access/storage scope; requires separate design.
3. Defer all PrimeTime initialization; permit separately approved regular-only phase.
Also confirm whether October 14, 2026 database season start is the intended 6.3.2 age-NR reference date; a different league-specific start changes who falls in Decision A.

### F. Partial source: unknown RF, missing Doubles, or contradictory NR inputs
Evidence: 4.1.1 supplies a threshold for known RF, 4.5 supplies explicit NR treatment; neither says absent RF automatically equals low RF. No numeric rating may be invented.
1. **Recommended:** require verified RF for numeric rated initialization; defer unknown RF. Allow literal NR or known low RF to establish NR basis, but generate a numeric proposal only with confirmed division context; flag inconsistent/partial inputs for owner review first.
2. Require a complete refreshed source record before any initialization for all partial/contradictory cases, including low-RF/missing-Doubles records. More conservative; delays otherwise derivable NR assignments.
3. Permit individually documented manager adjudication under an explicitly approved workflow; never a bulk default.
These cases currently count zero for unknown RF/invalid data; 41 literal NR records are explicit NR, not invalid source.

### G. Durable RF/NR inputs used by eligibility after initialization
Evidence: active 4.1/4.1.1 require season rating/classification meaning; current live ai_live_private.lookup reads legacy Doubles as sourceIsNr, legacy RF, and selected season value. It does not read the imported source store. Numeric season values alone do not settle NR provenance; mutable current-source reads could later change a season's classification.
1. **Recommended:** freeze initialization-time RF/NR basis, reason, source revision and Rules version in separately approved season-scoped provenance, and make affected eligibility consumers read that snapshot. Requires explicit schema/read-integration approval and consumer tests.
2. Fill only blank legacy Doubles/RF compatibility inputs with reviewed source values and an auditable classification contract; preserve populated inputs. Fits existing reads better, but PrimeTime age-only NR still needs a distinct representation.
3. Defer initialization until a separate eligibility/provenance design is approved.
Do not authorize these additional writes merely by approving numeric Season DUPR fields. Confirm whether NR classification freezes with 4.1 or may be reassessed later through a separate authorized workflow; recommend frozen initialization provenance with explicit later-review authority.

### H. Effective date, source snapshot and phased release
Evidence: 4.1 uses a communicated establishment date before the first match. September 10's source import is not proof of that date.
1. **Recommended:** choose the communicated Fall effective date and explicitly confirm this imported snapshot is appropriate; allow the 538 regular-rated candidates in a separately authorized first phase while unresolved rows/PrimeTime stay blank.
2. Wait until all roster/age/PrimeTime decisions are settled and use a newly reviewed appropriate snapshot for a combined preview.
3. Select an earlier/later reviewed snapshot under an explicitly communicated policy decision; a new source import, if wanted, is separately authorized.
No choice here performs an import or grants future production-write authority.

## 14. Proposed initialization preview

Desktop-only, separate Initialize Season Ratings workflow, not Clean Ratings. No button implemented.

Columns: Player; current active status; Source DUPR; Source RF; Source Age-Based and 65+/50+ provenance; existing/proposed Season DUPR; existing/proposed PrimeTime Season DUPR; separate NR/Rated basis per field; verified age/reference date; applicable division(s)/maximum; Action; Reason with rule reference.

Each field has its own outcome:
- INITIALIZE: blank target, valid authorized inputs and fully resolved policy.
- PROTECTED: existing value, no replacement.
- MISSING SOURCE: no imported record or required usable source absent.
- MISSING AGE SOURCE: otherwise relevant PrimeTime case lacks age metric.
- INACTIVE: excluded.
- NOT APPLICABLE: positively established inapplicability, such as under 65 at year end.
- REVIEW REQUIRED: missing age proof, NR division basis, unknown RF, inconsistent inputs or policy conflict.

Use one primary reason per field plus secondary reasons; player rows may have mixed outcomes. Show distinct player count, proposed regular-field count, proposed PrimeTime-field count, unique players affected and skipped/protected counts. Never sum both field counts as number of players. Confirmation names season, effective date, active Rules version and exact selected counts. Auxiliary provenance changes, if approved, must be visible separately.

## 15. Fresh calculable counts — not a write preview

Snapshot 2026-09-10 18:53:41 UTC; revalidate before future action.

| Source category | RF above 29 | RF at/below 29 | Total |
|---|---:|---:|---:|
| 65+ metric | 215 | 21 | 236 |
| 50+ fallback metric | 274 | 41 | 315 |
| No age metric | 49 | 59 | 108 |
| Total | 538 | 121 | 659 |

All 659 source members currently active. Both protected season fields blank for all 659. Numeric Doubles: 618; literal NR: 41 (all within the 121 low-RF records); low-RF numeric Doubles: 80. Unknown RF: 0; RF exactly 29: 0; invalid Doubles/RF/available-age values under accepted importer validation: 0. Active members without a Fall source record: 1,159, excluded from this initialization. Inactive source members: 0.

538 is the **regular-rated input-qualified candidate count**, not an approved commit count. Effective-date/provenance approval and fresh identity checks remain gates. All 121 RF-NR rows lack roster-derived division context today; numeric NR proposals presently zero. PrimeTime final INITIALIZE/NOT APPLICABLE/age-triggered NR counts are **not calculable from source rows alone**: no verified age/participation input, and policy decisions A–G remain. At most 215 have the straightforward high-RF/65+ source pattern; 274 have high-RF/50+ pattern; these are not certified eligible counts. 62 low-RF players have age metrics, so blindly copying available age values would bypass NR policy.

## 16–19. SQL, implementation scope, tests and controlled sequence

**SQL requirement:** future atomic blank-only initialization needs a separately reviewed server/transactional SQL operation plus auditable recovery/provenance. Exact schema/columns depend on Decision G. Do not reuse source import's write operation or Clean Ratings' client batches. No SQL implementation or migration is produced/applied here; only SELECT evidence queries ran.

**Bounded future scope:** desktop preview and confirmation; current authenticated manager/commissioner boundary; deterministic policy calculations; individual blank-field guards; selected-season imported-source/member binding; signed expiring preview and idempotent commit; initialization audit with before-images and per-field basis; optional explicitly approved eligibility snapshot/read integration. No source/member/team/roster/schedule/score/standings updates; no policy changes hidden in code.

**Atomic contract:** reauthenticate; recheck selected season, active Rules, source revisions, source identity, active membership, applicable roster/division facts, age proof, existing target values and effective date under appropriate locking/version checks. Any stale input, conflict or failure aborts the entire selected transaction and requires a fresh preview. Missing season rows may be created only with approved fields; existing populated fields are never overwritten. Unique receipt prevents duplicate initialization. Recovery only reverses still-matching writes from that operation and preserves subsequent legitimate edits; tested before approval.

**Test plan (future, not run):**
- RF 28/29/30; literal NR, RF 0, missing/invalid RF; numeric Doubles plus low RF; missing Doubles with/without independent NR basis.
- Exact decimal tenth truncation, e.g. 3.496 → 3.4; no rounding/float drift.
- 65+ priority, explicit 50+ fallback, missing metric, conflicting age facts, birthdays at year-end and season-start boundaries.
- Every approved PrimeTime NR/regular NR mapping, multi-division maximum, team cap versus individual maximum, no roster, captain-only assignment.
- Independent null guards: both blank, one populated, both populated, nonnull zero; no overwrite.
- Inactive/not-in-source, identity change, stale RF/source/rules/age/roster, concurrent manual writes, double submission, rollback/conflict atomicity.
- Consumer eligibility reads preserve NR even with numeric aggregate assignment and age-only PrimeTime NR; source refresh cannot silently change established season meaning.
- Existing normal LMS/player/captain/View-As/Ask LWR authorization remains intact; unrelated global mobile requirements preserved. New administrative workflow desktop verification only.
- Required lint/build and relevant regression suite; fixture database only, no production test rows or OpenAI calls.

**Controlled production sequence:** owner resolves policy choices → owner approves exact bounded design/write columns/consumer effects → isolated implementation/test and SQL/recovery review → separate explicit production deployment/migration approval → capture production identity/security/business baselines and verify recovery → deploy approved artifacts → normal LMS first → read-only exact live preview and owner review of counts/values → separate explicit authorization for that exact initialization batch → atomic commit once → compare source/protected/business integrity and representative results → accept and stop. A build/deployment approval never substitutes for the final data-write approval.

STOP FOR OWNER POLICY REVIEW. No initialization is authorized by this report.

