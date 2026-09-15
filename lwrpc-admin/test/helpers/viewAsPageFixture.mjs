import {fixture,id} from './viewAsFixture.mjs';
import {readFile} from 'node:fs/promises';
export {id};
export async function pageFixture(database){
 const db=await fixture(database);
 await db.exec(await readFile(new URL('../../supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql',import.meta.url),'utf8'));
 const fields=JSON.parse(await readFile(new URL('../../../docs/lms-0726-read-fields.json',import.meta.url),'utf8'));
 const catalog=JSON.parse(await readFile(new URL('../../../docs/lms-0726-database-catalog.json',import.meta.url),'utf8'));
 const wanted=new Set([...Object.values(fields).map(f=>f.table),"notification_templates"]);
 const current=await db.query("select table_name,column_name from information_schema.columns where table_schema='public'");
 const present=new Set(current.rows.map(r=>r.table_name+'.'+r.column_name));
 const tables=new Set(current.rows.map(r=>r.table_name));
 for(const c of catalog.columns){if(!wanted.has(c.table)||present.has(c.table+'.'+c.column))continue;if(!/^[a-z_0-9]+$/.test(c.table+c.column+c.type.replace(/^_/,'')))throw new Error('Unsafe fixture identifier');if(!tables.has(c.table)){await db.exec(`create table public.${c.table}(fixture_unused bool)`);tables.add(c.table);}const type=c.type.startsWith('_')?c.type.slice(1)+'[]':c.type;await db.exec(`alter table public.${c.table} add column ${c.column} ${type}`);present.add(c.table+'.'+c.column);}
 await db.exec(`update teams set home_location_id='${id(40)}';update matches set division_id='${id(22)}';update team_standings set division_id='${id(22)}';`);
 return db;
}
