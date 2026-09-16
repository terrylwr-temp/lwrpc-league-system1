import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {schema,migration,id,asService} from './ratingsSourceDatabase.mjs';
export {id};
export const workflowSql=fs.readFileSync(new URL('../fixtures/ratingsUpload/workflow-schema.sql',import.meta.url),'utf8');
export const rules='4.1.1. A player with a DUPR Reliability Factor of 29 or below will be classified as NR.\n4.2. All DUPR ratings will be truncated to the nearest tenth\nRated) are eligible to participate in any division.\n4.5.1. NR is division maximum minus 0.5\n4.5.2. Use highest adjusted Season DUPR.';
export async function fixture(db=new PGlite()){await db.exec(schema);await db.exec("create schema auth; create function auth.uid() returns uuid language sql as $$select null::uuid$$;");await db.exec(migration);
 await db.exec(`alter table member_season_ratings add id uuid not null default gen_random_uuid();
 alter table member_season_ratings add created_at timestamptz default now();alter table member_season_ratings add updated_at timestamptz default now();
 alter table member_season_ratings add foreign key(member_id) references members(id);alter table member_season_ratings add foreign key(season_id) references seasons(id);
 create table ai_documents(id uuid,active_version_id uuid,status text,document_type text,scope_kind text);
 create table ai_document_versions(id uuid,processing_status text);
 create table ai_document_chunks(document_version_id uuid,is_searchable boolean,chunk_ordinal integer,content text);
 create table leagues(id uuid primary key,season_id uuid,is_active boolean);
 create table divisions(id uuid primary key,league_id uuid,max_dupr numeric,rating_type text,is_active boolean);
 create table teams(id uuid primary key,division_id uuid,is_active boolean);
 create table team_members(team_id uuid references teams(id),member_id uuid references members(id),primary key(team_id,member_id));
 insert into ai_documents values('${id(80)}','${id(81)}','active','league_rules','all');insert into ai_document_versions values('${id(81)}','ready');
 insert into leagues values('${id(30)}','${id(20)}',true);
 insert into divisions values('${id(31)}','${id(30)}',3.8,'dupr',true),('${id(32)}','${id(30)}',4.8,'dupr',true),('${id(33)}','${id(30)}',6,'primetime',true);
 insert into teams values('${id(41)}','${id(31)}',true),('${id(42)}','${id(32)}',true),('${id(43)}','${id(33)}',true);`);
 await db.query('insert into ai_document_chunks values($1,true,1,$2)',[id(81),rules]);await db.exec(workflowSql);return db;
}
export const preview=async(db,operation,upload=[])=>(await asService(db,'select public.season_ratings_workflow_preview($1,$2,$3,$4) result',[id(101),id(20),operation,upload])).rows[0].result;
let run=1000;
export async function receipt(db,operation,upload=[]){const p=await preview(db,operation,upload);return {id:id(++run),actor:id(101),seasonId:id(20),operation,upload,fingerprint:p.fingerprint,expires:'2099-01-01T00:00:00Z',fileHash:'synthetic'};}
export const commit=async(db,p)=>(await asService(db,'select public.season_ratings_workflow_commit($1,$2) result',[id(101),p])).rows[0].result;
export async function execute(db,operation,upload=[]){return commit(db,await receipt(db,operation,upload));}
export const source=(rf=30,doubles='3.299',age=4.744)=>({doubles,rf,...(age===null?{}:{age,ageSource:'over_65'}),doublesMissing:false,rfMissing:false,ageMissing:age===null});
export const upload=(data=source())=>[{duprId:'ABC123',line:2,data},{duprId:'DEF456',line:3,data}];
export const ratings=async db=>(await db.query('select * from member_season_ratings order by member_id')).rows;

