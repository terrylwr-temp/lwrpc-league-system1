# LMS-0725 production preflight — historical scope stop

Superseded by the owner SQL authorization clarification. See [current production status](lms-0725-production-acceptance.md): exact migration applied and application deployed; acceptance subsequently stopped on the first failed roster-date replay.

September 8, 2026. Target 0.1.547 is **not deployed and not production accepted**. LMS-0724 / 0.1.546 remains the recorded accepted baseline; live production was not reverified in this stopped preflight.

The latest production approval explicitly requires “no production SQL required by LMS-0725” and says “Do not apply SQL.” The approved implementation report, however, includes a required guarded migration and places its application before deployment in acceptance steps 3–4.

The concrete dependency is `lwrpc-admin/supabase/migrations/20260908114532_lms0725_clarification_choices.sql`, SHA256 `9EF22DEB9422E7D7D1F7FA915224CC1F527CC72D043510D53F73C85F0D4ABE85`. It replaces `ai_live_private.lookup(uuid,uuid,jsonb)` and `view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)` to return combined rating/season choices, choice categories and authorized roster counts. These changes are present in the reviewed isolated tests; they cannot be supplied by deploying the application alone. The migration is intended to preserve existing signatures, ownership, invoker security, ACLs, RLS and View-As locks.

No deployment, production SQL, production replay, corpus change, Approved Answer, configuration change or correction was attempted. Production health, corpus/HMAC integrity, performance and the 63 production answers remain untested in this attempt. No production failure is being inferred from this local artifact conflict.

Resolution requires owner review: either explicitly authorize this exact guarded migration as an exception to the no-SQL instruction, followed by the remaining read-only preflight before application, or request a revised SQL-free implementation and renewed local validation/review. Do not deploy the current application as though the database dependency were absent. No new version or View-As parity work has started.

[Reviewed implementation and rollback sequence](lms-0725-implementation-report.md).
