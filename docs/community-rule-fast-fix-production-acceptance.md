# FAST FIX — PRODUCTION ACCEPTED

September 12, 2026. Ask LWR now answers both reported community-participation questions from active League Rules, Rule 3.5, Page 2.

## Identity and correction

- Application commit: `f0d6849a814798b79d7396a48a6b05f3d47425b8`.
- READY production deployment: `dpl_4jw8S8P8gmHgDj9jjpTsyeqeW993`.
- Immutable URL: https://lwrpc-admin-h4lm83f9b-terry-lwrpc.vercel.app ; production domain resolves to this deployment. Both commit metadata fields match. Vercel inherited an unrelated old commit-message label from the enclosing workspace; verified source bytes and explicit commit hashes identify this release.
- Export verified against all 1,173 Git blobs. Windows line-ending conversion was corrected by exporting mismatching blobs directly before upload. No environment files included.
- Previous accepted release and retained application rollback target: commit `6397e53ac0632e717913c2dc7736f9aed79ee15b`, deployment `dpl_5GBYhis9FKxzmjMu5gBrqDxVdwLf`. Existing Vercel rollback path retained; no rollback exercise changed production during this fix. Database rollback is unnecessary.
- Both ratings maintenance flags explicitly false at build/runtime.

Root cause was evidence selection, not intent. Baseline recognized both questions, retrieved the current rule, then rejected it because its matcher required historical prohibition wording. Baseline production outcome `5503ea33-aa95-483a-a6bc-922caf363ffe` shows completion complete, stage3 sufficient, selection APPLICABILITY_REJECTED. The same failure reproduced deterministically for both questions against the active source fixture.

Three application files changed: complete current recommendation recognized alongside historical conditional prohibition; duplicate historical-only filter removed; community-specific generation guidance preserves recommendation versus prohibition. Active version `478a87bb-1b05-4da9-ac09-7ddecec64f69`, chunk `35758e12-119d-45c6-87ad-15b722816a8d` supplies the answer. No authoritative content or policy was changed.

## Production replay

| Question | Verified result | Classification |
|---|---|---|
| Can I play on a team from another community | Yes; local play strongly encouraged when the team is in the same league and division with roster space; explicitly a recommendation, not prohibition | OFFICIAL RULES; Rule 3.5, Page 2 |
| Do I have to play in my own community | No; may join other communities; preserves the complete local-play recommendation | OFFICIAL RULES; Rule 3.5, Page 2 |
| What team am I on? | Existing authorized self-team record, with league/division/season context | LIVE LMS DATA; SELF TEAM |

Each replay used New Question. Rule outcomes `1d373f9f-5f54-4429-81ec-ac8d6da346cb` and `02336ed9-4ecd-4e91-8c17-6443105cdb93` each selected one current-source passage and passed final source validation. Live control `e27381ac-64a4-4771-8616-25f7aef569eb` used zero model tokens. No unnecessary clarification.

## Verification and protection

50 affected tests pass, including nine new current-rule tests, historical community tests, answer/evidence and Live boundaries. Lint: zero errors/six pre-existing warnings. Local build, TypeScript and PDF server bundle check pass; remote build READY. Initial local build lacked public Supabase settings; supplying the existing public settings resolved setup without code/config changes. Full broad benchmark was not run under FAST FIX.

Normal LMS first: signed-in Commissioner Dashboard and Teams passed before deployment; fresh post-deployment Teams loaded 80 of 108 teams with normal Add Team/management controls before Ask LWR replay. Normal write handlers and authorization code are unchanged. No runtime errors found in the release-window query. Focused read-only pre/post hashes for teams (108), team_members (15), matches (0), line_games (0), and document catalog (7) exactly match. This is a scoped integrity check, not a whole-database snapshot.

No SQL/schema/migration, grants/RLS, Rules/corpus reprocessing, Approved Answer, ratings operations, or production business-data mutations. Ordinary Ask requests created only existing telemetry. No FAST FIX escalation condition triggered. Existing unrelated baseline-test debt remains separate.

Generated validation: two production answer calls, model `gpt-5.5-2026-04-23`, total 3,490 input and 133 output tokens. Existing application estimate: **$0.02144**, excluding embeddings, cache adjustments and billing reconciliation. Baseline insufficient-evidence replay and Live control made no answer-generation calls.

Evidence: `community-fast-fix-focused.txt`, `community-fast-fix-lint.txt`, `community-fast-fix-build.txt`, `community-fast-fix-deploy.txt`, `community-fast-fix-integrity.json`, `community-fast-fix-production-replays.json`.
