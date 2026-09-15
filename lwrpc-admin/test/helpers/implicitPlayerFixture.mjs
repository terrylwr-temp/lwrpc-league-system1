import {eligibilityDatabase} from './eligibilityDatabase.mjs';
import {readFile} from 'node:fs/promises';
export {id} from './viewAsFixture.mjs';
export const migrationName='20260909202216_lms0728_implicit_player.sql';
export const readMigration=name=>readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8');
export async function implicitPlayerFixture(database,beforePages=async()=>{}){
 const db=await eligibilityDatabase(database);
 await db.exec(await readMigration('20260908203904_lms0725_eligibility_self.sql'));
 // Existing schema-only page fixture expansion, after the current Live functions.
 const fields=JSON.parse(await readFile(new URL('../../../docs/lms-0726-read-fields.json',import.meta.url),'utf8'));
 const catalog=JSON.parse(await readFile(new URL('../../../docs/lms-0726-database-catalog.json',import.meta.url),'utf8'));
 const wanted=new Set([...Object.values(fields).map(f=>f.table),'notification_templates']);
 const current=await db.query("select table_name,column_name from information_schema.columns where table_schema='public'");
 const present=new Set(current.rows.map(r=>r.table_name+'.'+r.column_name)),tables=new Set(current.rows.map(r=>r.table_name));
 for(const c of catalog.columns){if(!wanted.has(c.table)||present.has(c.table+'.'+c.column))continue;if(!/^[a-z_0-9]+$/.test(c.table+c.column+c.type.replace(/^_/,'')))throw Error('Unsafe fixture identifier');if(!tables.has(c.table)){await db.exec(`create table public.${c.table}(fixture_unused bool)`);tables.add(c.table);}await db.exec(`alter table public.${c.table} add column ${c.column} ${c.type.startsWith('_')?c.type.slice(1)+'[]':c.type}`);present.add(c.table+'.'+c.column);}
 await beforePages();
 await db.exec(await readMigration('20260909153000_lms0726_view_as_real_ui_reads_role_compat.sql'));
 return db;
}
