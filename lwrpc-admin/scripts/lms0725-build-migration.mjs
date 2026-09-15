// Local artifact builder. No database connection. Destination created by Supabase CLI.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const normal=await readFile(new URL('../supabase/migrations/20260907131012_lms0723_server_session_validation.sql',import.meta.url),'utf8');
const view=await readFile(new URL('../supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql',import.meta.url),'utf8');
const definitions=[normal.match(/create or replace function ai_live_private\.lookup[\s\S]*?end \$\$;/)[0],view.match(/create or replace function view_as_private\.lookup[\s\S]*?end \$\$;/)[0]].map(s=>s.replaceAll('\r\n','\n'));
const md5=s=>createHash('md5').update(s).digest('hex');let out='-- LMS-0725 / 0.1.547. LOCAL REVIEW ONLY. No production apply authorized.\n-- Preserve signatures, owners, invoker security, ACLs, RLS and View-As locks.\nbegin;\n';
let rollback='-- LMS-0725 review-only rollback. Requires explicit release authorization.\nbegin;\n';
for(const definition of definitions){let next=definition;const replace=(a,b)=>{if(!next.includes(a))throw Error('Source shape mismatch: '+a);next=next.replace(a,b);};
 replace("  if v_rating not in ('season','primetime') or v_rating is null then return jsonb_build_object('status','rating_clarification','subject',v_target,'relationship',v_relation); end if;\n",'');
 const point="  if jsonb_array_length(v_choices)=0 then return jsonb_build_object('status','no_season','relationship',v_relation); end if;";
 replace(point,point+`
  if v_rating is null or v_rating='clarify' then
   select jsonb_agg(jsonb_build_object('season',s->>'season','rating',r.kind,'label',r.label||' — '||(s->>'label')) order by s->>'label',r.kind)
   into v_choices from jsonb_array_elements(v_choices) s cross join (values ('season','Season DUPR'),('primetime','PrimeTime Season DUPR')) r(kind,label);
   return jsonb_build_object('status','ambiguous','choiceKind','rating and season','subject',v_target,'choices',v_choices,'relationship',v_relation);
  end if;
  if v_rating not in ('season','primetime') then return jsonb_build_object('status','unsupported');end if;`);
 replace("'status','ambiguous','subject',v_target,'choices',v_choices,'relationship',v_relation", "'status','ambiguous','choiceKind','season','subject',v_target,'choices',v_choices,'relationship',v_relation");
 replace("'status','ambiguous','choices',case when jsonb_array_length(v_choices)>5", "'status','ambiguous','choiceKind','team','choices',case when jsonb_array_length(v_choices)>5");
 replace("  if v_intent='TEAM_ROSTER' then",`  if v_intent='TEAM_ROSTER' then
   if p_query->>'projection'='count' then
    select count(*) into v_count from public.team_members tm join public.members m on m.id=tm.member_id where tm.team_id=v_team and tm.is_active is true and m.is_active_member is true;
    v_result:=v_result||jsonb_build_object('count',v_count);
   else`);
 replace("  elsif v_intent='NEXT_MATCH' then","   end if;\n  elsif v_intent='NEXT_MATCH' then");
 const before=definition.split('as $$')[1].split('$$;')[0],after=next.split('as $$')[1].split('$$;')[0];
 const signature=definition.includes('view_as_private')?'view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)':'ai_live_private.lookup(uuid,uuid,jsonb)';
 rollback+=`do $guard$ begin
 if (select pg_catalog.md5(prosrc) from pg_catalog.pg_proc where oid='${signature}'::regprocedure)<>'${md5(after)}' then raise exception 'LMS-0725 rollback drift';end if;
 end $guard$;
${definition}
`;
 out+=`do $guard$ declare p pg_catalog.pg_proc;begin
 select * into p from pg_catalog.pg_proc where oid='${signature}'::regprocedure;
 if pg_catalog.md5(p.prosrc) not in ('${md5(before)}','${md5(before.replaceAll('\n','\r\n'))}','${md5(after)}') or p.proowner<>current_user::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'LMS-0725 lookup drift: ${signature}';end if;
 end $guard$;\n${next}\n`;
}
out+='commit;\n';await writeFile(new URL('../supabase/migrations/20260908114532_lms0725_clarification_choices.sql',import.meta.url),out);
await writeFile(new URL('../../docs/lms-0725-rollback.sql',import.meta.url),rollback+'commit;\n');
console.log('Built guarded local migration; no SQL executed.');
