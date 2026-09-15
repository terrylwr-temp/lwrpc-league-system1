import fs from 'node:fs';
export const migrationName = '20260910134349_season_ratings_source_import.sql';
export const migration = fs.readFileSync(new URL('../../supabase/migrations/'+migrationName, import.meta.url), 'utf8');
export const id = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
export const schema = `
create role anon; create role authenticated; create role service_role;
create table public.members(id uuid primary key,first_name text,last_name text,dupr_id text,is_active_member boolean);
create table public.user_roles(user_id uuid,member_id uuid,role text);
create table public.seasons(id uuid primary key,name text,is_active boolean);
create table public.member_season_ratings(member_id uuid,season_id uuid,season_dupr_rating numeric,season_primetime_rating numeric,dupr_reliability_rating numeric(6,3),dupr_doubles_rating text,notes text,primary key(member_id,season_id));
create schema ai_live_private;
-- Synthetic identity provider only; the migration reuses the unchanged production resolver.
create function ai_live_private.resolve_identity(actor uuid) returns jsonb language sql as $$select jsonb_build_object('memberId',member_id,'role',role) from public.user_roles join public.members on members.id=member_id where user_id=actor and is_active_member is true$$;
insert into members values('${id(1)}','Synthetic','Manager','ABC123',true),('${id(2)}','Synthetic','Player','DEF456',true);
insert into user_roles values('${id(101)}','${id(1)}','commissioner'),('${id(102)}','${id(2)}','player');
insert into seasons values('${id(20)}','Synthetic Fall',true);
insert into member_season_ratings values('${id(1)}','${id(20)}',4,4.2,29,'3.2','preserve me'),('${id(2)}','${id(20)}',3,3.3,30,'3.3','also preserve');
`;
export const payload = (overrides = {}) => ({
  id: id(900), actor: id(101), seasonId: id(20), fileHash: 'fixture-hash', policy: 'source-only-v1', expires: '2099-01-01T00:00:00Z',
  updates: [1,2].map(n => ({ line: n+1, duprId: n===1?'ABC123':'DEF456', memberId: id(n), expectedRevision: 0, data: { doubles: '3.237', rf: 29, age: 4.744, ageSource: 'over_65', doublesMissing: false, rfMissing: false, ageMissing: false } })), ...overrides,
});

export async function asService(db, sql, params) {
  await db.exec('set role service_role');
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
}
export const commit = (db,p=payload(),actor=id(101)) => asService(db,'select public.season_ratings_source_commit($1,$2) result',[actor,p]);
export async function fingerprint(db) {
  return (await db.query(`select jsonb_build_object('members',(select jsonb_agg(to_jsonb(m) order by id) from members m),'ratings',(select jsonb_agg(to_jsonb(r) order by member_id) from member_season_ratings r),'roles',(select jsonb_agg(to_jsonb(r) order by user_id) from user_roles r)) value`)).rows[0].value;
}
