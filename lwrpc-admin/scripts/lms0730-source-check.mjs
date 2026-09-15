import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const baseline='../.local-validation/lms0729-production-upload/lwrpc-admin';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const files=walk(path.join(baseline,'app')).map(p=>path.relative(baseline,p));const changed=files.filter(p=>hash(path.join(baseline,p))!==hash(p));
for(const file of ['app/captain-dashboard/page.js','app/player-dashboard/page.js']){
 const old=fs.readFileSync(path.join(baseline,file),'utf8').replaceAll('\r\n','\n');
 let current=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n').replace('import {scheduleTeamsWithNames} from "../lib/viewAsPageState.js";\n','');
 current=current.replace('(await scheduleTeamsWithNames(divisionTeams || [], team.division_id))','(divisionTeams || [])').replace('(await scheduleTeamsWithNames(divisionTeams || [], divisionId))','(divisionTeams || [])');assert.equal(current,old,file);
}
assert.equal(hash('app/components/TeamScheduleModal.js'),hash(path.join(baseline,'app/components/TeamScheduleModal.js')));
fs.writeFileSync('../docs/lms-0730-source-comparison.json',JSON.stringify({baseline:'LMS-0729 accepted upload',changed,newFiles:['app/lib/scheduleCaptainNames.js'],normalScheduleQueriesAndRenderingUnchanged:true,unchangedExistingAppFiles:files.length-changed.length},null,2));console.log(JSON.stringify({changed,normalScheduleQueriesAndRenderingUnchanged:true}));
