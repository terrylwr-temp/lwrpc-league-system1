# FAST FIX — PRODUCTION ACCEPTED

2026-09-14. Saturday league DUPR posting retrieval correction.

## Accepted identity and scope

Application commit `13ef008cdc8a8c03a2bb7479e1ff14aa9298c1b9`, deployment `dpl_5LzEeFQHZt9FoEuhe9X2ASH1VKWD`, immutable host `lwrpc-admin-qyqo3cskq-terry-lwrpc.vercel.app`. Vercel reported READY with the exact reviewed SHA and production alias `league.lwrpickleballclub.com`. Export verified all 1,228 tracked blobs before deployment. The dirty primary checkout and unrelated untracked fixture directory were excluded.

Relative to accepted application92dd94d, three application modules changed: seven added lines and one removed line. Recognize bounded league-specific DUPR posting intent, require the explicit posting clause with same-version league scope, and include this intent in existing scoped authority review. No retrieval-limit, threshold, source-authentication, SQL, authorization, corpus, Approved Answer or business-data changes.

## Diagnosis and tests

The initial intent-only patch6bd7b5e failed exact production replay at20:06:25 UTC: stage3 was sufficient but stage4 found no applicable evidence. A read-only retrieval probe showed the controlling clause at rank16 (score0.4918), beyond the12 authority-review slots. Extending existing scoped review to the posting intent resolves that ranking failure without changing scores, rank order or limits.

Ten permanent controls cover the exact question, five variants, assisted search, rank16 selection, missing/wrong scope, generic-rule insufficiency and adjacent intents. All175 focused tests pass. Lint passes with0 errors and6 pre-existing warnings; build/TypeScript and Vercel build pass. The final application diff passed whitespace checking.

## Production acceptance

Real Terry Adelman Commissioner session, Teams page; no View-As. Reloaded after deployment.

| UTC request | Question | Observed result |
| --- | --- | --- |
|20:19:21.115|Do all games in the Saturday league post to DUPR|No. All gender-based games post; mixed doubles and Picklebreaker do not. OFFICIAL RULES, Rule6.2.3.6 — DUPR Posting — page10.|
|20:19:34.696|Are all Saturday league games submitted to DUPR?|Same correct distinctions and Rule6.2.3.6 page10 citation.|
|20:19:51.049|How does the Saturday Picklebreaker work?|Correct neighboring scoring intent: tied12–12, all mixed teams, one rally-scoring game to25 win by2, three bonus points; no tie means automatic bonus; not recorded in DUPR. Cites6.2.3.5 p9 with p10 continuation.|

All three request outcomes are `answer` / `validated_structured_output`. Normal Teams page remained87 active of113 before/after with Commissioner identity and normal navigation intact. Post-acceptance counts and full-row hashes matched baseline for all14 protected tables: members, member_season_ratings, teams, team_members, user_roles, seasons, leagues, divisions, matches, match_lines, line_games, match_lineups, team_byes and team_standings. No business-data writes were performed.

## Usage and recovery

Three production answer calls used gpt-5.5-2026-04-23: input5071 tokens, output262 tokens. At the existing uncached estimator ($5/M input, $30/M output), estimated answer cost is $0.033215; excludes embeddings and is not an invoice. Failed exact replay skipped answer generation. Two read-only diagnostic retrievals used22 embedding tokens total and no answer calls. No broad generated benchmark.

Recovery remains the prior accepted application92dd94d106e2375f1b3c22244c8cf0a9ebcce597, READY deployment dpl_39SWo7yb9HnM4vMnbEGjATj26E4a, immutable host lwrpc-admin-kps36bfnb-terry-lwrpc.vercel.app. Application rollback only; no database rollback required.

Local evidence: posting-focused.log, posting-lint.log, posting-build.log, posting-deploy-final.log, posting-production-export.json, posting-live-selection.log and posting-integrity-before/after.json in the primary workspace docs directory. Source fixture preserves the active Rules version f60f9c42-70b8-4310-aa0d-934047a04df5, posting chunk66021104-6260-480d-9af8-bcc04e2060fc and same-version Saturday parent ee554909-ca28-4146-b240-dd23fba0bec1.
