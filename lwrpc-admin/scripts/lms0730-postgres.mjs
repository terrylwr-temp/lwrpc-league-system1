// Reuse the accepted loopback PostgreSQL 17 bootstrap, with the new bounded matrix.
import fs from 'node:fs';
let source=fs.readFileSync(new URL('./lms0729-postgres.mjs',import.meta.url),'utf8');
source=source.slice(0,source.indexOf(' const sql=await readMigration(recordMigration)'));
source=source.replace('recordFixture,id,recordMigration','recordFixture,recordMigration').replace("import {recordMatrix} from '../test/helpers/liveRecordMatrix.mjs';",'');
source=source.replace("const port='56193'","const port='56194'").replaceAll('lms0729-record-','lms0730-names-');
source=`import {scheduleNamesMatrix,scheduleMigration} from '../test/helpers/scheduleNamesMatrix.mjs';\n`+source;
source+=`
 await gate.ok(await readMigration(recordMigration));
 const snapshot=()=>gate.ok("select jsonb_build_object('tables',(select jsonb_agg(jsonb_build_object('oid',oid,'acl',relacl,'rls',relrowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace),'columns',(select jsonb_agg(jsonb_build_object('table',attrelid,'column',attnum,'acl',attacl) order by attrelid,attnum) from pg_attribute a where attrelid in(select oid from pg_class where relnamespace='public'::regnamespace)),'policies',(select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p),'memberships',(select jsonb_agg(to_jsonb(m) order by oid) from pg_auth_members m),'schemas',(select jsonb_agg(to_jsonb(n) order by oid) from pg_namespace n where nspname in('view_as_private','lms_read_private')))");
 const before=await snapshot();const old=await gate.ok("select prosrc from pg_proc where oid='view_as_private.page_read(jsonb,text,jsonb)'::regprocedure");
 const matrix=await scheduleNamesMatrix(db);assert.equal(await snapshot(),before);
 assert.equal(await gate.ok("select has_schema_privilege('lms_view_as_reader','view_as_private','CREATE')"),'f');
 await gate.ok(await readFile('../docs/lms-0730-rollback.sql','utf8'));assert.equal(await snapshot(),before);assert.equal(await gate.ok("select prosrc from pg_proc where oid='view_as_private.page_read(jsonb,text,jsonb)'::regprocedure"),old);
 await gate.ok(await readMigration(scheduleMigration));
 const result={postgres:await gate.ok('show server_version'),productionCompatibleNonSuperuser:true,grantsColumnsPoliciesMembershipsSchemasUnchanged:true,rollback:true,reapply:true,...matrix,modelCalls:0};
 await writeFile('../docs/lms-0730-postgres-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const s of sessions)s.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}
`;
const temp=new URL('./.lms0730-postgres-generated.mjs',import.meta.url);fs.writeFileSync(temp,source);await import(temp.href);
