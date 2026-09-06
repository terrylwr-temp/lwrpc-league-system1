import {approvedEligible} from './aiApprovedAnswersShared.js';
import {APPROVED_SEMANTIC_MIN,managedQuestionCompatible} from './aiApprovedAnswersSelection.js';
import {validateManagedPassage} from './aiApprovedSourceBinding.js';
import {schedulingQuestionKind,schedulingPolicyApplies,schedulingPassageApplies} from './aiSchedulingApplicability.js';

// Exact identity reads only, bounded to the existing four managed candidates.
// No RPC, vector, model, score inflation, or database capability in diagnostics.
export async function prepareApprovedRelatedEvidence({supabase,question,formal,rows,scope='all',seasonId=null,date,timeoutMs=750}) {
  const started=performance.now();
  const diagnostic={concept:schedulingQuestionKind(question)||'none',considered:[],lookupCount:0,durationMs:0};
  const candidates=rows.slice(0,4).filter(x=>x.semantic_score>=APPROVED_SEMANTIC_MIN&&Number.isFinite(x.semantic_score)
    && managedQuestionCompatible(question,x.revision)&&schedulingPolicyApplies(question,x.revision)
    && approvedEligible(x.revision,{date,scope,seasonId:seasonId||x.resolved_season_id,manifest:x.manifest})&&x.revision.related_chunk_id);
  const prepared=rows.map(x=>({...x,validatedRelatedEvidence:undefined}));
  if(!candidates.length)return {formal,rows:prepared,diagnostic};
  const controller=new AbortController();let timer;
  const read=async query=>{diagnostic.lookupCount++;const result=await (typeof query.abortSignal==='function'?query.abortSignal(controller.signal):query);if(result.error)throw Error('source_unavailable');return result.data||[];};
  try{
    const result=await Promise.race([(async()=>{
      const chunks=await read(supabase.from('ai_document_chunks').select('id,document_version_id,content,page_number,rule_number,heading,section_label,is_searchable').in('id',[...new Set(candidates.map(x=>x.revision.related_chunk_id))]));
      const versions=await read(supabase.from('ai_document_versions').select('id,document_id,processing_status,document:ai_documents!ai_document_versions_document_id_fkey!inner(id,title,status,active_version_id,document_type,scope_kind,authority_rank)').in('id',[...new Set(chunks.map(x=>x.document_version_id))]));
      return {chunks,versions};
    })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('source_timeout'));},timeoutMs);})]);
    const selected=[...formal];
    for(const item of candidates){
      const r=item.revision,entry={revisionId:r.id,chunkId:r.related_chunk_id,status:'rejected'};
      diagnostic.considered.push(entry);
      try{
        const c=result.chunks.find(c=>c.id===r.related_chunk_id),v=result.versions.find(v=>v.id===c?.document_version_id),d=v?.document;
        if(!c?.is_searchable||!v||v.processing_status!=='ready'||!d||d.id!==v.document_id||d.status!=='active'||d.active_version_id!==v.id||d.document_type!=='league_rules'||d.scope_kind!=='all')throw Error('source_not_current_or_scope');
        const p=validateManagedPassage(c,r.related_passage,r.related_rule_identity);
        if(!schedulingPassageApplies(p.passage,diagnostic.concept))throw Error('passage_not_applicable');
        const evidence={chunkId:c.id,documentId:d.id,documentVersionId:v.id,documentTitle:d.title,documentType:d.document_type,documentAuthorityRank:d.authority_rank,documentScopeKind:d.scope_kind,
          pageNumber:c.page_number,ruleNumber:p.ruleNumber,heading:p.heading,sectionLabel:c.section_label,content:p.passage,selectedPassages:[p.passage],boundRelatedPassage:true,
          sourceClassification:'lwr_controlling',evidenceRole:'Primary / controlling',evidenceSelectionReason:'Independent scheduling applicability and server-validated exact formal passage',intentSupport:['match_schedule_change']};
        const index=selected.findIndex(f=>f.chunkId===c.id);
        if(index>=0)selected[index]=evidence;else if(selected.length<4)selected.push(evidence);else throw Error('evidence_capacity');
        prepared.find(x=>x.revision.id===r.id).validatedRelatedEvidence=evidence;
        entry.status='validated';entry.ruleIdentity=p.ruleNumber;
      }catch{entry.status='rejected';}
    }
    return {formal:selected,rows:prepared,diagnostic};
  }catch{
    diagnostic.considered=candidates.map(x=>({revisionId:x.revision.id,chunkId:x.revision.related_chunk_id,status:'unavailable'}));
    return {formal,rows:prepared,diagnostic};
  }finally{clearTimeout(timer);diagnostic.durationMs=Math.round(performance.now()-started);}
}
