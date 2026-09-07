# LMS-0723 auth permission correction — masked RLS boundary STOP

Status: **STOP before mutation. LMS-0723 / 0.1.545 remains deployed, NOT production accepted.** No permission correction, corrective migration, redeployment or new acceptance request was performed in this pass. The original migration remains applied and must not be reapplied.

The owner authorized a schema-usage-only correction after confirming no other missing privilege was masked, expressly prohibited RLS changes, and required stopping if another authorization/security defect appeared. Read-only catalog verification found that USAGE alone is insufficient.

## Exact session path

`ai_live_private.session_valid(uuid,uuid)` is a SECURITY DEFINER SQL function owned by `ai_live_session_reader`, with fixed empty search_path. It tests `auth.sessions.id`, `user_id`, and `not_after`. The role is NOLOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS and has no inherited role memberships.

## Effective footprint before correction

| Boundary | Production result |
|---|---|
| SELECT sessions.id/user_id/not_after | Granted |
| SELECT any other sessions column | Denied, including token HMAC/counter, factor, IP, user-agent fields |
| SELECT full sessions table | Denied |
| SELECT any column of other auth tables | Denied |
| INSERT/UPDATE/DELETE on every inspected auth table | Denied |
| USAGE / CREATE on auth schema | Both false |
| auth schema owner | supabase_admin |
| Connected executor | postgres |
| Executor auth USAGE WITH GRANT OPTION | false |
| Executor may SET ROLE supabase_admin | false |

Representative protected objects include users, identities, refresh_tokens, one_time_tokens, flow_state, MFA factors/challenges/claims, SAML/SSO, OAuth and WebAuthn tables. Catalog privilege checks returned no unrelated data access; no actual sensitive field values were selected or reported.

Four standard auth JWT-claim helpers (`uid`, `role`, `email`, `jwt`) already have PUBLIC EXECUTE independently of schema USAGE. Thus granting USAGE does not create function privileges, but would make those pre-existing executable functions reachable. It would be inaccurate to claim every auth function is denied. No PUBLIC grants were revoked and no defaults were changed. Existing auth default ACLs do not grant this reader blanket access to future tables.

## Second masked authorization blocker

Read-only catalog result for `auth.sessions`:

- RLS enabled: **true**.
- FORCE RLS: false.
- Table owner: **supabase_auth_admin**.
- Policies: **none**.
- Reader bypass RLS: **false**.
- Reader is not table owner.

A non-owner/non-bypass role with no applicable policy sees no rows under RLS. Therefore granting schema USAGE would remove the schema-resolution error but would **not** make the session existence check succeed for legitimate sessions. The resulting helper would return false and deny live requests. Schema usage is necessary but not sufficient.

This is an additional authorization-design contradiction masked by the original missing-schema error. The isolated fixture created auth.sessions without production's RLS boundary, so earlier synthetic tests did not model this constraint. Production-realistic validation must include both separate schema ownership/grant-option and enabled session RLS with no reader policy.

## Why no corrective migration was produced/applied

The current executor cannot issue an effective direct schema grant, and the authorized single grant would still leave the RLS blocker. Producing/applying a purported complete corrective migration containing only that grant would be misleading. The original migration was not edited/reapplied. No alternative role inheritance, BYPASSRLS, ownership change, broader Auth grants, new helper, policy or default-privilege change was attempted.

A separately reviewed design must establish a supported narrow session-validation mechanism that works with Supabase's managed schema ownership and RLS boundary. Any RLS/helper/ownership alternative exceeds this approval's explicit constraints and requires review before implementation. Do not adopt unrestricted definer ownership or grant broader roles simply to make the test pass.

## Requested gate disposition

- Root cause / role / column permissions / masked-boundary review: completed read-only.
- Corrective SQL, before/after success, actual unrelated-auth denial execution after correction: **not performed** because the masked RLS stop condition was reached. Catalog negative privilege checks completed; no post-correction result claimed.
- Self-rating retry: not run; no correction in place.
- Remaining production live/privacy/feedback/audit/document sanity/integrity acceptance: not resumed.
- Full project validation: not rerun because no code/SQL correction was made; prior 633-test suite remains historical local evidence, not proof of production session authorization.
- Zero new model/embedding calls, no new live telemetry/feedback event in this pass.
- Only local documentation changed; no deploy or rollback. Last accepted release remains LMS-0722 / 0.1.544.

Seasonal empty rosters and matches remain separately accepted limitations. First legitimate roster verification must cover Captain/Co-Captain managed rating/email/roster, unrelated email denial and explicit subject/no-self-fallback; first legitimate match verification must cover next match/opponent/location and follow-up authorization. Those limitations do not waive the actual session authorization blocker or document regression gates.
