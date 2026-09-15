// Extend the accepted isolated fixture; never loads .env or contacts production.
import fs from 'node:fs';
let source=fs.readFileSync(new URL('./lms0729-local-browser.mjs',import.meta.url),'utf8');
source=source.replaceAll('3086','3092').replaceAll('3087','3093').replaceAll('lms0729-browser-fixture','lms0730-browser-fixture');
source=source.replace('await db.exec(await readMigration(recordMigration));',`await db.exec(await readMigration(recordMigration));
await db.exec(await readMigration('20260909231834_lms0730_schedule_captain_names.sql'));`);
source=source.replace('const tables={};',`await db.exec(\`update matches set division_id='10000000-0000-4000-8000-000000000022',league_id='10000000-0000-4000-8000-000000000021';update teams set captain_member_id='\${id(9)}',co_captain_member_id='\${id(6)}',co_captain_2_member_id='\${id(7)}' where id='\${id(31)}';update members set full_name='Synthetic Very Long Captain Display Name Person9' where id='\${id(9)}';update members set first_name='',last_name='',full_name='' where id='\${id(6)}';\`);
const tables={};`);
// Keep imports relative to scripts, using a generated fixture launcher only.
const temp=new URL('./.lms0730-browser-generated.mjs',import.meta.url);fs.writeFileSync(temp,source);
await import(temp.href);
