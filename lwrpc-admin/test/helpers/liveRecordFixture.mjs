import {readFile} from 'node:fs/promises';
import {implicitPlayerFixture,readMigration,migrationName,id} from './implicitPlayerFixture.mjs';
export {id};
export const recordMigration='20260909212951_lms0729_live_identity_team_record.sql';
export async function recordFixture(database,beforePages){
 const db=await implicitPlayerFixture(database,beforePages);await db.exec(await readMigration(migrationName));
 const evidence=JSON.parse(await readFile(new URL('../../../docs/lms-0729-read-only-design-evidence.json',import.meta.url),'utf8'));
 for(const f of evidence.liveFunctions)await db.exec(f.definition);
 await db.exec(`alter table auth.users add column email text,add column email_confirmed_at timestamptz,add column email_change text,add column deleted_at timestamptz,add column banned_until timestamptz,add column is_anonymous bool,add column is_sso_user bool;
 insert into auth.users(id,email,email_confirmed_at) select user_id,m.email,now() from user_roles u join members m on m.id=u.member_id;
 create schema identity_repair_private;revoke all on schema identity_repair_private from public,anon,authenticated,service_role;
 `);
 const s=await readMigration('20260907143225_lms0723_identity_coordination.sql');
 for(const name of ['email_key','take_keys','keys_for','eligible','coordinate_writer']){
  const a=s.indexOf('CREATE FUNCTION identity_repair_private.'+name+'('),b=s.indexOf('$$;',a)+3;await db.exec(s.slice(a,b));
 }
 const a=s.indexOf('CREATE TRIGGER lms0723_identity_member_writer'),b=s.indexOf('CREATE FUNCTION identity_repair_private.shape',a);
 await db.exec(s.slice(a,b));
 await db.exec('revoke all on all functions in schema identity_repair_private from public,anon,authenticated,service_role;');
 await db.exec(`alter table user_roles drop constraint user_roles_user_id_key;
 insert into team_standings(team_id,division_id,league_id,rank,match_wins,match_losses,match_ties,matches_played,standings_points) values('${id(30)}','${id(22)}','${id(21)}',77,3,2,1,6,12.5);
 delete from user_roles where member_id='${id(1)}';`);
 return db;
}
