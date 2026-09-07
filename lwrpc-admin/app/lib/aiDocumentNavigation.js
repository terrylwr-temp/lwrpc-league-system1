import { officialQuestionConcept } from './aiQuestionConcepts.js';

// Navigation uses active catalog identity, not a policy-paragraph similarity score.
export async function retrieveDocumentNavigation(supabase, request) {
  const plan=officialQuestionConcept(request.question);
  if(plan?.kind!=='document_navigation')return null;
  const result={request,interpretation:{matchingView:request.question,annotations:[]},candidates:[],suppliedEvidence:[],authorityReviewCandidates:[],intentEvidenceCandidates:[],evidence:{sufficient:false,threshold:.35,topScore:null},metrics:{embeddingMs:0,retrievalMs:0,totalMs:0,embeddingInputTokens:0},documentNavigation:{status:'unavailable'}};
  const started=performance.now();
  try {
    const {data,error}=await supabase.from('ai_documents').select('id,title,document_type,authority_rank,active_version_id,active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(id,processing_status)').eq('status','active').eq('active_version.processing_status','ready').limit(24);
    if(error) return result;
    const matches=(data||[]).filter(d=>({rules:d.document_type==='league_rules',usap:d.document_type==='usap_rulebook',dates:/important dates/i.test(d.title),captain:d.document_type==='captain_guide',player:d.document_type==='player_guide'}[plan.document])).filter(d=>plan.document!=='captain'||(!/\blms\b/i.test(request.question)||/\blms\b/i.test(d.title))&&(!/\bdupr\b/i.test(request.question)||/\bdupr\b/i.test(d.title)));
    if(!matches.length)return result;
    if(matches.length!==1 || plan.document==='rules'&&!plan.leagues.length&&!/\b(?:lwr|club|league)\b/i.test(request.question)) {
      result.documentNavigation={status:'clarification',message:matches.length>1?`Which official document do you mean: ${matches.map(d=>d.title).join(' or ')}?`:'Which official rules do you mean: LWR League Rules or USA Pickleball Rulebook?'};
      return result;
    }
    const d=matches[0];
    let query=supabase.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,section_label,rule_number,heading,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(24);
    if(plan.leagues.length===1)query=query.ilike('content',`%${plan.leagues[0]}%`);
    let {data:anchors,error:anchorError}=await query;
    if(anchorError)return result;
    if(!anchors?.length && plan.leagues.length) {
      const fallback=await supabase.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,section_label,rule_number,heading,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(1);
      if(fallback.error)return result;
      anchors=fallback.data;
    }
    const anchor=(anchors||[]).find(c=>plan.leagues.some(l=>new RegExp(`^\\s*(?:\\d+(?:\\.\\d+)*\\.?\\s*)?${l}\\b`,'i').test(c.content))) || anchors?.[0];
    if(!anchor)return result;
    const source={chunkId:anchor.id,documentId:d.id,documentVersionId:d.active_version_id,documentTitle:d.title,documentType:d.document_type,documentAuthorityRank:d.authority_rank,pageNumber:anchor.page_number,sectionLabel:anchor.section_label||'',ruleNumber:anchor.rule_number||'',heading:anchor.heading||'',content:anchor.content,documentNavigationAnchor:true};
    result.suppliedEvidence=[source];result.authorityReviewCandidates=[source];
    result.evidence.sufficient=true;
    result.documentNavigation={status:'found',message:`You can find the requested official information in ${d.title}. Open the Official Source below.`};
    return result;
  } catch { return result; }
  finally {result.metrics.retrievalMs=Math.round(performance.now()-started);result.metrics.totalMs=result.metrics.retrievalMs;}
}
