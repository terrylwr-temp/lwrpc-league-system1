// Catalog checks for the approved private storage shape, independent of CREATE IF NOT EXISTS.
const tables={
 policy_bindings:[['season_id','uuid',true],['league_id','uuid',true],['division_id','uuid',true],['condition_code','text',true],['stage','text',true],['rules_version','text',true],['source_ref','text',true],['source_kind','text',true],['comparison','text',true],['parameters','jsonb',true],['config_hash','text',true],['status','text',true],['reviewed_at','timestamp with time zone',false],['reviewed_by','uuid',false]],
 operation_receipts:[['id','uuid',true],['actor_user_id','uuid',true],['request_id','uuid',true],['operation','text',true],['resource_id','uuid',true],['subject_id','uuid',false],['request_hash','text',true],['outcome','jsonb',true],['created_at','timestamp with time zone',true]],
 notification_outbox:[['id','uuid',true],['operation_id','uuid',true],['event_type','text',true],['channel','text',true],['recipient_key','text',true],['payload','jsonb',true],['payload_hash','text',true],['state','text',true],['first_attempt_at','timestamp with time zone',false],['claimed_at','timestamp with time zone',false],['attempts','integer',true],['provider_message_id','text',false],['error_code','text',false],['created_at','timestamp with time zone',true]],
};
export function tableShapeSql(){
 let sql='\n';
 for(const [name,columns] of Object.entries(tables)){
  const expected=JSON.stringify(columns).replaceAll("'","''");
  sql+=`do $shape$ declare actual jsonb;begin
 if not exists(select 1 from pg_catalog.pg_class where oid='lms_write_private.${name}'::regclass and relowner='postgres'::regrole and relrowsecurity and relkind='r') then raise exception 'LMS0726 table owner/RLS drift: ${name}';end if;
 select jsonb_agg(jsonb_build_array(a.attname,pg_catalog.format_type(a.atttypid,a.atttypmod),a.attnotnull) order by a.attnum) into actual from pg_catalog.pg_attribute a where a.attrelid='lms_write_private.${name}'::regclass and a.attnum>0 and not a.attisdropped;
 if actual is distinct from '${expected}'::jsonb then raise exception 'LMS0726 table shape drift: ${name}';end if;
end $shape$;\n`;
 }
 return sql;
}
