# Schedule Settings Copy — production schema mismatch review

2026-09-23, read-only diagnosis. The owner reported the Copy Setting dialog error `Could not find the 'is_copy' column of 'league_schedule_settings' in the schema cache`.

## Pre-migration state

- Production Vercel deployment `dpl_2AmrcuBbVz2rywx2QvTuhm7q2QZA` is READY from commit `4340203afcbc527d70aecc4f145d2152b25379c6`. This commit contains Copy Setting and migration `20260922233200_schedule_setting_bye_ownership.sql`.
- The app's configured Supabase project and the connected production project are both `glikrmmgirilnmamxxyl`. Its migration history ends at `20260922204254_lms0757_ratings_identity_member_directory`; the Copy Setting migration is absent.
- Production has no `league_schedule_settings.is_copy` column or `team_byes.schedule_setting_id` column, foreign key, or index. It has 12 schedule setting rows, zero match rows, and zero bye rows. All 12 settings currently have `schedule_status = 'draft'`.
- Pre-change whole-row fingerprints: settings `3167836c25e9d785a31addcf6239fb65`, matches and byes `d41d8cd98f00b204e9800998ecf8427e` each. Recheck immediately before any migration because legitimate activity may continue.
- The existing `matches.schedule_setting_id` foreign key uses `ON DELETE SET NULL`. Authenticated INSERT grants and RLS INSERT policies exist on settings and byes. No permission change is proposed.
- Three focused application/database tests passed on the committed code and isolated migration fixture. Previous `npm run lint` passed with 0 errors and 11 existing warnings; `npm run build` passed. The full repository suite was not completed in the implementation turn.

## Approved correction and result

The owner explicitly approved applying the additive migration on 2026-09-23. The immediately preceding preflight repeated the same 12/0/0 setting/match/bye counts and exact fingerprints, with neither column nor the migration present. The committed SQL was applied only to project `glikrmmgirilnmamxxyl` through Supabase migration `20260923103028_schedule_setting_bye_ownership` and reported success. It adds `league_schedule_settings.is_copy boolean not null default false` and nullable `team_byes.schedule_setting_id uuid`, a foreign key to saved settings with `ON DELETE SET NULL`, and an index. It did not insert, update, or delete match, bye, score, roster, or schedule setting records.

Post-migration: both columns, the foreign key and index exist; all 12 settings have `is_copy=false`; matches and byes remain zero. The settings fingerprint with the new column excluded is still `3167836c25e9d785a31addcf6239fb65`. Match and existing-field bye fingerprints remain `d41d8cd98f00b204e9800998ecf8427e`. Authenticated INSERT privileges cover both new columns, with existing INSERT RLS policies unchanged. Supabase's documented `NOTIFY pgrst, 'reload schema'` was issued, and an anonymous read-only PostgREST `select=id,is_copy` request returned HTTP 200 with zero visible rows, confirming the reported schema-cache error is gone. No production Copy Setting row or schedule was created for a test.

Post-migration Supabase security and performance advisors found no new security issue or unindexed foreign key for either changed table. The new bye index is reported as [unused](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), as expected with zero bye rows; no unrelated advisor finding was changed in this correction.

Normal LMS authenticated UI workflows and the Copy Setting INSERT were not replayed in this correction; there was no authenticated browser session available to the agent, and production setting/match test rows would alter live league data. Production acceptance is limited to the exact schema-cache correction, migration integrity, unchanged existing data and read-only Data API check.

Recovery: the prior READY app deployment `dpl_Cu57LoJShyhARGMAQT3GuXhqdiJ8` (commit `c06b10b04d68fdea81d876ad1d19982771bbe9ef`) is retained. It is compatible with the additive columns; retain the columns during an application rollback. Do not drop them or restore a whole database over later league activity. A local isolated PostgreSQL test verified old rows remain and the new bye foreign key sets its reference to null when a setting is deleted.

FAST FIX did not authorize this scheduling schema migration; the separate owner approval above authorized the exact production correction under `docs/lms-fast-fix-workflow.md` and `docs/live-lms-production-protection.md`.
