# LMS-0724 production migration and acceptance

Current status: **migration applied and post-migration security/integrity checks passed; application deployment/acceptance pending.** Last accepted application baseline remains LMS-0723 / 0.1.545.

Exact approved file: 20260907201448_lms0724_view_as.sql. SHA-256: 58C333EA3C9684A60475B3E285BA160A3717DA3AFFCAE4888A31E0F2C539F1E0. Applied unchanged once using Supabase apply_migration to glikrmmgirilnmamxxyl following direct user authorization. The service recorded migration name lms0724_view_as with generated history version **20260908004527**; the approved source filename remains unchanged. Do not reapply the source because its local filename timestamp differs from the service-recorded timestamp.

Post-application read-only verification:

- Exactly one LMS-0724 migration record; four private RLS-enabled tables, six indexes and the reviewed constraints/two context FKs. Eight internal FK triggers; zero custom user triggers.
- Dispatcher exact body MD5 b4d2b0a12d404aa15272146fa06d63dc equals the approved source literal. Executor owner, SECURITY DEFINER, fixed empty search_path and exact service_role EXECUTE verified.
- Executor NOLOGIN/NOINHERIT, no superuser/BYPASSRLS. Only migration operator postgres has recorded executor membership; no runtime/browser member. Multiple grantor entries express non-inherited ownership-administration and explicit SET capability, not extra runtime principals.
- PUBLIC/browser function access absent; anon/authenticated denied dispatcher and maintenance EXECUTE. service_role has EXECUTE but no direct access to any private table. Executor has no broad operational table SELECT; exact approved column grants include teams.home_location_id, never teams.location_id.
- Twelve executor-only public SELECT policies and four private policies. Original policy/function fingerprints unchanged after excluding explicitly added View-As objects.
- Members, teams, rosters, matches, Auth users, identity-link rows, documents, versions, chunks and Approved Answer revision fingerprints exactly unchanged across application. No context, audit or diagnostic row created by migration.
- Production replay was not executed. Exact dispatcher/catalog state is compared to the reviewed artifact whose non-superuser clean/replay/partial/drift tests passed locally.

DNS/HTTPS and the two exact origin variables plus sensitive encryption key were configured previously. HMAC unchanged. No target session created. Production UI/security/AI/latency acceptance remains pending deployment.
