-- Member Administration search: allow nonadjacent name tokens without changing member data.
begin;

do $migration$
declare
  function_oid oid := to_regprocedure('public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer,boolean)');
  function_source text;
  function_definition text;
  old_filter text := $old$       or concat_ws(' ', mb.first_name, mb.last_name, mb.last_name, mb.first_name,
                    mb.email, mb.phone, mb.club_location, mb.dupr_id, replace(mb.role, '_', ' '))
          ilike '%' || btrim(p_search) || '%'$old$;
  new_filter text := $new$       or concat_ws(' ', mb.first_name, mb.last_name, mb.last_name, mb.first_name,
                    mb.email, mb.phone, mb.club_location, mb.dupr_id, replace(mb.role, '_', ' '))
          ilike '%' || btrim(p_search) || '%'
       or not exists (
         select 1
         from regexp_split_to_table(btrim(p_search), '[[:space:]]+') as search_token(token)
         where position(lower(search_token.token) in lower(concat_ws(' ', mb.first_name, mb.last_name))) = 0
       )$new$;
begin
  if function_oid is null then
    raise exception 'member directory function missing';
  end if;

  select replace(p.prosrc, chr(13), '') into function_source
  from pg_proc p where p.oid = function_oid;

  if position(new_filter in function_source) > 0 then
    return;
  end if;
  if position(old_filter in function_source) = 0 then
    raise exception 'member directory search differs from reviewed definition';
  end if;

  function_definition := replace(pg_get_functiondef(function_oid), chr(13), '');
  function_definition := replace(function_definition, old_filter, new_filter);
  execute function_definition;
end
$migration$;

commit;
