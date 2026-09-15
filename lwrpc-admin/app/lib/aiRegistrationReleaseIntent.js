// Bounded public-document intent; never resolves a member or grants access.
export function registrationReleaseIntent(value) {
 const q=String(value||'').normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase();
 const leagues=['weekday','saturday','primetime'].filter(l=>new RegExp(`\\b${l==='primetime'?'prime\\s*time':l}\\b`).test(q));
 const fall=[...q.matchAll(/\b(20\d{2})\s+fall\b/g)].map(m=>m[1]);
 const saturday=[...q.matchAll(/\b(\d{2})\/(\d{2})\s+saturday(?:\s+season)?\b/g)];
 const season=fall.length?{kind:'fall',year:fall[0],label:`${fall[0]} Fall Season`}:saturday.length?{kind:'saturday',year:`20${saturday[0][1]}`,label:`${saturday[0][1]}/${saturday[0][2]} Saturday Season`}:null;
 const conflict=new Set(fall).size>1||fall.length>0&&saturday.length>0||saturday.some(m=>Number(m[2])!==Number(m[1])+1)||season?.kind==='fall'&&leagues.includes('saturday')||season?.kind==='saturday'&&leagues.some(l=>l!=='saturday');
 const registration=/\b(?:register|registration|sign up|signing up)\b/.test(q);
 const procedure=/\bhow\b|\bstep.by.step\b|\binstructions\b|\bwhat\b.*\bneeds?\b.*\bdo\b/.test(q);
 const mixed=/\b(?:and|also)\b.*\b(?:my rating|my dupr|registered|ready|next match)\b/.test(q);
 let object=null;
 if(!mixed&&registration&&procedure&&/\b(?:team|captain|it)\b/.test(q))object='team_registration';
 if(!mixed&&/\bschedules?\b/.test(q)&&/\b(?:when|what date)\b/.test(q)&&/\b(?:send|sent|done|coming out|released?|posted|expect|available|captains get)\b/.test(q)&&!/\b(?:create|change|reschedule|next match|already|was|were)\b/.test(q))object='schedule_release';
 return object?{kind:object==='team_registration'?'procedure':'policy_date',object,leagues:leagues.length?leagues:season?.kind==='saturday'?['saturday']:[],season,policyYear:season?.year||q.match(/\b20\d{2}\b/)?.[0]||null,contextConflict:Boolean(conflict),event:object==='schedule_release'?'schedule_release':'registration',matchingQuestion:q}:null;
}

export function registrationStateQuestion(value) {
 const q=String(value||'').toLowerCase();
 return /\bteams?\b/.test(q)&&/\bregistered\b/.test(q)&&/\b(?:is|are|what|which|has|have)\b/.test(q)&&!registrationReleaseIntent(q);
}
