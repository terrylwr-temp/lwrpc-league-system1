# LMS-0733 / 0.1.555 — immutable release identity

LOCAL RELEASE PREPARATION ONLY. No push, deployment, production SQL or ratings upload/import. Prior SQL authorization remains paused pending review of this identity.

## Release and baseline

Confirmed next unused local repository release: **LMS-0733 / 0.1.555**. All refs' commit messages and version-metadata history were searched for LMS-0733 / 0.1.555 before assignment; no prior release was found. The all-file history search has one textual hit in the baseline acceptance report: “no LMS-0733 started.” This explicitly records non-use, not an assigned release; neither package/version history nor any prior release commit uses the sequence. The normal metadata is `app/lib/version.js`, `package.json` and root/package records in `package-lock.json`.

Accepted baseline: **LMS-0732 / 0.1.554**, deployment `dpl_414rqyGtFAFrcQ6JNRTVH9Qs2cGU`. All **318** files in its retained production-upload manifest verified byte-for-byte with zero mismatches before candidate construction. The baseline was recorded locally as commit `022eb46099ce7d1c6c32af5a0e27a1de5283b627`. Standard Git LF normalization applies to text; the deployment manifest includes canonical hashes to distinguish newline normalization from source changes. Binary files retain exact bytes. This source-baseline commit records the accepted upload; it is not a new deployment or a rewrite of historical acceptance.

Candidate commit: **`e24d27f64953a6128383bb6393bcb383ba67f5dc`**; source tree **`1d1198e97af7cb5cb3b3fc1a0f6350d13fcec7a5`**. Its exact SHA and tree are recorded in the companion `docs/lms-0733-commit-identity.json` after commit, avoiding a self-referential hash. Branch: `codex/lms0733-source-ratings`. Isolated checkout: `.local-validation/lms0733-candidate`. Production review must use this exact commit and the deployment file allowlist, never the original mixed working directory.

## Complete scope

Only reviewed DUPR-ID matching, doublesReliability primary/doublesRe alias, source Doubles/RF/65+-then-50+ age storage, inactive skipping, strict validation, duplicate handling, paginated preview, explicit confirmation, transactional identity/revision revalidation and idempotent source commit; locked Season/PrimeTime/raw-NR/RF inputs remain untouched. Ask LWR/eligibility consume the threshold from scoped active Rules, without a hardcoded default. Clean Ratings prompt/behavior is unchanged; preview shows raw RF only.

The **13-file deployable delta** comprises ten importer/RF source files plus three version metadata files. Exact names and canonical hashes are in `lms-0733-deployment-manifest.json` and `lms-0733-included-files.json`. Narrow `.gitattributes` entries preserve the reviewed migration's original CRLF bytes and recognize CRLF as valid line endings. Two accepted historical SQL fixtures retain their original blank-line spaces rather than rewriting migration history; four existing test files receive whitespace-only cleanup for the staged diff check. Test-support changes include existing normal-LMS tests, historical rollback/evidence fixtures and accepted SQL history needed to reproduce the complete regression suite. Those files are not new runtime behavior or additional authorized production migrations.

Deferred standings-rank work, broader security hardening, unrelated Ask LWR changes, other roadmap implementations and experimental runtime code are excluded. All deployable files outside the explicit 13-file delta match the accepted baseline modulo normal Git text line endings. No deferred-security workspace file is copied into the candidate. Local test harness scripts are isolated verification support and are excluded from the deployment allowlist.

## Uncommitted inventory and included/excluded files

`lms-0733-uncommitted-inventory.json` inventories every nonignored uncommitted original-workspace file at its recorded checkpoint with A/B/C/D category, reason, hash, and inclusion status. Ignored credentials, dependencies, build outputs and `.local-validation` are not candidate inputs. The original working tree remains intentionally mixed and uncommitted; none of it is implicitly staged into this branch.

`lms-0733-included-files.json` lists the candidate commit delta and the **323-file deployment allowlist**. Historical support fixtures may enter the Git commit for reproducible tests but never the application upload. Every file outside the deployment allowlist is excluded from deployment. Production SQL is separately restricted to the single migration below; never run a blanket migration push.

## Migration identity — unchanged

`lwrpc-admin/supabase/migrations/20260910134349_season_ratings_source_import.sql`

Accepted/recalculated SHA-256: `8f532af5b44644e749696d3903785236c6fe173b3119408ca896a220f4543df4`.

The original file and isolated candidate match exactly. A commit-blob hash check is required after staging and commit. No SQL has been applied.

## Validation

**1,154/1,154 full-suite tests pass**, no failures or skips. **59/59 critical controls pass**. Lint: zero errors, six existing warnings in the isolated candidate (the mixed workspace had 11). TypeScript, production build, post-build PDF bundle verification and diff whitespace checks pass. See `lms-0733-validation-results.json` for evidence hashes; full logs are retained in the original workspace docs directory, outside the candidate.

The first isolated build failed only because a dependency junction pointed outside Turbopack's root; a private dependency copy fixed the setup without changing source/configuration. The first full test run lacked three historical rollback fixtures; adding the unchanged fixtures resolved that packaging omission. No application correction or new feature was introduced during release isolation. All checks use the isolated candidate; no model generation occurred (zero calls/tokens/$0).

## Repository status and continuation

The application source/index must match the final commit with no unstaged executable changes. Build outputs/dependencies are ignored; validation logs are retained outside the candidate. The original workspace remains untouched except local release documentation and inventory; its unrelated changes are excluded by isolated checkout and exact deployment allowlist. No push is required to establish this local Git identity.

STOP FOR OWNER REVIEW. After acceptance of the exact commit, resume controlled production review at release-identity verification, then fresh read-only production preflight (accepted baseline, active Rules, 19-table fingerprints, ratings/source state and View-As/maintenance health). Only after all gates pass may the previously specified exact migration and then exact application candidate be considered for the controlled sequence. No production CSV upload/commit is authorized by release preparation. The controlled review must stop at the production preview checkpoint before live import.


Post-commit verification: isolated checkout is completely clean; all 323 deployable Git blobs and the exact migration SHA-256 verified from the immutable commit. Standard Git checkout normalization restored 31 unchanged-content support files; no semantic code change occurred. No push/deployment/SQL/import. This companion report and receipt stay outside the clean candidate to avoid changing its identity.
