# LMS-0723 session validation redesign — diagnosis/design for review

**Session redesign implemented locally; STOP for review before corrective migration/deployment.** [Implementation, security evidence and revocation limitations](lms-0723-session-validation-implementation.md). LMS-0723 / 0.1.545 remains deployed and NOT production accepted; LMS-0722 remains the accepted baseline. Earlier design-only/local status entries are historical.

2026-09-07. **LMS-0723 / 0.1.545 is deployed, NOT production accepted.** Last accepted baseline: LMS-0722 / 0.1.544. This report proposes a correction; it does not authorize or represent implementation. No application, migration, grants, RLS, production data, deployment, model or embedding changes were made in this pass.

Recommendation: reuse the existing online Supabase `auth.getUser(accessToken)` authentication primitive, pass only its verified immutable user ID to the existing server-only live RPCs, and remove the custom database session reader. Preserve the existing capability router, database relationship checks, minimum projections, deterministic formatting and sanitized telemetry. A bounded corrective migration **is required**; an application-only change cannot remove the failing checks inside the deployed functions.

## 1. Exact failed architecture

Current path: browser bearer token → `authenticateLive` → anon-client `auth.getUser(token)` → verified `user.id` plus decoded `session_id` → server service-role RPC → `ai_live_private.lookup` → SECURITY DEFINER `session_valid` → `auth.sessions`.

The supported online authentication has already succeeded before the failing database check. The helper runs as `ai_live_session_reader`, which has SELECT on exactly `id`, `user_id`, `not_after`, but no auth-schema USAGE. Production reports SQLSTATE 42501, permission denied for schema auth. The executor cannot grant that schema privilege under the managed ownership boundary. Separately, sessions RLS is enabled with no policies; this non-owner, non-bypass role would still see no sessions if schema access were added. Narrower grants cannot repair that architecture.

The isolated database fixture lacked this managed ownership/RLS boundary. Its historical passing tests did not prove the production authentication design. See [accepted production evidence](lms-0723-auth-rls-boundary-stop.md). The original migration is already applied: local file `20260907110701_lms0723_live_intelligence.sql`, server recorder `20260907123652_lms0723_live_intelligence`. Do not replay it.

## 2. Supported authentication already in the application

`app/lib/serverSupabase.js::authorizeAdminRequest` and `app/lib/liveLmsService.js::authenticateLive` already call `auth.getUser(token)` using a non-persistent public-key client. Supabase documents this as an online Auth-server request whose returned identity can support authorization. Reuse this primitive; do not use browser `getSession()` or offline token decoding as server authentication. [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser).

Do **not** reuse the whole `authorizeAdminRequest` result for live authorization: that helper resolves roles through email and returns a full Auth user, token and member rows. Extract/reuse a small trusted-identity helper in the existing server auth module, leaving legacy email authorization outside the live branch unchanged. The provider necessarily returns a user object; immediately project its ID and discard unrelated fields. No administrative Auth-user lookup is necessary.

## 3. Proposed trusted boundary and request transport

`app/lib/auth.js` uses the browser Supabase client with implicit flow and default browser session persistence. `getRequestAuthorizationHeaders` obtains the current access token and attaches **Authorization: Bearer …** to fetch requests. These Ask LWR handlers authenticate that header, not an ambient cookie. Refresh tokens are not sent to these handlers. This is not currently an SSR cookie-auth design.

Require a single, bounded, syntactically valid Bearer header; call online `getUser` on every live answer, follow-up, feedback and live-review request. Require a valid non-anonymous returned user ID. After provider verification only, verify the same token's `sub` agrees with that ID and require a well-formed nonzero session UUID. This claim parsing is an additional consistency/receipt-binding check, never authentication. Discard the token and raw session ID after deriving an opaque session binding. Never accept these values from body fields.

Return only `{user:{id}, receiptBinding, authMs}` from identity validation. Construct/use the server database client after authentication, separately from the identity object. The token, email, Auth metadata and full user object must not enter capability resolution or formatting.

There is no explicit origin/CSRF token check in the inspected live handlers, nor a permissive CORS configuration in `next.config.ts`. With bearer-only auth, cross-site forms cannot attach the required token; Authorization/JSON fetch requests require browser CORS permission. Do not claim that this is an explicit origin allowlist or protection against XSS. Preserve same-origin browser requests, no credentialed wildcard CORS, no token in query strings, no cookie-only fallback. A narrow present-Origin mismatch rejection may be added to live routes using the configured canonical application origin; missing Origin on legitimate authenticated non-browser requests must not become authentication. Test preflight/foreign-Origin rejection. A cookie-auth migration would require a separate CSRF design and is outside this correction.

Use `private, no-store` on all live successes and failures. Map invalid/missing authentication to sanitized 401; map Auth transport/service failure to sanitized 503, with no lookup or RAG fallback. Currently player live-auth exceptions become generic 500, live feedback 400 and review 403; correct those narrow mappings. Never log provider error objects, JWT claims, headers or request bodies.

### Session expiration and revocation: explicit limits

The inspected current upstream Auth middleware verifies JWTs, loads the user and loads a nonempty session ID; a missing session is rejected. This supports using online validation for deleted/sign-out sessions. It is source evidence, **not proof of the deployed hosted Auth revision**. [Supabase Auth authentication middleware](https://github.com/supabase/auth/blob/master/internal/api/auth.go).

Do not equate this with immediate enforcement of all time-box/inactivity settings. Supabase documents that these settings are enforced on refresh and can have a JWT-lifetime delay; expired session records can remain temporarily. The inspected online user path does not establish the old helper's exact `not_after > now()` guarantee. [Supabase session lifecycle](https://supabase.com/docs/guides/auth/sessions). Supabase also warns that already issued access JWTs are not generally revoked before expiration. [Supabase signOut](https://supabase.com/docs/reference/javascript/auth-signout).

Design contract: every request must pass current online Auth validation, JWT expiry and current LMS authorization. No cached success or receipt authenticates a request. Before production approval, validate deleted/revoked-session behavior against supported Auth in an isolated environment matching the hosted version, and inspect relevant configured lifetime settings without exposing secrets. If the owner requires stricter immediate time-box enforcement than the supported boundary provides, or revoked-session tests fail, **stop for further design review**. Do not silently weaken the requirement, read auth.sessions through another privileged route, force-refresh browser tokens on the server, or introduce a custom revocation store. A revocation that occurs after authentication during an already running bounded request is also not an atomic cross-service revocation guarantee.

## 4. Server-to-database identity binding

The server calls `ai_live_lookup(p_actor, p_request, p_query)`, where p_actor comes exclusively from the trusted Auth result, p_request is server-generated, and p_query is constructed from the allowlisted deterministic intent/validated encrypted context. It never spreads browser JSON into RPC arguments. Browser actor/member/role/team/population fields are rejected or ignored and cannot override trusted fields.

Database identity remains `user_roles.user_id → member_id → active members`. Read-only production catalog checks in this pass confirmed UNIQUE(user_id), the member foreign key and the Auth-user foreign key. Missing bindings deny; email does not repair a missing binding. Current database role and relationship checks remain authoritative even if the client UI has a stale or email-derived role.

This binding trusts the server process and its service credential. It is not a cryptographic assertion the database can independently attribute to the browser. A compromised service credential could impersonate an actor; do not claim otherwise. Its safety comes from an authenticated, tightly bounded server entry point plus independent database authorization for the supplied actor, and from keeping that credential out of the browser.

## 5. Direct-RPC exposure

Read-only production `has_function_privilege` checks confirmed anon=false, authenticated=false, service_role=true for all three public live RPCs and the private lookup. They are already server-only. Keep that state for the new signatures, explicitly revoking PUBLIC/anon/authenticated/service_role defaults before regranting only service EXECUTE. No new authenticated overload or generic query RPC.

Normal signed-in users cannot call these functions with another actor ID because they lack EXECUTE, irrespective of p_actor. Validate through actual role execution and isolated Data API requests, not GRANT-text inspection alone. Private schema USAGE remains denied to browser roles. Remove old signatures in the correction transaction so there is no bypass/ambiguous PostgREST overload. Existing direct-table permissions outside these functions are not newly secured by this change; preserve them and do not claim system-wide browser-table isolation.

## 6. RLS and roles

Keep live lookup/feedback/review SECURITY INVOKER with empty search_path and fully qualified relations. The invoker is service_role, whose existing RLS bypass means **application-table policies are not the enforcement mechanism for these calls**. This was already true for live lookup; the redesign removes its custom Auth check, not application RLS. Table privileges still apply, and the function's explicit active-member, role, team, roster, season, target-population and final relationship checks enforce live authorization.

Preserve locks/rechecks so removal committed before the operation is observed; a concurrent removal can wait for an already-authorized transaction. Do not claim a mid-transaction removal retroactively cancels an answer. Preserve rate limits, audit-before-contact-response failure behavior, append-only restrictions and fixed retention functions. Auth schema ownership, policies and defaults remain untouched. No new BYPASSRLS role or SECURITY DEFINER live lookup.

## 7. Fate of ai_live_session_reader

Remove it after removing every function reference. Production dependency inspection found only: ownership of `session_valid`, USAGE ACL on ai_live_private, and three auth.sessions column ACLs. No other owned object was reported. Cleanup is DROP helper (RESTRICT), revoke those three column grants, revoke private-schema privileges, then DROP ROLE (which removes its role memberships). No broad DROP OWNED, CASCADE, Auth ownership changes or PUBLIC helper revokes. If dependencies or grantor permissions differ at implementation preflight, stop; leaving an inert role pending authorized cleanup is safer than broadening privileges. `ai_live_retention` is unrelated and remains unchanged.

## 8. Corrective migration requirement

Required outcome is B+C: bounded live-function signature/body/ACL correction and obsolete reader cleanup. Appendix A contains the complete proposed SQL in a **documentation-only review block**, derived from the applied migration. No executable migration file has been created or run.

The only table adjustment proposed is making private `access_audit.session_id` nullable and omitting it from all future inserts. This preserves historical audit rows without retaining new raw session IDs; it does not change Stage 7 schemas or projections. The legacy column can be removed in a separately reviewed retention cleanup later. No backfill, history deletion, new auth store or legacy LMS ACL change. Actor/target audit IDs remain in the approved private security audit, never general Stage 7 reporting.

The new signatures remove p_session entirely. Lookup retains its identity/relationship/field-selection body; its initial guard becomes p_actor-not-null. Feedback/review retain active-user/manager checks. The wrapper denial audit uses nonnull trusted actor instead of session_valid. The old session function and role are removed only after their callers. Deployment must coordinate this signature change; old app live calls will fail safely until the corrected app is active. Use the approved controlled window, not an unguarded compatibility overload.

## 9. Application and documentation changes after approval

| File under lwrpc-admin | Proposed bounded change |
|---|---|
| app/lib/serverSupabase.js | Small reusable online trusted-user helper; avoid adopting email authorization in live routes |
| app/lib/liveLmsService.js | Reuse auth helper; project identity; remove p_session RPC arguments; preserve router/allowlist/projections |
| app/lib/liveLmsReceipts.js | Opaque session binding instead of raw session ID; preserve purpose/user/session isolation and expiry |
| app/api/ask-lwr/route.js | Sanitized live auth failure mapping/no-store; preserve document branch |
| app/api/ask-lwr/feedback/route.js | Same narrow authentication mapping for live receipts; legacy feedback unchanged |
| app/api/ai-assistant/answer/route.js | Live branch authenticates by user ID before legacy email role helper; DB manager_test role gate remains mandatory; legacy document branch stays gated as before |
| app/api/ai-assistant/live-review/route.js | Remove session argument; fresh auth and database manager gate; sanitized status handling |
| test/liveLms.test.mjs, test/liveLmsDatabase.test.mjs | Auth boundary/receipt/role/capability tests and production-like ACL/RLS fixture |
| new corrective supabase/migrations file | Reviewed Appendix A scope only; never edit/reapply deployed migration |

Inspect manager retrieval-only endpoint for preservation of its existing protected-live behavior; it must not gain a model/embedding path for these capabilities. No player UI redesign, corpus/RAG changes, new phase, version change or whole-application auth refactor. Update architecture, implementation, acceptance and roadmap documentation after validation.

## 10. Six-capability compatibility

| Capability | Preserved authorization and output |
|---|---|
| SELF_RATING | Verified requester's bound member; selected current Season/PrimeTime rating only; season ambiguity clarifies, absent value stays missing |
| PLAYER_RATING | Resolve within approved manager or explicitly managed-roster population before selecting target rating; no unrelated-player lookup |
| PLAYER_CONTACT | Email only; Captain/Co-Captain permissions limited to explicitly managed rosters, approved team-Pro/manager rules unchanged; mandatory audit before disclosure |
| SELF_TEAM / team identity | Active authorized team/division/league/season labels; multiple eligible teams clarify |
| TEAM_ROSTER | Authorized team only; names in bounded 25-player pages; no email/rating expansion |
| NEXT_MATCH | Authorized team, next published qualifying match; date/time/opponent/location only; no-match/ambiguity truthful |

Preserve exact current role/population distinctions; no location-only Pro expansion. Tests must assert absence of unrelated protected columns, not merely correct display. All six stay deterministic: **answer-model calls=0; embedding calls=0**.

## 11. Subject, receipt and replay preservation

SELF, EXPLICIT_PERSON, FOLLOWUP_REFERENT and NONE remain separate. Failed explicit name resolution returns denied/not-found/clarification, never requester values. Authorize candidate population before name resolution; reauthorize selected targets on every follow-up. Browser choice indices select only encrypted server-issued choices, never free-standing subject/team IDs.

Keep five-minute context and one-day feedback expiry, purpose binding and user binding. Derive a domain-separated keyed HMAC of verified user ID + verified session UUID using the existing server receipt secret; use that opaque value only inside encrypted receipts and ephemeral principal state. Do not change the Stage 7 grouping HMAC or introduce new configuration. Do not store this binding in logs/telemetry/database. Token refresh within one session should preserve context; a different session for the same user must not. Old receipts lacking the new binding expire safely with a re-ask message; do not treat them as authenticated or fall back to SELF.

A repeated valid read request may run again under current authorization and rate limits; this is not a new exactly-once lookup contract. Stale/forged/cross-user/cross-session receipts fail. Repeated identical feedback remains idempotent, and changed feedback remains append-only. Fresh authentication and current role/relationship checks apply even to unexpired feedback/context receipts. Browser sign-out clears local access; replay of a captured pre-sign-out token must also pass the provider revocation gate described above.

## 12. Stage 7 and privacy

Preserve metadata-only LIVE_LMS_DATA outcomes: capability, result code, relationship category, origin, version, bounded timing, zero model/embedding usage. No raw question, name, email, linked rating, roster, match, subject reference, token, session ID, receipt, authorization header or Auth error object. Live answers do not enter official-document answer/evidence snapshots or unanswered groups.

Authentication failures may produce a fixed sanitized log category/status and duration; no privileged database client or Stage 7 write is required before authentication. Do not add a new outcome enum merely to log them. Preserve private feedback and current-vote aggregation, manager_test separation, capture fail-open, retention and security-audit failure behavior. A failed Auth or lookup never falls through to document RAG. Keep private security audit identifiers separate from manager quality telemetry; future inserts omit raw session IDs.

## 13. Required security test matrix

These are planned checks, not results from this diagnosis.

| Test | Required observation |
|---|---|
| Valid signed-in user | Online auth; exact returned ID supplies RPC actor; correct deterministic result |
| Signed out/missing bearer; malformed header/JWT; forged signature; expired JWT | 401; zero live RPC/model/embedding calls; sanitized output |
| Wrong project/audience/sub mismatch, anonymous/no session UUID | Denied; no accepted identity inferred from decoding |
| Revoked/deleted session with otherwise unexpired token | Supported Auth rejects; test real Auth service, not only mocked getUser |
| Time-box/inactivity boundary | Document actual configured semantics and latency; stop if stricter requirement is unmet |
| Auth unavailable/timeout | Bounded 503; no privileged lookup, stale cached identity, or RAG fallback |
| Forged actor/role/member/team/population in request | Cannot change RPC actor or authorized population |
| Direct anon/authenticated RPC, old overload, private helper | Effective operation denied; no returned live fields |
| Missing/inactive user-ID binding; same-email other member | Denied; no email/role fallback |
| Role removed between requests | Follow-up and feedback reauthorize; no stale role grants access |
| Captain/Co-Captain assignment or target roster membership removed | Next request denied/not-found before protected projection |
| Allowed named person | Only authorized target projection, proper audit |
| Unauthorized/missing/ambiguous named person | Never self; no unauthorized candidate names or values |
| Forged subject/choice/team receipt; cross-user and same-user different-session replay | Rejected; no read authorized by receipt alone |
| Same-session refresh; expired receipt; independent document question | Refresh preserves binding; expiry re-asks; independent document question clears live context |
| Six capabilities, paging, season ambiguity, missing values, rate limits | Existing positive/negative behavior preserved; no fabricated facts |
| Manager test/review as player/captain vs authorized manager | Database role gate denies lower role; live authorization independent of legacy email gate |
| Email audit failure; quality capture failure | Contact response fails safely on required audit failure; quality failure does not break authorized answer |
| Feedback identical/changed concurrent requests | Existing idempotency/append-only behavior and provenance preserved |
| Foreign Origin, cookie-only request, CORS preflight | No unauthorized live operation; no credentialed wildcard exposure |
| Privacy/output/logger snapshots and model spies | Zero protected telemetry fields and model/embedding calls |
| Production-like auth owner/RLS with zero app Auth grants | Live SQL works without touching auth.sessions; no new policy/grant |
| Default PUBLIC grants, migration replay and effective ACLs | New/old function exposure as designed; no legacy privilege drift |
| Retention and immutable audit/feedback protections | Existing permitted operations pass; prohibited UPDATE/DELETE fail |

Run full `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run verify:ai-pdf-server-bundle`, `npm run build`, isolated clean production build, and `git diff --check` after implementation. Distinguish the known post-compilation cache lock from compilation failure. Preserve the historical 633-test suite and expand it; no tests were rerun or claimed passed during this documentation pass.

## 14. Exact future production continuation

1. Owner reviews this design, including supported session-lifetime semantics and private audit session-column treatment. Stop here now.
2. After approval, implement only the bounded correction; review local Next.js guidance, run full isolated Auth/database/security and regression validation. No new version.
3. Read-only production preflight: correct project/deployment, original migration already present, function definitions/dependencies/ACLs unchanged, no unexpected objects. Confirm supported Auth behavior/configuration gate; never expose tokens or sign out the owner's session merely to test revocation.
4. Apply a separately reviewed corrective migration once in a controlled window. Verify new signatures, old-signature absence, helper/reader cleanup, effective browser denial, service permissions and unchanged legacy RLS/ACLs. No original migration replay, corpus processing, document activation or data fixtures in production.
5. Deploy corrected LMS-0723 / 0.1.545 through the normal pipeline only after database/security gates pass. Confirm alias/commit. If any unexpected security/object/capture behavior occurs, stop; no improvisational broad grant or automatic rollback.
6. **First production question: `What is my Season DUPR?`** Require authenticated ID → SELF_RATING → current bound authorization → minimum projection → deterministic LIVE LMS DATA response → sanitized capture → zero model/embedding calls. A truthful missing value or necessary season clarification is valid when real data requires it; a technical_error is not. Do not invent a numeric rating. If this fails, stop.
7. Resume remaining testable live, manager-origin, feedback, audit, no-store/privacy, logs/latency, ordinary document regression and integrity gates from the existing acceptance report. Do not repeat unrelated passed gates unnecessarily. Check actual outcomes, not only UI labels.
8. Preserve seasonal limitations: no legitimate roster memberships or matches currently exist. Do not manufacture them. Use isolated positive authorization evidence; perform deferred real Captain/Co-Captain and match verification when legitimate relationships appear near the end of September. These limitations do not excuse authentication/security failure.
9. Report each gate's pass/fail/deferred evidence and whether LMS-0723 can be production accepted. Until then it remains deployed and unaccepted, LMS-0722 remains the accepted baseline, and no next phase/version starts.

## Appendix A — exact proposed SQL, review only

The following appendix is a proposed corrective transaction, not an applied migration. It preserves the existing lookup body except the explicitly identified session arguments/checks/audit writes. It must undergo the isolated tests and dependency/grantor preflight above before becoming a migration. The reader cleanup uses no CASCADE and must fail rather than remove an unexpected dependency. No auth-schema USAGE grant/revoke is needed because that grant is absent in the verified state.

```sql
begin;

-- Keep existing history; future function inserts omit session_id.

alter table ai_live_private.access_audit alter column session_id drop not null;

drop function if exists public.ai_live_lookup(uuid,uuid,uuid,jsonb) restrict;

drop function if exists public.ai_live_feedback(uuid,uuid,uuid,boolean,jsonb) restrict;

drop function if exists public.ai_live_review(uuid,uuid) restrict;

drop function if exists ai_live_private.lookup(uuid,uuid,uuid,jsonb) restrict;

create or replace function ai_live_private.lookup(p_actor uuid,p_request uuid,p_query jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_member uuid; v_role text; v_intent text:=p_query->>'intent'; v_target uuid; v_team uuid;
 v_season uuid; v_name text; v_label text; v_rating text:=p_query->>'rating'; v_value text;
 v_teams uuid[]; v_population uuid[]; v_choices jsonb; v_context record; v_match record;
 v_count int; v_choice_offset int:=coalesce((p_query->>'choiceOffset')::int,0); v_offset int:=coalesce((p_query->>'offset')::int,0); v_relation text; v_tz text;
 v_person_lookup boolean; v_subject_kind text:=p_query->>'subjectKind';
 v_result jsonb; v_query_started timestamptz; v_start timestamptz:=clock_timestamp();
begin
 if p_actor is null then return jsonb_build_object('status','denied'); end if;
 select u.member_id,u.role into v_member,v_role from public.user_roles u join public.members m on m.id=u.member_id
 where u.user_id=p_actor and m.is_active_member is true and u.role in ('player','captain','club_pro','league_manager','commissioner') for share of u,m;
 if p_query->>'origin'='manager_test' and v_role not in ('league_manager','commissioner') then return jsonb_build_object('status','denied'); end if;
 if v_member is null then return jsonb_build_object('status','denied'); end if;
 if v_intent not in ('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') then return jsonb_build_object('status','unsupported'); end if;
 if v_choice_offset<0 or v_choice_offset>5000 or v_offset<0 or v_offset>5000 or octet_length(p_query::text)>4096 then return jsonb_build_object('status','unsupported'); end if;
 -- Subject classification is server-generated. Explicit/referential requests
 -- cannot recover by defaulting to the requester when identity is absent.
 if v_subject_kind is not null and v_subject_kind not in ('SELF','EXPLICIT_PERSON','FOLLOWUP_REFERENT','NONE') then return jsonb_build_object('status','unsupported'); end if;
 if p_query?'subject' and coalesce(p_query->>'subject','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return jsonb_build_object('status','denied'); end if;
 if (v_subject_kind='EXPLICIT_PERSON' and not(p_query?'name' or p_query?'subject'))
 or (v_subject_kind='FOLLOWUP_REFERENT' and not(p_query?'subject'))
 or (p_query?'name' and p_query?'subject')
 or ((v_subject_kind='SELF' or p_query->>'self'='true' or v_intent='SELF_RATING') and (p_query?'name' or (p_query?'subject' and (p_query->>'subject')::uuid<>v_member)))
 or (v_intent='SELF_RATING' and v_subject_kind in ('EXPLICIT_PERSON','FOLLOWUP_REFERENT')) then return jsonb_build_object('status','denied'); end if;
 v_person_lookup:=v_intent in ('PLAYER_RATING','PLAYER_CONTACT') or p_query?'name'
   or v_subject_kind in ('EXPLICIT_PERSON','FOLLOWUP_REFERENT')
   or (p_query?'subject' and (p_query->>'subject')::uuid is distinct from v_member);
 -- Serialize budgets and feedback independently of hosting instances.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,723));
 if (select count(*) from ai_live_private.attempts where actor=p_actor and at>v_start-interval '1 minute')>=10
 or (select count(*) from ai_live_private.attempts where actor=p_actor and at>v_start-interval '1 day')>=100
 or (v_intent='PLAYER_CONTACT' and ((select count(*) from ai_live_private.attempts where actor=p_actor and contact and at>v_start-interval '1 minute')>=5
 or (select count(*) from ai_live_private.attempts where actor=p_actor and contact and at>v_start-interval '1 day')>=30)) then return jsonb_build_object('status','rate_limited'); end if;
 insert into ai_live_private.attempts(actor,contact) values(p_actor,v_intent='PLAYER_CONTACT');
 -- Active state comes from LMS flags, not today's date or browser claims.
 select coalesce(array_agg(t.id),'{}'::uuid[]) into v_teams from public.teams t
 join public.divisions d on d.id=t.division_id and d.is_active is true
 join public.leagues l on l.id=d.league_id and l.is_active is true
 join public.seasons s on s.id=l.season_id and s.is_active is true
 where t.is_active is true and (v_role in ('league_manager','commissioner')
 or (v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id))
 or (v_intent in ('SELF_TEAM','TEAM_ROSTER','NEXT_MATCH') and exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.member_id=v_member and tm.is_active is true)));
 if p_query?'teamName' then select coalesce(array_agg(t.id),'{}'::uuid[]) into v_teams from public.teams t where t.id=any(v_teams) and lower(trim(t.name))=lower(trim(p_query->>'teamName')); end if;
 v_relation:=case when v_role in ('league_manager','commissioner') then 'manager' when v_intent='SELF_RATING' then 'self' else 'team' end;
 if v_person_lookup then
  if v_role='player' then return jsonb_build_object('status','denied'); end if;
  -- Only IDs/names are available during resolution. No contact/rating lookup yet.
  select coalesce(array_agg(m.id),'{}'::uuid[]) into v_population from public.members m
  where m.is_active_member is true and (v_role in ('league_manager','commissioner') or exists(
   select 1 from public.team_members tm join public.teams t on t.id=tm.team_id
   where tm.member_id=m.id and tm.is_active is true and tm.team_id=any(v_teams)
   and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)));
  if p_query?'subject' then v_target:=(p_query->>'subject')::uuid;
   if not(v_target=any(v_population)) then return jsonb_build_object('status','not_found'); end if;
  else
   v_name:=lower(regexp_replace(trim(p_query->>'name'),'\s+',' ','g'));
   if v_name is null or length(v_name)<3 or v_name ~ '[%_@]' then return jsonb_build_object('status','not_found'); end if;
   select count(*),min(m.id::text)::uuid into v_count,v_target from public.members m where m.id=any(v_population) and lower(trim(m.first_name||' '||m.last_name))=v_name;
   if v_count<>1 then
    select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (
     select m.id as subject,trim(m.first_name||' '||m.last_name) as label from public.members m where m.id=any(v_population)
     and lower(trim(m.first_name||' '||m.last_name)) like '%'||v_name||'%' order by m.first_name,m.last_name,m.id limit 5
    ) x;
    if jsonb_array_length(v_choices)=0 then return jsonb_build_object('status','not_found'); end if;
    if (select count(distinct x->>'label') from jsonb_array_elements(v_choices) x)<jsonb_array_length(v_choices) then return jsonb_build_object('status','ambiguous','choices','[]'::jsonb,'relationship',v_relation); end if;
    return jsonb_build_object('status','ambiguous','choices',v_choices,'relationship',v_relation);
   end if;
  end if;
 else v_target:=v_member; v_relation:=case when v_intent='SELF_RATING' or v_role='player' then 'self' else v_relation end;
 end if;
 -- Lock and recheck the resolved subject and the granting relationships before
 -- the field query. Removal during name resolution cannot leave a stale grant.
 perform 1 from public.members where id=v_target and is_active_member is true for share;
 if not found then return jsonb_build_object('status','not_found'); end if;
 if v_target<>v_member and v_role not in ('league_manager','commissioner') then
  perform 1 from public.team_members tm join public.teams t on t.id=tm.team_id
   join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
   where tm.member_id=v_target and tm.is_active is true and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true
   and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)
   for share of tm,t,d,l,s;
  if not found then return jsonb_build_object('status','not_found'); end if;
 end if;
 if v_intent in ('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT') then select trim(first_name||' '||last_name) into v_label from public.members where id=v_target; end if;
 v_query_started:=clock_timestamp();
 if v_intent='PLAYER_CONTACT' then
  select email into v_value from public.members where id=v_target and id=any(v_population) and is_active_member is true;
  -- Audit insert failure rolls back and prevents email disclosure.
  insert into ai_live_private.access_audit(actor,target,request_id,intent,decision) values(p_actor,v_target,p_request,v_intent,case when nullif(v_value,'') is null then 'missing' else 'success' end);
  return jsonb_build_object('status',case when nullif(v_value,'') is null then 'missing' else 'success' end,'intent',v_intent,'label',v_label,'value',v_value,'subject',v_target,'relationship',v_relation,'resolutionMs',extract(epoch from(v_query_started-v_start))*1000,'queryMs',extract(epoch from(clock_timestamp()-v_query_started))*1000);
 end if;
 if v_intent in ('SELF_RATING','PLAYER_RATING') then
  if v_rating not in ('season','primetime') or v_rating is null then return jsonb_build_object('status','rating_clarification','subject',v_target,'relationship',v_relation); end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (select s.id as season,s.name as label from public.seasons s where s.is_active is true
   and (v_intent='SELF_RATING' or v_role in ('league_manager','commissioner') or exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id where tm.member_id=v_target and tm.is_active is true and t.id=any(v_teams) and l.season_id=s.id)) order by s.name,s.id limit 5) x;
  if jsonb_array_length(v_choices)=0 then return jsonb_build_object('status','no_season','relationship',v_relation); end if;
  if p_query?'season' then v_season:=(p_query->>'season')::uuid;
   if not exists(select 1 from jsonb_array_elements(v_choices) x where (x->>'season')::uuid=v_season) then return jsonb_build_object('status','denied'); end if;
  elsif jsonb_array_length(v_choices)>1 then return jsonb_build_object('status','ambiguous','subject',v_target,'choices',v_choices,'relationship',v_relation);
  else v_season:=(v_choices->0->>'season')::uuid; end if;
  perform 1 from public.seasons where id=v_season and is_active is true for share;
  if not found then return jsonb_build_object('status','no_season','relationship',v_relation); end if;
  -- Separate branches enforce field projection; never select a rating row wholesale.
  if v_rating='primetime' then select season_primetime_rating::text into v_value from public.member_season_ratings where member_id=v_target and season_id=v_season;
  else select season_dupr_rating::text into v_value from public.member_season_ratings where member_id=v_target and season_id=v_season; end if;
  v_result:=jsonb_build_object('status',case when v_value is null then 'missing' else 'success' end,'intent',v_intent,'label',v_label,'value',v_value,'rating',v_rating,'season',(select name from public.seasons where id=v_season),'subject',v_target,'seasonRef',v_season,'relationship',v_relation);
 else
  if v_person_lookup then select coalesce(array_agg(t),'{}'::uuid[]) into v_teams from unnest(v_teams) t where exists(select 1 from public.team_members tm where tm.team_id=t and tm.member_id=v_target and tm.is_active is true); end if;
  if p_query->>'self'='true' and v_intent='SELF_TEAM' then select coalesce(array_agg(t),'{}'::uuid[]) into v_teams from unnest(v_teams) t where exists(select 1 from public.team_members tm where tm.team_id=t and tm.member_id=v_member and tm.is_active is true) or exists(select 1 from public.teams z where z.id=t and v_member in(z.captain_member_id,z.co_captain_member_id,z.co_captain_2_member_id,z.club_pro_member_id)); end if;
  if cardinality(v_teams)=0 then return jsonb_build_object('status','no_team','relationship',v_relation); end if;
  if p_query?'team' then v_team:=(p_query->>'team')::uuid;
   if not(v_team=any(v_teams)) then return jsonb_build_object('status','denied'); end if;
  elsif cardinality(v_teams)>1 then
   select jsonb_agg(x) into v_choices from (select t.id as team,t.name||' — '||d.name||', '||l.name||', '||s.name as label from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id where t.id=any(v_teams) order by t.name,t.id offset v_choice_offset limit 6) x;
   return jsonb_build_object('status','ambiguous','choices',case when jsonb_array_length(v_choices)>5 then v_choices-5 else coalesce(v_choices,'[]'::jsonb) end,'moreChoices',jsonb_array_length(v_choices)>5,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation);
  else v_team:=v_teams[1]; end if;
  select t.name as team,d.name as division,l.name as league,s.name as season into v_context from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id
   where t.id=v_team and t.is_active is true and d.is_active is true and l.is_active is true and s.is_active is true
   and (v_role in ('league_manager','commissioner') or (v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id))
   or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.member_id=v_member and tm.is_active is true)) for share of t,d,l,s;
  if not found then return jsonb_build_object('status','denied'); end if;
  perform 1 from public.team_members where team_id=v_team and member_id=v_member and is_active is true for share;
  if not found and v_role not in ('league_manager','commissioner') and not exists(select 1 from public.teams t where t.id=v_team and v_role in ('captain','club_pro') and v_member in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)) then return jsonb_build_object('status','denied'); end if;
  if v_person_lookup then
   perform 1 from public.team_members where team_id=v_team and member_id=v_target and is_active is true for share;
   if not found then return jsonb_build_object('status','not_found'); end if;
  end if;
  v_result:=to_jsonb(v_context)||jsonb_build_object('status','success','intent',v_intent,'teamRef',v_team,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation);
  if v_intent='TEAM_ROSTER' then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into v_choices from (select trim(m.first_name||' '||m.last_name) as label from public.team_members tm join public.members m on m.id=tm.member_id where tm.team_id=v_team and tm.is_active is true and m.is_active_member is true order by m.last_name,m.first_name,m.id offset v_offset limit 26) x;
   v_result:=v_result||jsonb_build_object('players',case when jsonb_array_length(v_choices)>25 then v_choices-25 else v_choices end,'more',jsonb_array_length(v_choices)>25,'offset',v_offset);
  elsif v_intent='NEXT_MATCH' then
   select coalesce((select setting_value from public.system_settings where setting_key='timezone'),'America/New_York') into v_tz;
   select m.scheduled_date as date,m.scheduled_time as time,opp.name as opponent,loc.name as location into v_match from public.matches m
   join public.teams opp on opp.id=case when m.home_team_id=v_team then m.away_team_id else m.home_team_id end
   left join public.locations loc on loc.id=m.location_id
   where v_team in(m.home_team_id,m.away_team_id) and m.is_published is true and lower(coalesce(m.status,'')) not in('completed','cancelled','canceled','bye')
   and m.scheduled_date is not null and (m.scheduled_date+coalesce(m.scheduled_time,time '23:59:59')) at time zone v_tz>=v_start
   order by m.scheduled_date,m.scheduled_time nulls last,m.id limit 1;
   if not found then return jsonb_build_object('status','no_match','teamRef',v_team,'subject',case when v_person_lookup then v_target else null end,'relationship',v_relation); end if;
   select count(*) into v_count from public.matches m where v_team in(m.home_team_id,m.away_team_id) and m.is_published is true and lower(coalesce(m.status,'')) not in('completed','cancelled','canceled','bye') and m.scheduled_date=v_match.date and m.scheduled_time is not distinct from v_match.time;
   if v_count>1 then return jsonb_build_object('status','ambiguous','choices','[]'::jsonb,'relationship',v_relation); end if;
   v_result:=v_result||to_jsonb(v_match)||jsonb_build_object('timezone',v_tz);
  end if;
 end if;
 if v_intent='PLAYER_RATING' or v_target<>v_member then
  insert into ai_live_private.access_audit(actor,target,request_id,intent,decision) values(p_actor,v_target,p_request,v_intent,v_result->>'status');
 end if;
 return v_result||jsonb_build_object('resolutionMs',extract(epoch from(v_query_started-v_start))*1000,'queryMs',extract(epoch from(clock_timestamp()-v_query_started))*1000);
end $$;

create or replace function public.ai_live_lookup(p_actor uuid,p_request uuid,p_query jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 result:=ai_live_private.lookup(p_actor,p_request,p_query);
 if result->>'status' in ('denied','not_found','rate_limited') and p_query->>'intent' in ('PLAYER_CONTACT','PLAYER_RATING','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH')
 and p_actor is not null then
  insert into ai_live_private.access_audit(actor,request_id,intent,decision) values(p_actor,p_request,p_query->>'intent',result->>'status');
 end if;
 return result;
end $$;

create or replace function public.ai_live_feedback(p_actor uuid,p_answer uuid,p_helpful boolean,p_metadata jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior ai_live_private.feedback; v_id uuid;
begin
 if p_actor is null or not exists(select 1 from public.user_roles u join public.members m on m.id=u.member_id where u.user_id=p_actor and m.is_active_member is true) then raise exception 'live authorization'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_answer::text,724));
 select * into prior from ai_live_private.feedback where answer_id=p_answer and actor=p_actor order by at desc,id desc limit 1;
 if prior.helpful is not distinct from p_helpful and prior.id is not null then return jsonb_build_object('changed',false,'helpful',prior.helpful,'feedbackId',prior.id); end if;
 insert into ai_live_private.feedback(answer_id,actor,intent,result_code,relationship,origin,helpful,assistant_version)
 values(p_answer,p_actor,p_metadata->>'intent',p_metadata->>'status',p_metadata->>'relationship',p_metadata->>'origin',p_helpful,'LMS-0723') returning id into v_id;
 return jsonb_build_object('changed',true,'helpful',p_helpful,'feedbackId',v_id);
end $$;

create or replace function public.ai_live_review(p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or not exists(select 1 from public.user_roles u join public.members m on m.id=u.member_id where u.user_id=p_actor and m.is_active_member is true and u.role in('league_manager','commissioner')) then raise exception 'live authorization'; end if;
 -- Group by metadata namespace, never a name/question/target. Current vote per
 -- answer drives counts. Manager tests remain explicitly separated.
 select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (
  select intent,result_code,relationship,origin,assistant_version,count(*) as answers,
   count(*) filter(where helpful) as helpful,count(*) filter(where not helpful) as not_helpful,max(at) as latest_at
  from (select distinct on(answer_id) answer_id,intent,result_code,relationship,origin,assistant_version,helpful,at from ai_live_private.feedback where at>statement_timestamp()-interval '90 days' order by answer_id,at desc,id desc) votes
  group by intent,result_code,relationship,origin,assistant_version order by max(at) desc limit 50
 ) x;
 return jsonb_build_object('groups',result);
end $$;

revoke all on function ai_live_private.lookup(uuid,uuid,jsonb) from public, anon, authenticated, service_role;

revoke all on function public.ai_live_lookup(uuid,uuid,jsonb) from public, anon, authenticated, service_role;

revoke all on function public.ai_live_feedback(uuid,uuid,boolean,jsonb) from public, anon, authenticated, service_role;

revoke all on function public.ai_live_review(uuid) from public, anon, authenticated, service_role;

grant execute on function ai_live_private.lookup(uuid,uuid,jsonb) to service_role;

grant execute on function public.ai_live_lookup(uuid,uuid,jsonb) to service_role;

grant execute on function public.ai_live_feedback(uuid,uuid,boolean,jsonb) to service_role;

grant execute on function public.ai_live_review(uuid) to service_role;

drop function if exists ai_live_private.session_valid(uuid,uuid) restrict;

do $cleanup$
begin
 if exists(select 1 from pg_roles where rolname='ai_live_session_reader') then
  revoke select(id,user_id,not_after) on auth.sessions from ai_live_session_reader;
  revoke all on schema ai_live_private from ai_live_session_reader;
  drop role ai_live_session_reader;
 end if;
end $cleanup$;

commit;
```

Replay must produce the same signatures and effective grants; the cleanup block skips an already absent reader. A changed production function body or additional dependency invalidates this exact draft and requires renewed review. PostgREST schema-cache refresh should follow the established deployment mechanism after commit; verify new signature availability before routing live traffic.
