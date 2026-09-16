// Existing selector regression fixtures have no model-backed planner response.
// Explicitly stub the new interpretation boundary; retain their original source,
// selection, authority, conflict and generation assertions unchanged.
export async function retainNonVerificationFixture(r){
 const {retainSemanticRetrieval}=await import('../app/lib/aiSemanticRetrieval.js');
 retainSemanticRetrieval(r,{
  catalog:async()=>[],
  plan:async({question})=>({plan:{intent:'fixture',factType:'fixture',entities:[],nouns:[],concepts:[],normalizedQuestion:question,queries:[],rescueQueries:[],documentAffinities:[],verification:null}}),
  search:async()=>[],qualifies:c=>c.combinedScore>=.35,refresh:()=>{},
  assess:async()=>({supported:false,chunkIds:[],reason:'Fixture has no additional semantic evidence'}),
 });
 return r;
}
