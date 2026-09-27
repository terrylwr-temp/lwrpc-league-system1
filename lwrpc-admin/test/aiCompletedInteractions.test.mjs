import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { qualityOutcome, qualityException } from '../app/lib/aiQualitySnapshots.js';
import { observeQualityRequest } from '../app/lib/aiQualityCapture.js';
import { completedInteractionPayload, completedSourceRefs } from '../app/lib/aiCompletedInteraction.js';
import { completedInteractionReport, completedInteractionDetail } from '../app/lib/aiCompletedHistory.js';
import { handleReviewRequest } from '../app/lib/aiReviewHttp.js';
import { createFeedbackReceipt, readFeedbackReceipt } from '../app/lib/aiConversation.js';
import { createInteractionHistoryFixture } from './helpers/aiInteractionHistoryFixture.mjs';

process.env.AI_QUALITY_HMAC_KEY='isolated-completed-interaction-test-key-32-characters';
process.env.SUPABASE_SERVICE_ROLE_KEY='isolated-completed-interaction-token-key';
const migrationPath=new URL('../supabase/migrations/20260927003000_ai_completed_interactions.sql',import.meta.url);
const source=()=>({sourceKind:'official_document',documentId:randomUUID(),documentVersionId:randomUUID(),chunkId:randomUUID(),documentTitle:'Synthetic Rules',citation:'Synthetic Rules — Rule 6.2.2 — Page 9',ruleNumber:'6.2.2',pageNumber:9,officialDocumentUrl:'https://signed.example.invalid/secret'});
const execution=(kind='answer',question='Can mixed teams include additional players?',answer='Yes. The mixed round may include additional players.')=>({
  result:{kind,answer},answer:{selectedEvidence:kind==='answer'?[source()]:[],sources:kind==='answer'?[source()]:[]},
  retrieval:{candidates:[]},conversationResolution:{rawQuestion:question,effectiveQuestion:question,classification:'standalone'},
});

test('official completion capture, feedback linkage, manager filtering, security and rollback in isolated PostgreSQL',async t=>{
  const fixture=await createInteractionHistoryFixture({seed:false});
  const {db}=fixture;
  try{
    const sql=await readFile(migrationPath,'utf8');
    const old=(await db.query("select count(*)::integer n from public.ai_request_outcomes")).rows[0].n;
    await db.exec(sql);
    await db.exec(sql);
    const actor=(await db.query('select id from auth.users limit 1')).rows[0].id;
    const member=(await db.query('select id from public.members limit 1')).rows[0].id;
    const auth={user:{id:actor},memberRows:[{id:member}],role:'captain'};
    const make=(kind='answer',origin='player_interface',question,answer)=>{
      const e=execution(kind,question,answer),started=Date.now()-90,completed=Date.now();
      const outcome=qualityOutcome({id:randomUUID(),origin,started,completed,execution:e,stage3Invoked:true});
      const exception=qualityException(outcome,e);
      const interaction=completedInteractionPayload({outcome,execution:e,authorization:{...auth,role:origin==='manager_test'?'league_manager':'captain'},routeStarted:performance.now()-80,origin});
      return {outcome,exception,interaction,e};
    };
    const capture=async p=>db.query('select public.capture_ai_completed_official($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb) result',
      [p.outcome,p.exception.p_occurrence,p.exception.p_route,p.interaction]);
    const report=async filters=>(await db.query('select public.ai_review_completed_interactions($1::jsonb) result', [{
      from:null,to:new Date(Date.now()+10000).toISOString(),asof:new Date(Date.now()+10000).toISOString(),
      limit:25,feedback:'all',classification:'none',result:'all',rule:'',search:'',...filters,
    }])).rows[0].result;

    await t.test('unvoted answer is complete immediately; final citation contains no signed URL',async()=>{
      const p=make();
      await db.exec('set role service_role');
      await capture(p);
      await capture(p); // same-ID retry is idempotent
      await db.exec('reset role');
      const data=await report();
      assert.equal(data.summary.total,1);
      const row=data.rows[0];
      assert.equal(row.answer_id,p.outcome.id);
      assert.equal(row.question,p.interaction.original_question);
      assert.equal(row.answer,p.interaction.final_answer);
      assert.equal(row.user_name,'Synthetic Reviewer');
      assert.equal(row.user_role,'captain');
      assert.equal(row.feedback,'no_feedback');
      assert.ok(Number(row.response_ms)>0);
      assert.equal(row.source_refs[0].ruleNumber,'6.2.2');
      assert.doesNotMatch(JSON.stringify(row.source_refs),/signed\.example|officialDocumentUrl|secret/);
      await assert.rejects(db.query('select public.capture_ai_completed_official($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb)',
        [p.outcome,null,null,{...p.interaction,final_answer:'Changed answer'}]),/completed_mismatch/);
    });

    await t.test('Helpful then Not Helpful attach without another interaction',async()=>{
      const id=(await report()).rows[0].answer_id;
      await db.exec('set role service_role');
      for(const helpful of [true,false])await db.query(`insert into public.ai_answer_feedback_events
        (answer_id,completed_interaction_id,auth_user_id,member_id,helpful,original_question,effective_question,generated_answer,assistant_version)
        select id,id,auth_user_id,member_id,$1,original_question,effective_question,final_answer,assistant_version
        from public.ai_completed_interactions where id=$2`,[helpful,id]);
      await db.exec('reset role');
      const data=await report();
      assert.equal(data.summary.total,1);
      assert.equal(data.rows[0].feedback,'not_helpful');
      assert.equal((await report({feedback:'helpful'})).rows.length,0);
      assert.equal((await db.query('select count(*)::integer n from public.ai_completed_interactions')).rows[0].n,1);
    });

    await t.test('insufficient evidence appears; manager tests do not appear by default',async()=>{
      const insufficient=make('insufficient_evidence','player_interface','What is the missing policy?','I could not find sufficient official evidence.');
      const manager=make('answer','manager_test','What rule governs this test?','The synthetic rule applies.');
      await db.exec('set role service_role');
      await capture(insufficient);await capture(manager);
      await db.exec('reset role');
      const visible=await report();
      assert.equal(visible.summary.total,2);
      assert.equal(visible.rows.find(r=>r.answer_id===insufficient.outcome.id).result,'insufficient_evidence');
      assert.equal((await report({classification:'manager_console'})).rows[0].answer_id,manager.outcome.id);
      assert.equal((await report({rule:'6.2.2'})).summary.total,1);
      assert.equal((await db.query('select count(*)::integer n from public.ai_review_occurrences where answer_id=$1',[insufficient.outcome.id])).rows[0].n,1);
    });

    await t.test('only server role can read/write; manager HTTP role gate remains',async()=>{
      for(const role of ['anon','authenticated']){
        await db.exec(`set role ${role}`);
        await assert.rejects(db.query('select * from public.ai_completed_interactions'),/permission denied/);
        await assert.rejects(report(),/permission denied/);
        await db.exec('reset role');
      }
      const adapter={rpc:async(name,args)=>({data:(await db.query('select public.ai_review_completed_interactions($1::jsonb) result',[args.p_filters])).rows[0].result})};
      const request=new Request('http://local/api/ai-assistant/review?op=interactions&period=all');
      const denied=await handleReviewRequest(request,async()=>({role:'player',user:{id:actor},supabase:adapter}));
      assert.equal(denied.status,403);
      const allowed=await handleReviewRequest(request,async()=>({role:'commissioner',user:{id:actor},supabase:adapter}));
      assert.equal(allowed.status,200);
      assert.equal((await allowed.json()).rows.length,2);
      const reportApi=await completedInteractionReport(adapter,new URLSearchParams({period:'all'}),actor);
      assert.equal(reportApi.rows.length,2);
      const detail=await completedInteractionDetail(adapter,new URLSearchParams({answer:reportApi.rows[0].id}));
      assert.equal(detail.interaction.hasQuestion,true);
    });

    await t.test('isolated rollback removes only additive objects and leaves legacy history',async()=>{
      assert.equal(old,0);
      await db.exec(`drop function public.ai_review_completed_interactions(jsonb) restrict;
        drop function public.capture_ai_completed_official(jsonb,jsonb,jsonb,jsonb) restrict;
        alter table public.ai_answer_feedback_events drop constraint ai_answer_feedback_completed_identity;
        alter table public.ai_answer_feedback_events drop column completed_interaction_id;
        drop table public.ai_completed_interactions restrict;`);
      assert.equal((await db.query("select to_regclass('public.ai_completed_interactions') reg")).rows[0].reg,null);
      assert.equal((await db.query('select count(*)::integer n from public.ai_request_outcomes')).rows[0].n,3);
      const later=new Date(Date.now()+10000).toISOString();
      const legacy=(await db.query('select public.ai_review_interactions($1::jsonb) result',[{...fixture.filters,to:later,asof:later}])).rows[0].result;
      assert.equal(legacy.summary.total,3);
    });
  }finally{await db.close();}
});

test('clarification continuation uses human original and resolved question, never a choice token',()=>{
  const e=execution();
  e.conversationResolution={rawQuestion:'choice:ca374320-992d-4849-94fd-f060d238f690',reviewOriginalQuestion:'Which Saturday mixed partners play?',
    effectiveQuestion:'Which Saturday mixed partners play in the Saturday League?',clarificationConsumed:true};
  const outcome=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1000,completed:1100,execution:e});
  const p=completedInteractionPayload({outcome,execution:e,authorization:{user:{id:randomUUID()},memberRows:[],role:'player'},routeStarted:performance.now()-20,origin:'player_interface'});
  assert.equal(p.original_question,'Which Saturday mixed partners play?');
  assert.match(p.effective_question,/Saturday League/);
  assert.doesNotMatch(JSON.stringify(p),/choice:ca374320/);
  assert.deepEqual(completedSourceRefs(e.answer.sources).map(s=>s.officialDocumentUrl),[undefined]);
  const receipt=createFeedbackReceipt({userId:p.auth_user_id,answerId:p.id,originalQuestion:p.original_question,
    effectiveQuestion:p.effective_question,answer:p.final_answer,completedInteraction:true});
  const claims=readFeedbackReceipt(receipt,p.auth_user_id);
  assert.equal(claims.completedInteraction,true);
  assert.equal(claims.answerId,p.id);
  assert.doesNotMatch(JSON.stringify(claims),/choice:ca374320/);
});

test('official completion fails closed while protected and clarification outcomes never invoke full-text capture',async()=>{
  const run=kind=>async()=>({result:{kind,answer:'Synthetic response'},conversationResolution:{rawQuestion:'Synthetic question?',effectiveQuestion:'Synthetic question?'}});
  const noWrite=async()=>{throw new Error('capture unavailable');};
  await assert.rejects(observeQualityRequest({supabase:{},run:run('answer'),complete:noWrite,persist:async()=>true}),/capture unavailable/);
  for(const kind of ['protected','clarification']){
    let completions=0;
    await observeQualityRequest({supabase:{},run:run(kind),complete:async()=>{completions++;},persist:async()=>true});
    assert.equal(completions,0);
  }
  await assert.rejects(observeQualityRequest({supabase:{},run:async()=>{throw Error('generation failed');},complete:async()=>assert.fail('no completion'),persist:async()=>true}),/generation failed/);
});

test('Live LMS and eligibility fallbacks keep the official observer metadata-only',async()=>{
  for(const path of ['../app/api/ask-lwr/route.js','../app/api/ai-assistant/answer/route.js']){
    const route=await readFile(new URL(path,import.meta.url),'utf8');
    assert.match(route,/if\(needsEligibility\(body\)\)\s*\{\s*privatePathAttempted = true;/);
    assert.match(route,/if\(needsLive\(body\)\)\s*\{\s*privatePathAttempted = true;/);
    assert.match(route,/complete: privatePathAttempted \? undefined : details => persistCompletedOfficial/);
  }
  let telemetry;
  await observeQualityRequest({supabase:{},run:async()=>execution(),
    complete:undefined,persist:async(_db,build)=>{telemetry=build();}});
  assert.equal(telemetry.p_outcome.final_kind,'answer');
  assert.equal(telemetry.p_outcome.origin,'player_interface');
  assert.equal(telemetry.p_occurrence,null);
  assert.doesNotMatch(JSON.stringify(telemetry),/Can mixed teams|additional players/);
});
