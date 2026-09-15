# LMS-0725 / 0.1.547 corrected deployment and acceptance pause

**Deployed, NOT production accepted.** The owner’s additional date findings paused acceptance and authorized a local correction only. The compact-welcome clarification replaces the long always-visible introduction. No further deployment is authorized by that local correction. View-As UI parity remains deferred until AI cleanup is production accepted.

## Completed controlled deployment

- Deployment `dpl_EbnsLmMufCfuaTWZR8MWteji6B7y`, READY September 8, 2026 at approximately 15:48:25 UTC.
- Production aliases: `league.lwrpickleballclub.com` and `view-as.lwrpickleballclub.com`.
- CLI deployed the reviewed dirty workspace from the repository root. The old Git commit metadata does not identify the new uploaded contents.
- No SQL, model/environment change, corpus processing or Approved Answer mutation was performed by this deployment.
- Migration `20260908123627 / lms0725_clarification_choices` was already applied once and was not reapplied.

[Deployment log](lms-0725-corrected-production-deploy.txt), [preflight and first-request evidence](lms-0725-corrected-production-evidence.json).

## Production checks actually performed

| Question | Observed result |
|---|---|
| What date can I start entering my roster for weekday league | HTTP 200; Sept. 28, 2026, with League Management unlock and notification; Important Dates and Captains Guide citations |
| when can I start entering my players for my team | Sept. 28, 2026 for Weekday/Saturday/PrimeTime, with registration, activation, captain assignment, unlock and notification |
| Does the weekday dupr league use rally scoring | No generally; Standard Scoring default; only Weekday 9.1 Picklebreaker at a 2–2 tie, 15 by 2, uses Rally |

These are **three targeted production passes**, not a completed 63-case production benchmark. One authorized Helpful vote was submitted on the first answer. The other two had no feedback submitted by this workflow.

First outcome `aa8b8a8f-84d4-46d5-bd1e-edee049eda89`: started 15:49:17.588 UTC, completed 15:49:23.162 UTC, total 5,574 ms, two sources, configured gpt-5.5 (returned gpt-5.5-2026-04-23), 1,874 input / 64 output tokens. The prior failed request took 2,767 ms without successful generation, so these are not comparable success latencies. Verified exact source ranges matched the previously validated Q07 selection before proceeding.

Acceptance stopped when the owner reported both Women’s Weekday start-date variants. The second production failure trace proves Important Dates ranked first at .7569, Stage 3 sufficient, but Stage 4 selected nothing; model skipped. The first reported variant was reproduced locally, but no separate matching production trace was captured. Remaining production benchmark, PDF, role/View-As and broader final acceptance gates were not completed.

## Integrity and concurrent owner activity

Read-only checkpoint at 16:22:21 UTC: Approved Answer full-row counts/hashes still match deployment baseline (1 answer, 2 revisions, 7 events). Migration remains exactly once. View-As maintenance remains active every minute with 60 successes and 0 failures in the prior hour.

Corpus grew from 24 versions / 1,823 chunks to 25 / 1,893. The owner confirmed this was the intentional League Rules upload at 16:20:17 UTC, version `f0aad5ad-cf08-46c2-94fd-686ceb1271c0`. We did not upload, modify or reprocess it. Important Dates remains `f811e60f-9af8-444f-b009-9594a530acd6`. Other active source version IDs remained as recorded. The original HTTP 500 outcome `f3d73d4a-f89b-4ed1-aad8-bdd3dc6a18c7` still records technical_error at 12:42:12.694–12:42:15.461 UTC. No historical records were rewritten by this workflow; a full final historical row-hash comparison was not captured for that individual outcome.

There was concurrent owner testing, so changes to total outcome counts cannot all be attributed to the three controlled questions. HMAC environment metadata was checked without reading secret bytes; no byte-for-byte key comparison is claimed.

[Post-deployment integrity](lms-0725-league-dates-post-integrity.json), [active versions and historic failure](lms-0725-league-dates-active-checkpoint.json), [owner Rules text diff](lms-0725-owner-rules-diff.txt).

The next review artifact is [the local date and compact-help correction](lms-0725-league-dates-and-help.md). Deployment and resumed production acceptance require the owner’s next instruction.
