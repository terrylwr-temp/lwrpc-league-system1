// Diagnosis only: isolated synthetic database; no network/env/production mutation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {recordFixture,recordMigration,id} from '../lwrpc-admin/test/helpers/liveRecordFixture.mjs';
import {readMigration} from '../lwrpc-admin/test/helpers/implicitPlayerFixture.mjs';
import {createViewAsProjectionClient} from '../lwrpc-admin/app/lib/viewAsProjectionClient.js';
const db=await recordFixture();
try {
 await db.exec(await readMigration(recordMigration));
 await db.exec(`update teams set captain_member_id='${id(9)}',co_captain_member_id='${id(6)}',co_captain_2_member_id='${id(7)}' where id='${id(31)}'; update members set full_name=first_name||' '||last_name; delete from match_lines;`);
 const source=await fs.readFile(new URL('../lwrpc-admin/app/components/TeamScheduleModal.js',import.meta.url),'utf8');
 const start=source.indexOf('function captainNames('),end=source.indexOf('\nfunction ',source.indexOf('function formatCaptainName(')+10);
 const format=new Function(source.slice(start,end)+';return captainNames;')();
 const selection='id,name,division_id,captain:members!teams_captain_member_id_fkey(id,first_name,last_name,full_name,email),co_captain_1:members!teams_co_captain_member_id_fkey(id,first_name,last_name,full_name,email),co_captain_2:members!teams_co_captain_2_member_id_fkey(id,first_name,last_name,full_name,email)';
 const tables={};for(const t of ['teams','members'])tables[t]=(await db.query('select row_to_json(r) data from '+t+' r')).rows.map(r=>r.data);
 const normal=await createViewAsProjectionClient(()=>tables).from('teams').select(selection).eq('division_id',id(22)).eq('is_active',true).order('name');
 const output=[];
 for(const [n,role,managed] of [[2,'captain',[id(30)]],[1,'player',[]],[5,'club_pro',[id(30)]]]) {
  const viewer={memberId:id(n),role,teams:[id(30)],managed};
  const projected=(await db.query("select lms_read_private.competition($1,'dashboard','{}')||lms_read_private.people($1,'dashboard','{}') data",[viewer])).rows[0].data;
  const view=await createViewAsProjectionClient(()=>projected).from('teams').select(selection).eq('division_id',id(22)).eq('is_active',true).order('name');
  assert.deepEqual(view.data.map(t=>t.id),normal.data.map(t=>t.id));
  const opponent=normal.data.find(t=>t.id===id(31)),viewOpponent=view.data.find(t=>t.id===id(31));
  assert.equal(format(opponent),'Synthetic Person9, Synthetic Person6, Synthetic Person7');assert.equal(format(viewOpponent),'');
  output.push({role,member:id(n),normal:normal.data.map(t=>({id:t.id,name:t.name,captains:format(t)})),viewAs:view.data.map(t=>({id:t.id,name:t.name,captains:format(t)})),sameTeamSet:true,firstDivergence:{otherTeamCaptainKeyPresent:Object.hasOwn(projected.teams.find(t=>t.id===id(31)),'captain_member_id'),otherCaptainNameRowPresent:projected.members.some(m=>m.id===id(9))}});
 }
 output.push({formatterControls:{missing:format({}),emailOnly:format({captain:{email:'synthetic@example.invalid'}}),duplicate:format({captain:{full_name:'Same Name'},co_captain_1:{full_name:'Same Name'}})},limits:'Exact accepted SQL projection + display adapter + unchanged formatter. Normal rows model the explicit existing schedule SELECT; not a browser or normal-RLS proof. No correction applied.'});
 await fs.writeFile(new URL('./lms-0730-reproduction.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
} finally {await db.close();}
