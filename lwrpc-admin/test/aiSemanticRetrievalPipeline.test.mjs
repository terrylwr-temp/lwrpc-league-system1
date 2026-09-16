import test from 'node:test';
import assert from 'node:assert/strict';
process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {assistSemanticRetrieval}=await import('../app/lib/aiSemanticRetrieval.js');

test('expanded RPC preserves all authorization/context arguments and uses fresh query embeddings',async()=>{
  const calls=[],embeddings=[];
  const db={
    from(){const q={select(){return q;},eq(){return q;},limit(){return q;},abortSignal(){return q;},then(resolve){return Promise.resolve({data:[{id:'doc',title:'Official information',document_type:'other',active_version_id:'version'}]}).then(resolve);}};return q;},
    rpc:async(name,args)=>{calls.push({name,args});return {data:[{chunk_id:'chunk',document_id:'doc',document_version_id:'version',document_title:'Official information',document_type:'other',document_authority_rank:1,content:'The bulletin is available from the administration office.',semantic_score:.7,keyword_score:.3,exact_score:.3,combined_score:.6}]};},
  };
  const context={leagueId:'12345678-1234-4234-8234-123456789abc',divisionId:'12345678-1234-4234-8234-123456789abd',teamId:'12345678-1234-4234-8234-123456789abe',seasonId:'12345678-1234-4234-8234-123456789abf',userRole:'captain',currentPath:'/captain-dashboard',featureModule:'ask'};
  const r=await retrieveOfficialEvidence({supabase:db,body:{question:'How can I obtain the competition bulletin?',askAbout:'weekday',context},embedQuery:async q=>{embeddings.push(q);return {embedding:Array(1536).fill(embeddings.length/10),inputTokens:3};},planQuery:async()=>({plan:{intent:'administrative information',factType:'location',entities:[],nouns:['bulletin'],concepts:['publication'],normalizedQuestion:'Where is the competition bulletin available?',queries:['competition bulletin publication'],rescueQueries:['competition bulletin'],documentAffinities:['other']}})});
  const selected=await assistSemanticRetrieval(r,view=>view.candidates.slice(0,1));
  assert.equal(selected.length,1);assert.equal(calls.length,3);assert.equal(embeddings.length,3);
  for(const call of calls){assert.equal(call.name,'search_ai_official_chunks');assert.equal(call.args.p_ask_about,'weekday');assert.equal(call.args.p_user_role,'captain');assert.equal(call.args.p_league_id,context.leagueId);assert.equal(call.args.p_division_id,context.divisionId);assert.equal(call.args.p_team_id,context.teamId);assert.equal(call.args.p_season_id,context.seasonId);}
  assert.notEqual(calls[0].args.p_query_embedding,calls[1].args.p_query_embedding);
  assert.equal(r.candidates.length,1);assert.equal(r.metrics.embeddingInputTokens,9);
  assert.doesNotMatch(JSON.stringify(r),/p_query_embedding|Authorization|api_key/i);
});
