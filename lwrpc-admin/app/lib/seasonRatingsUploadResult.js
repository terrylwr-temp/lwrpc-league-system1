export function uploadPreview(plan) {
 const rows=plan.rows.map(row=>({...row,line:row.incoming?.line,duprId:row.duprId||row.incoming?.duprId||'',incomingValues:row.incoming?.data||{},working:row.working||{},fills:row.fills||{},
  reason:row.action==='RECORD'?'All supplied usable input fields are already populated; existing values are protected. Source evidence will be recorded.':row.reason}));
 return {season:plan.season,rows,counts:{...plan.counts,ready:plan.counts.affected,
  skipped:rows.filter(r=>['SKIP','DEFER','REVIEW'].includes(r.action)).length}};
}
const count=value=>Number.isInteger(value)&&value>=0?String(value):'not reported';
export function uploadCompletionSummary(result,seasonName) {
 const c=result.counts||{};
 const notFound=[c.total,c.affected,c.inactive,c.review].every(Number.isInteger)?Math.max(0,c.total-c.affected-c.inactive-c.review):null;
 return `Import completed for ${seasonName}. ${count(c.affected)} member rows processed. DUPR Doubles fields filled: ${count(c.doubles)}; Reliability Rating fields filled: ${count(c.rf)}; Age-Based inputs stored: ${count(c.age)}. Existing input fields protected: ${count(c.protectedFields)}; missing source fields: ${count(c.missing)}; inactive: ${count(c.inactive)}; not found: ${count(notFound)}; review (ambiguous/invalid): ${count(c.review)}. Final Season DUPR and PrimeTime ratings were preserved. Clean Ratings was not run.`;
}
// A successful transaction stays successful even if the subsequent read fails.
export async function finishRatingsUpload({commit,clearPreview,showSuccess,refresh,showRefreshError}) {
 const result=await commit();
 clearPreview();showSuccess(result);
 try {await refresh();}catch(error){showRefreshError(error);}
 return result;
}
