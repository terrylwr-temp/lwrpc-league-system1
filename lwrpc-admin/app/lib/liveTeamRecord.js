// Dynamic competition facts never fall through to document retrieval.
export function teamRecordIntent(text) {
 const q=String(text||'').normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase().trim();
 if (/\bhow (?:are|is|do|does)\b.*\b(?:calculated|calculate|broken|break|receive|awarded|determined)\b/.test(q) || /\b(?:rules?|policy)\b/.test(q)) return null;
 const personal=/\b(?:my|our|we|us)\b/.test(q);
 const rank=/\b(?:rank(?:ed|ing)?|place)\b/.test(q) || /\bstandings\b/.test(q) && !/\b(?:points|record|won|lost|played)\b/.test(q);
 const why=/^why\b/.test(q)&&/\b(?:behind|rank(?:ed)?|place|same.*wins)\b/.test(q);
 if(why || rank && (personal||/\b(?:who|first|second|third|team)\b/.test(q)))return {intent:'RANK_DEFERRED'};
 const named=q.match(/^(?:what is|what's|show(?: me)?)\s+(.+?)'s\s+record(?:\s+(?:for|in|during)\b.*)?[?.!]*$/);
 const record=/\brecord\b/.test(q), count=/\bmatches\b.*\b(?:played|won|lost)\b/.test(q), points=/\bpoints\b/.test(q);
 if(!(personal||named) || !(record||count||points))return null;
 const projection=count?(/\bwon\b/.test(q)?'wins':/\blost\b/.test(q)?'losses':'played'):points?'points':'record';
 const result={intent:'TEAM_RECORD',subjectKind:'SELF',self:true,projection};
 if(named&&!/^(?:my team|our team|my|our)$/.test(named[1])){result.teamName=named[1];result.self=false;result.subjectKind='NONE';}
 // Explicit historical wording must not quietly select a current team.
 const season=q.match(/\b(?:for|in|during)\s+(?:the\s+)?([^?.!]+\bseason)\b/);
 if(/\b(?:last|previous|historical)\s+season\b/.test(q))result.seasonName='__clarify_history__';
 else if(season&&!/^(?:this|current) season$/.test(season[1]))result.seasonName=season[1];
 const scope=q.match(/\b(?:in|for)\s+(?:the\s+)?(?:division|league)\s+([^?.!]+?)(?:\s+(?:for|in|during)\b|[?.!]|$)/);
 if(scope)result.scopeName=scope[1].trim();
 return result;
}

export function teamRecordMessage(data,query) {
 if(query.intent==='RANK_DEFERRED')return "I can give you your team's record and standings points, but current place and ranking explanations aren't available through Ask LWR yet.";
 if(query.intent!=='TEAM_RECORD')return null;
 if(data.status==='no_team')return "I couldn't find an applicable team linked to your LMS account.";
 if(data.status==='denied'||data.status==='not_found')return "I couldn't resolve an authorized team record for this request.";
 if(data.status==='missing')return 'A standings record is not available for this team yet.';
 if(data.status!=='success')return null;
 const fields=['wins','losses','ties','played','points'];
 if(!fields.every(k=>typeof data[k]==='number'&&Number.isFinite(data[k])&&data[k]>=0) || !fields.slice(0,4).every(k=>Number.isInteger(data[k])))return "I couldn't verify this team's record. Please contact League Management.";
 const context=`${data.team} — ${data.division}, ${data.league}, ${data.season}`;
 const values={wins:`${data.wins} matchups won`,losses:`${data.losses} matchups lost`,played:`${data.played} matchups played`,points:`${data.points} standings points`,record:`${data.wins}–${data.losses}${data.ties?`–${data.ties}`:''} (${data.played} matchups played), ${data.points} standings points`};
 return `${context}: ${values[query.projection]||values.record}.`;
}
