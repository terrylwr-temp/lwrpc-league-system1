-- LMS-0723 / 0.1.545. Local corrective migration; never reapply Live/session migrations.
-- App-owned Auth hook coordinates only material identity fields. It never edits NEW.
BEGIN;
SET LOCAL lock_timeout='1500ms';
SET LOCAL statement_timeout='10s';
CREATE SCHEMA identity_repair_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA identity_repair_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE identity_repair_private.config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 installed_at timestamptz NOT NULL DEFAULT clock_timestamp(), sealed boolean NOT NULL DEFAULT false,
 approved_manifest_id uuid NOT NULL DEFAULT '57fb2ed9-d821-4264-a48a-1cf8105dee36',
 approved_manifest_sha256 text NOT NULL DEFAULT 'f28b31208beca918bff2095b549a4c70bf18bc221b48d5fa8773bcd24fc2b076' CHECK(approved_manifest_sha256 ~ '^[0-9a-f]{64}$')
);
INSERT INTO identity_repair_private.config DEFAULT VALUES;
CREATE TABLE identity_repair_private.events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL,
 at timestamptz NOT NULL DEFAULT clock_timestamp(), actor uuid,
 actor_kind text NOT NULL DEFAULT 'owner' CHECK(actor_kind IN ('owner','system')),
 CHECK(actor_kind='system' OR actor IS NOT NULL),
 database_operator text NOT NULL DEFAULT session_user,
 auth_user_id uuid NOT NULL, member_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN ('link_member_row','consolidate_identical_split','prospective_link','rollback')),
 method text NOT NULL DEFAULT 'verified_exact_normalized_email',
 before_rows jsonb NOT NULL CHECK(jsonb_typeof(before_rows)='array'),
 after_rows jsonb NOT NULL CHECK(jsonb_typeof(after_rows)='array')
);
CREATE TABLE identity_repair_private.reviewed (
 auth_user_id uuid PRIMARY KEY, member_id uuid NOT NULL UNIQUE,
 run_id uuid NOT NULL, actor uuid NOT NULL,
 shape text NOT NULL CHECK(shape IN ('member_row','identical_split')),
 expected_state jsonb NOT NULL, after_state jsonb,
 applied_event uuid REFERENCES identity_repair_private.events(id),
 rolled_back boolean NOT NULL DEFAULT false
);
ALTER TABLE identity_repair_private.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_repair_private.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_repair_private.reviewed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON identity_repair_private.config,identity_repair_private.events,identity_repair_private.reviewed
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION identity_repair_private.email_key(e text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN nullif(lower(btrim(e)),'') IS NULL THEN NULL
 ELSE 'E:'||encode(sha256(convert_to(lower(btrim(e)),'UTF8')),'hex') END
$$;
CREATE FUNCTION identity_repair_private.take_keys(keys text[]) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE k text;
BEGIN
 FOR k IN SELECT DISTINCT x FROM unnest(keys) x WHERE x IS NOT NULL ORDER BY x LOOP
  -- A hash collision adds conservative contention; full IDs/state decide identity.
  IF NOT pg_try_advisory_xact_lock(hashtextextended('lms0723.identity.'||k,0)) THEN
   RAISE EXCEPTION USING ERRCODE='55P03',MESSAGE='identity_busy';
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION identity_repair_private.keys_for(u uuid,m uuid) RETURNS text[]
LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT ARRAY['U:'||u::text,'M:'||m::text,
  identity_repair_private.email_key((SELECT email FROM auth.users WHERE id=u)),
  identity_repair_private.email_key((SELECT email FROM public.members WHERE id=m))]
$$;
CREATE FUNCTION identity_repair_private.eligible(u uuid,m uuid) RETURNS boolean
LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users a JOIN public.members b ON b.id=m WHERE a.id=u
  AND a.email_confirmed_at IS NOT NULL AND coalesce(a.email_change,'')=''
  AND a.deleted_at IS NULL AND (a.banned_until IS NULL OR a.banned_until<=now())
  AND a.is_anonymous IS NOT TRUE AND b.is_active_member IS TRUE
  AND lower(btrim(a.email)) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND lower(btrim(a.email))=lower(btrim(b.email))
  AND (SELECT count(*) FROM auth.users x WHERE lower(btrim(x.email))=lower(btrim(a.email)))=1
  AND (SELECT count(*) FROM public.members x WHERE lower(btrim(x.email))=lower(btrim(a.email)))=1
  AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE
   (r.user_id=u AND r.member_id IS NOT NULL AND r.member_id<>m)
   OR (r.member_id=m AND r.user_id IS NOT NULL AND r.user_id<>u)))
$$;
CREATE FUNCTION identity_repair_private.state(u uuid,m uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT jsonb_build_object(
 'auth',(SELECT jsonb_build_object('id',a.id,'email',identity_repair_private.email_key(a.email),
  'confirmed',extract(epoch FROM a.email_confirmed_at),'change',identity_repair_private.email_key(a.email_change),
  'deleted',extract(epoch FROM a.deleted_at),'banned',extract(epoch FROM a.banned_until),
  'anonymous',a.is_anonymous,'sso',a.is_sso_user) FROM auth.users a WHERE a.id=u),
 'member',(SELECT jsonb_build_object('id',b.id,'email',identity_repair_private.email_key(b.email),'active',b.is_active_member)
  FROM public.members b WHERE b.id=m),
 'roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'member_id',r.member_id,
  'role',r.role,'created',extract(epoch FROM r.created_at),'updated',extract(epoch FROM r.updated_at)) ORDER BY r.id),'[]')
  FROM public.user_roles r WHERE r.user_id=u OR r.member_id=m))
$$;
CREATE FUNCTION identity_repair_private.role_rows(u uuid,m uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'member_id',r.member_id,
 'role',r.role,'created_at',r.created_at,'updated_at',r.updated_at) ORDER BY r.id),'[]')
 FROM public.user_roles r WHERE r.user_id=u OR r.member_id=m
$$;

CREATE FUNCTION identity_repair_private.coordinate_writer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o jsonb:='{}'; n jsonb:='{}'; keys text[]:='{}'; j jsonb; u uuid; m uuid; e text;
BEGIN
 IF TG_OP<>'INSERT' THEN o:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN n:=to_jsonb(NEW); END IF;
 -- Some clients send unchanged identity columns with unrelated profile/sign-in edits.
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_SCHEMA='auth' AND
   o->>'id' IS NOT DISTINCT FROM n->>'id' AND
   ARRAY[o->>'email',o->>'email_confirmed_at',o->>'email_change',o->>'deleted_at',o->>'banned_until',o->>'is_anonymous',o->>'is_sso_user']
    IS NOT DISTINCT FROM ARRAY[n->>'email',n->>'email_confirmed_at',n->>'email_change',n->>'deleted_at',n->>'banned_until',n->>'is_anonymous',n->>'is_sso_user'] THEN RETURN NEW;
  ELSIF TG_TABLE_NAME='members' AND
   ARRAY[o->>'id',o->>'email',o->>'is_active_member'] IS NOT DISTINCT FROM ARRAY[n->>'id',n->>'email',n->>'is_active_member'] THEN RETURN NEW;
  END IF;
 END IF;
 FOR j IN SELECT x FROM unnest(ARRAY[o,n]) x LOOP
  IF TG_TABLE_SCHEMA='auth' THEN
   keys:=keys||ARRAY['U:'||(j->>'id'),identity_repair_private.email_key(j->>'email')];
  ELSIF TG_TABLE_NAME='members' THEN
   keys:=keys||ARRAY['M:'||(j->>'id'),identity_repair_private.email_key(j->>'email')];
  ELSE
   keys:=keys||ARRAY['R:'||(j->>'id')]||identity_repair_private.keys_for((j->>'user_id')::uuid,(j->>'member_id')::uuid);
  END IF;
 END LOOP;
 -- Row triggers can already own tuple locks. Never wait on coordination here.
 PERFORM identity_repair_private.take_keys(keys);
 IF TG_OP<>'DELETE' THEN
  e:=lower(btrim(n->>'email'));
  IF TG_TABLE_NAME='members' AND (TG_OP='INSERT' OR o->>'email' IS DISTINCT FROM n->>'email') THEN
   IF EXISTS(SELECT 1 FROM public.members b JOIN public.user_roles r ON r.member_id=b.id
    WHERE b.id<>(n->>'id')::uuid AND r.user_id IS NOT NULL AND lower(btrim(b.email))=e) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='identity_conflict';
   END IF;
  ELSIF TG_TABLE_SCHEMA='auth' AND (TG_OP='INSERT' OR o->>'email' IS DISTINCT FROM n->>'email') THEN
   IF EXISTS(SELECT 1 FROM public.user_roles r JOIN public.members b ON b.id=r.member_id
     JOIN auth.users a ON a.id=r.user_id WHERE a.id<>(n->>'id')::uuid
     AND (lower(btrim(a.email))=e OR lower(btrim(b.email))=e)) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='identity_conflict';
   END IF;
  ELSIF TG_TABLE_NAME='user_roles' THEN
   u:=(n->>'user_id')::uuid; m:=(n->>'member_id')::uuid;
   IF u IS NOT NULL AND m IS NOT NULL AND (TG_OP='INSERT'
     OR o->>'user_id' IS DISTINCT FROM n->>'user_id' OR o->>'member_id' IS DISTINCT FROM n->>'member_id')
     AND NOT identity_repair_private.eligible(u,m) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='identity_conflict';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER lms0723_identity_member_writer BEFORE INSERT OR DELETE OR UPDATE OF id,email,is_active_member
 ON public.members FOR EACH ROW EXECUTE FUNCTION identity_repair_private.coordinate_writer();
CREATE TRIGGER lms0723_identity_role_writer BEFORE INSERT OR UPDATE OR DELETE
 ON public.user_roles FOR EACH ROW EXECUTE FUNCTION identity_repair_private.coordinate_writer();
CREATE TRIGGER lms0723_identity_auth_writer BEFORE INSERT OR DELETE OR UPDATE OF id,email,email_confirmed_at,email_change,deleted_at,banned_until,is_anonymous,is_sso_user
 ON auth.users FOR EACH ROW EXECUTE FUNCTION identity_repair_private.coordinate_writer();

CREATE FUNCTION identity_repair_private.shape(u uuid,m uuid) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE a public.user_roles%ROWTYPE; b public.user_roles%ROWTYPE; na integer; nm integer;
BEGIN
 IF NOT identity_repair_private.eligible(u,m) THEN RETURN NULL; END IF;
 SELECT count(*) INTO na FROM public.user_roles WHERE user_id=u;
 SELECT count(*) INTO nm FROM public.user_roles WHERE member_id=m;
 IF nm<>1 OR na>1 THEN RETURN NULL; END IF;
 SELECT * INTO a FROM public.user_roles WHERE user_id=u;
 SELECT * INTO b FROM public.user_roles WHERE member_id=m;
 IF b.role NOT IN ('player','captain','club_pro','league_manager','commissioner') THEN RETURN NULL; END IF;
 IF na=0 AND b.user_id IS NULL THEN RETURN 'member_row'; END IF;
 IF na=1 AND a.member_id IS NULL AND b.user_id IS NULL AND a.role=b.role THEN RETURN 'identical_split'; END IF;
 RETURN NULL;
END $$;
-- Owner maintenance only. Expected entries come from the protected reviewed manifest.
CREATE FUNCTION identity_repair_private.seal_manifest(manifest_text text,actor_id uuid) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE cfg identity_repair_private.config%ROWTYPE; doc jsonb; x jsonb; run uuid; entries jsonb;
BEGIN
 PERFORM identity_repair_private.take_keys(ARRAY['MANIFEST']);
 SELECT * INTO cfg FROM identity_repair_private.config;
 -- Exact UTF-8 file bytes, not a reformatted JSON serialization. No current scan.
 IF encode(sha256(convert_to(manifest_text,'UTF8')),'hex') IS DISTINCT FROM cfg.approved_manifest_sha256 THEN RETURN 'MANIFEST_MISMATCH'; END IF;
 doc:=manifest_text::jsonb;run:=(doc->>'manifest_id')::uuid;entries:=doc->'candidates';
 IF run IS DISTINCT FROM cfg.approved_manifest_id OR doc->>'project_id' IS DISTINCT FROM 'glikrmmgirilnmamxxyl'
  OR doc->>'status' IS DISTINCT FROM 'PROPOSED_NOT_APPROVED_FOR_MUTATION'
  OR jsonb_typeof(entries) IS DISTINCT FROM 'array' OR jsonb_array_length(entries) NOT BETWEEN 1 AND 16
  OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor_id AND role='commissioner') THEN RETURN 'REFUSED'; END IF;
 IF cfg.sealed THEN RETURN 'SEALED'; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(entries) ORDER BY value->>'auth' LOOP
  IF x->>'shape' NOT IN ('member_row','identical_split') OR jsonb_typeof(x->'expected') IS DISTINCT FROM 'object'
   OR x->'expected'->'auth'->>'id' IS DISTINCT FROM x->>'auth'
   OR x->'expected'->'member'->>'id' IS DISTINCT FROM x->>'member' THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='invalid_review';
  END IF;
  -- Seal the exact approved state even if a candidate is now stale. Each repair
  -- revalidates separately, so stale entries cannot replace or block safe peers.
  INSERT INTO identity_repair_private.reviewed(auth_user_id,member_id,run_id,actor,shape,expected_state)
   VALUES((x->>'auth')::uuid,(x->>'member')::uuid,run,actor_id,x->>'shape',x->'expected');
 END LOOP;
 UPDATE identity_repair_private.config SET sealed=true;
 RETURN 'SEALED';
EXCEPTION WHEN lock_not_available THEN RETURN 'BUSY';
 WHEN integrity_constraint_violation OR invalid_text_representation THEN RETURN 'REFUSED';
END $$;
CREATE FUNCTION identity_repair_private.repair(u uuid) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r identity_repair_private.reviewed%ROWTYPE; a public.user_roles%ROWTYPE; b public.user_roles%ROWTYPE;
 before_data jsonb; event_id uuid;
BEGIN
 SELECT * INTO r FROM identity_repair_private.reviewed WHERE auth_user_id=u FOR UPDATE NOWAIT;
 IF NOT FOUND THEN RETURN 'NOT_REVIEWED'; END IF;
 PERFORM identity_repair_private.take_keys(identity_repair_private.keys_for(u,r.member_id));
 IF r.rolled_back THEN RETURN 'ROLLED_BACK'; END IF;
 IF r.applied_event IS NOT NULL THEN
  IF identity_repair_private.state(u,r.member_id)=r.after_state THEN RETURN 'ALREADY_REPAIRED'; END IF;
  RETURN 'STALE';
 END IF;
 PERFORM id FROM public.user_roles WHERE user_id=u OR member_id=r.member_id ORDER BY id FOR UPDATE NOWAIT;
 IF identity_repair_private.state(u,r.member_id) IS DISTINCT FROM r.expected_state
  OR identity_repair_private.shape(u,r.member_id) IS DISTINCT FROM r.shape THEN RETURN 'STALE'; END IF;
 before_data:=identity_repair_private.role_rows(u,r.member_id);
 SELECT * INTO b FROM public.user_roles WHERE member_id=r.member_id;
 IF r.shape='identical_split' THEN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE contype='f' AND confrelid='public.user_roles'::regclass) THEN RETURN 'REFERENCE_REVIEW'; END IF;
  SELECT * INTO a FROM public.user_roles WHERE user_id=u;
  DELETE FROM public.user_roles WHERE id=b.id;
  UPDATE public.user_roles SET member_id=r.member_id,updated_at=clock_timestamp() WHERE id=a.id;
 ELSE
  UPDATE public.user_roles SET user_id=u,updated_at=clock_timestamp() WHERE id=b.id;
 END IF;
 INSERT INTO identity_repair_private.events(run_id,actor,auth_user_id,member_id,operation,before_rows,after_rows)
 VALUES(r.run_id,r.actor,u,r.member_id,CASE r.shape WHEN 'identical_split' THEN 'consolidate_identical_split' ELSE 'link_member_row' END,
 before_data,identity_repair_private.role_rows(u,r.member_id)) RETURNING id INTO event_id;
 UPDATE identity_repair_private.reviewed SET applied_event=event_id,after_state=identity_repair_private.state(u,r.member_id) WHERE auth_user_id=u;
 RETURN 'REPAIRED';
EXCEPTION WHEN lock_not_available THEN RETURN 'BUSY';
 WHEN integrity_constraint_violation THEN RETURN 'STALE';
END $$;
CREATE FUNCTION identity_repair_private.rollback_repair(u uuid) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r identity_repair_private.reviewed%ROWTYPE; e identity_repair_private.events%ROWTYPE; j jsonb;
BEGIN
 SELECT * INTO r FROM identity_repair_private.reviewed WHERE auth_user_id=u FOR UPDATE NOWAIT;
 IF NOT FOUND OR r.applied_event IS NULL THEN RETURN 'NOT_REPAIRED'; END IF;
 PERFORM identity_repair_private.take_keys(identity_repair_private.keys_for(u,r.member_id));
 IF r.rolled_back THEN
  IF identity_repair_private.state(u,r.member_id)=r.expected_state THEN RETURN 'ALREADY_ROLLED_BACK'; END IF;
  RETURN 'STALE';
 END IF;
 PERFORM id FROM public.user_roles WHERE user_id=u OR member_id=r.member_id ORDER BY id FOR UPDATE NOWAIT;
 IF identity_repair_private.state(u,r.member_id) IS DISTINCT FROM r.after_state THEN RETURN 'STALE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE contype='f' AND confrelid='public.user_roles'::regclass) THEN RETURN 'REFERENCE_REVIEW'; END IF;
 SELECT * INTO e FROM identity_repair_private.events WHERE id=r.applied_event;
 DELETE FROM public.user_roles WHERE user_id=u OR member_id=r.member_id;
 FOR j IN SELECT value FROM jsonb_array_elements(e.before_rows) LOOP
  INSERT INTO public.user_roles(id,user_id,member_id,role,created_at,updated_at)
  VALUES((j->>'id')::uuid,(j->>'user_id')::uuid,(j->>'member_id')::uuid,j->>'role',(j->>'created_at')::timestamptz,(j->>'updated_at')::timestamptz);
 END LOOP;
 INSERT INTO identity_repair_private.events(run_id,actor,auth_user_id,member_id,operation,method,before_rows,after_rows)
 VALUES(r.run_id,r.actor,u,r.member_id,'rollback','guarded_restore',e.after_rows,e.before_rows);
 UPDATE identity_repair_private.reviewed SET rolled_back=true WHERE auth_user_id=u;
 RETURN 'ROLLED_BACK';
EXCEPTION WHEN lock_not_available THEN RETURN 'BUSY';
 WHEN integrity_constraint_violation THEN RETURN 'STALE';
END $$;

-- Future account infrastructure only: never scan/provision the historical backlog.
CREATE FUNCTION identity_repair_private.link_future_existing_role(u uuid) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE m uuid; b public.user_roles%ROWTYPE; before_data jsonb; cutoff timestamptz;
BEGIN
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u AND member_id IS NOT NULL) THEN RETURN 'ALREADY_LINKED'; END IF;
 IF EXISTS(SELECT 1 FROM identity_repair_private.reviewed WHERE auth_user_id=u) THEN RETURN 'REVIEW_REQUIRED'; END IF;
 SELECT id INTO m FROM public.members WHERE lower(btrim(email))=(SELECT lower(btrim(email)) FROM auth.users WHERE id=u) ORDER BY id LIMIT 1;
 IF m IS NULL THEN RETURN 'PENDING'; END IF;
 PERFORM identity_repair_private.take_keys(identity_repair_private.keys_for(u,m));
 IF identity_repair_private.shape(u,m) IS DISTINCT FROM 'member_row' THEN RETURN 'PENDING'; END IF;
 SELECT * INTO b FROM public.user_roles WHERE member_id=m FOR UPDATE NOWAIT;
 SELECT installed_at INTO cutoff FROM identity_repair_private.config;
 IF NOT (coalesce(b.created_at>=cutoff,false)
  OR coalesce((SELECT created_at>=cutoff FROM auth.users WHERE id=u),false)
  OR coalesce((SELECT created_at>=cutoff FROM public.members WHERE id=m),false)) THEN RETURN 'REVIEW_REQUIRED'; END IF;
 before_data:=identity_repair_private.role_rows(u,m);
 UPDATE public.user_roles SET user_id=u,updated_at=clock_timestamp() WHERE id=b.id;
 INSERT INTO identity_repair_private.events(run_id,actor_kind,auth_user_id,member_id,operation,before_rows,after_rows)
 VALUES(gen_random_uuid(),'system',u,m,'prospective_link',before_data,identity_repair_private.role_rows(u,m));
 RETURN 'LINKED';
EXCEPTION WHEN lock_not_available THEN RETURN 'BUSY';
 WHEN integrity_constraint_violation THEN RETURN 'PENDING';
END $$;
CREATE FUNCTION public.link_future_existing_member_identity(p_user uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT identity_repair_private.link_future_existing_role(p_user)
$$;
CREATE FUNCTION identity_repair_private.complete_future_member_side() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m uuid; u uuid;
BEGIN
 IF TG_TABLE_NAME='user_roles' THEN
  IF NEW.user_id IS NOT NULL OR NEW.member_id IS NULL THEN RETURN NEW; END IF;
  m:=NEW.member_id;
 ELSE m:=NEW.id;
 END IF;
 SELECT a.id INTO u FROM auth.users a JOIN public.members b ON b.id=m
  WHERE lower(btrim(a.email))=lower(btrim(b.email)) ORDER BY a.id LIMIT 1;
 IF u IS NOT NULL THEN PERFORM identity_repair_private.link_future_existing_role(u); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER lms0723_identity_future_role AFTER INSERT OR UPDATE ON public.user_roles
 FOR EACH ROW EXECUTE FUNCTION identity_repair_private.complete_future_member_side();
CREATE TRIGGER lms0723_identity_future_member AFTER INSERT OR UPDATE OF email,is_active_member ON public.members
 FOR EACH ROW EXECUTE FUNCTION identity_repair_private.complete_future_member_side();
-- Exact new-object revokes defeat production defaults, without changing older ACLs.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA identity_repair_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.link_future_existing_member_identity(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.link_future_existing_member_identity(uuid) TO service_role;
COMMIT;
