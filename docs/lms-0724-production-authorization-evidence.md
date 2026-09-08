# LMS-0724 exact production migration authorization evidence

User approval source: C:/Users/t_ade/.codex/attachments/fa500dfe-1c24-4995-9c06-14a3ea2ba53d/pasted-text.txt.

Exact excerpts:

> The completed replay/ownership correction: docs/lms-0724-replay-ownership-correction.md and the final reviewed LMS-0724 migration/hash are approved for controlled production continuation.

> Apply the reviewed migration exactly once.

The referenced report specifies pending migration lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql and SHA-256 58C333EA3C9684A60475B3E285BA160A3717DA3AFFCAE4888A31E0F2C539F1E0. Bytes supplied to the apply_migration call were verified against this exact hash immediately before the call. Supabase project glikrmmgirilnmamxxyl is the independently verified production project. No different migration or version is proposed.

The report approved by the user details the executor role, private tables, grants/revokes, RLS, exact dispatcher definition, retention helper and non-superuser clean/replay/drift validation. The migration contains no operational member/team/roster/match/Auth DML. The function bodies define future bounded context/audit operations; the migration does not invoke those operations. Existing operational table additions are the specifically reviewed executor column grants and executor-only SELECT policies. No production-wide default privileges are changed.

Automatic review rejected the first apply_migration call as insufficiently explicit high-impact authorization. No alternate execution channel will be used. Read-only post-rejection check confirms no migration record/schema/dispatcher. A retry of the same tool and exact hash is based on the explicit authorization above, not a change of execution path or migration content.
