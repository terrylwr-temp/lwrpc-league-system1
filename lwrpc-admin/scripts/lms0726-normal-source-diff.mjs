import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const app=process.cwd();
const baseline=JSON.parse(await readFile(path.resolve(app,'../docs/lms-0726-normal-source-baseline.json'),'utf8'));
const changes=[];
for(const row of baseline.files){let current=null;try{current=createHash('sha256').update(await readFile(path.join(app,row.file))).digest('hex');}catch(error){if(error.code!=='ENOENT')throw error;}if(current!==row.sha256)changes.push({file:row.file,baseline:row.sha256,current,status:current?'ADAPTED':'REMOVED',classification:'REVIEW REQUIRED',normalRegressionEvidence:'REQUIRED before acceptance'});}
console.log(JSON.stringify({baselineFiles:baseline.files.length,changedExistingFiles:changes.length,changes,limits:'Compares existing source bytes only; not a behavioral regression test, deployed-source proof or business-data integrity check. New files must also be included in the final release inventory.'},null,2));
