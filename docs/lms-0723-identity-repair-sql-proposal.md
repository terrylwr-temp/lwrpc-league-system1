# LMS-0723 identity reconciliation — exact SQL proposal, NOT applied

**2026-09-07 implementation STOP:** the subsequent approval prohibits this proposal's broad table locks. A real multi-session row/advisory-lock replacement experiment reproduced an unsafe concurrent duplicate-candidate commit and a missing expected-role-state guard. This historical SQL is **not production-ready or authorized for application**. See [concurrency evidence and required design correction](lms-0723-identity-concurrency-stop.md). No replacement migration has been finalized.

Review artifact only. This is **not** a migration in the application migration directory. No production SQL below has been executed. Initial maintenance design: database-owner execution only, one reviewed identity per transaction, no browser or service-role RPC. Do not run before owner approval, backup and fresh classification. The accompanying design explains the 15 eligible candidates and the 117 incomplete identities excluded from automatic repair.

The function takes immutable IDs from a protected reviewed manifest, not browser input. `p_actor` records the authorizing Commissioner; `session_user` independently records the database operator. This is an owner-operated maintenance function, not a server identity assertion. A future server-triggered reconciler needs separate authorization review; do not simply grant this function to the service role.

The following DDL must run as `postgres` in a transaction after confirming these new object names do not exist. Fail on collision rather than accepting an unknown existing object. Defaults are explicitly revoked. No existing object privileges change.

```sql
BEGIN;
CREATE SCHEMA identity_repair_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA identity_repair_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE identity_repair_private.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor uuid NOT NULL,
  database_operator text NOT NULL DEFAULT session_user,
  auth_user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('link_auth_row','link_member_row','consolidate_identical_split','rollback')),
  method text NOT NULL CHECK (method IN ('verified_exact_normalized_email','guarded_restore')),
  before_rows jsonb NOT NULL CHECK (jsonb_typeof(before_rows)='array'),
  after_rows jsonb NOT NULL CHECK (jsonb_typeof(after_rows)='array')
);
ALTER TABLE identity_repair_private.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON identity_repair_private.events FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION identity_repair_private.reconcile(
  p_run uuid, p_actor uuid, p_auth uuid, p_member uuid
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  a record; m record; ar public.user_roles%ROWTYPE; mr public.user_roles%ROWTYPE;
  has_ar boolean; has_mr boolean; e text; n bigint; op text;
  before_state jsonb; after_state jsonb;
BEGIN
  IF p_run IS NULL OR p_actor IS NULL OR p_auth IS NULL OR p_member IS NULL THEN
    RAISE EXCEPTION 'missing_manifest_identifier';
  END IF;
  -- Fixed order. Short-lived table locks close phantom races from legacy writers
  -- that do not participate in advisory locking. No team/roster/match lock.
  -- Caller MUST set a short lock_timeout and execute one identity per transaction.
  LOCK TABLE auth.users IN SHARE MODE;
  LOCK TABLE public.members IN SHARE MODE;
  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id
    WHERE r.user_id=p_actor AND r.role='commissioner' AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until<=now())) THEN
    RAISE EXCEPTION 'authorizing_commissioner_required';
  END IF;
  SELECT id, email, email_confirmed_at, email_change, deleted_at, banned_until, is_anonymous
    INTO a FROM auth.users WHERE id=p_auth FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'auth_missing'; END IF;
  SELECT id, email, is_active_member INTO m FROM public.members WHERE id=p_member FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'member_missing'; END IF;
  PERFORM id FROM public.user_roles WHERE user_id=p_auth OR member_id=p_member ORDER BY id FOR UPDATE;
  SELECT * INTO ar FROM public.user_roles WHERE user_id=p_auth; has_ar:=FOUND;
  SELECT count(*) INTO n FROM public.user_roles WHERE member_id=p_member;
  IF n>1 THEN RAISE EXCEPTION 'multiple_member_role_rows'; END IF;
  SELECT * INTO mr FROM public.user_roles WHERE member_id=p_member; has_mr:=FOUND;
  IF has_ar AND ar.member_id IS NOT NULL AND ar.member_id<>p_member THEN
    RAISE EXCEPTION 'auth_already_linked_elsewhere';
  END IF;
  IF has_mr AND mr.user_id IS NOT NULL AND mr.user_id<>p_auth THEN
    RAISE EXCEPTION 'member_already_linked_elsewhere';
  END IF;
  IF has_ar AND ar.member_id=p_member THEN
    RETURN 'already_linked'; -- immutable link is not rewritten after an email change
  END IF;
  e:=lower(btrim(a.email));
  IF e IS NULL OR e='' OR e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR a.email_confirmed_at IS NULL OR coalesce(a.email_change,'')<>''
     OR a.deleted_at IS NOT NULL OR a.is_anonymous IS TRUE
     OR a.banned_until>now() THEN RAISE EXCEPTION 'auth_not_reconcilable'; END IF;
  IF m.is_active_member IS DISTINCT FROM true OR lower(btrim(m.email)) IS DISTINCT FROM e THEN
    RAISE EXCEPTION 'member_not_reconcilable';
  END IF;
  SELECT count(*) INTO n FROM auth.users WHERE lower(btrim(email))=e;
  IF n<>1 THEN RAISE EXCEPTION 'nonunique_auth_email'; END IF;
  -- Count inactive duplicates too: do not guess which historical identity is intended.
  SELECT count(*) INTO n FROM public.members WHERE lower(btrim(email))=e;
  IF n<>1 THEN RAISE EXCEPTION 'nonunique_member_email'; END IF;
  IF NOT has_ar AND NOT has_mr THEN RAISE EXCEPTION 'no_existing_role_authority'; END IF;
  IF (has_ar AND ar.role NOT IN ('player','captain','club_pro','league_manager','commissioner'))
    OR (has_mr AND mr.role NOT IN ('player','captain','club_pro','league_manager','commissioner')) THEN
    RAISE EXCEPTION 'unsupported_role';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]'::jsonb) INTO before_state
    FROM public.user_roles r WHERE r.user_id=p_auth OR r.member_id=p_member;
  IF has_ar AND has_mr THEN
    IF ar.role IS DISTINCT FROM mr.role OR ar.member_id IS NOT NULL OR mr.user_id IS NOT NULL THEN
      RAISE EXCEPTION 'split_role_conflict';
    END IF;
    -- Any future FK to role-row IDs requires a new review, not cascading deletion.
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
      WHERE contype='f' AND confrelid='public.user_roles'::regclass) THEN
      RAISE EXCEPTION 'role_row_reference_requires_review';
    END IF;
    DELETE FROM public.user_roles WHERE id=mr.id;
    UPDATE public.user_roles SET member_id=p_member, updated_at=clock_timestamp() WHERE id=ar.id;
    op:='consolidate_identical_split';
  ELSIF has_ar THEN
    UPDATE public.user_roles SET member_id=p_member, updated_at=clock_timestamp() WHERE id=ar.id;
    op:='link_auth_row';
  ELSE
    UPDATE public.user_roles SET user_id=p_auth, updated_at=clock_timestamp() WHERE id=mr.id;
    op:='link_member_row';
  END IF;
  SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) INTO after_state FROM public.user_roles r
    WHERE r.user_id=p_auth OR r.member_id=p_member;
  IF jsonb_array_length(after_state)<>1 THEN RAISE EXCEPTION 'postcondition_failed'; END IF;
  INSERT INTO identity_repair_private.events(run_id,actor,auth_user_id,member_id,operation,method,before_rows,after_rows)
    VALUES(p_run,p_actor,p_auth,p_member,op,'verified_exact_normalized_email',before_state,after_state);
  RETURN op;
END
$function$;
REVOKE ALL ON FUNCTION identity_repair_private.reconcile(uuid,uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
```

Maintenance invocation is parameterized, with values supplied through the protected driver binding interface; `$1..$4` are database protocol parameters, not interpolated SQL. On lock timeout, serialization error, conflicting state or audit failure: roll back, reclassify and retry later if still approved. Never hold a transaction open for human approval.

```sql
BEGIN;
SET LOCAL lock_timeout = '1500ms';
SET LOCAL statement_timeout = '5s';
SELECT identity_repair_private.reconcile($1::uuid,$2::uuid,$3::uuid,$4::uuid);
COMMIT;
```

No-op replay changes neither role rows nor audit count. Every successful mutation and its before/after snapshots commit together. Audit has no email, names, ratings, tokens or credentials; snapshots contain only the six existing role-row fields. No audit FKs intentionally: later legitimate account/member deletion must not cascade away provenance. `postgres` retains necessary break-glass capabilities; append-only means no application role can update/delete events, not that a database owner is technically unable to do so.

Manual-review identifier lookup is a privileged, read-only, bounded report, not a public view. Use the [classification CTE and parameterized manual-review SELECT](lms-0723-identity-classification-query.md), restricted to D/E/F/G/H and ordered by ID with a limit and cursor. Do not export email or member payloads. Review identifiers only inside an owner-authorized database/manager session.
