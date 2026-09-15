export function choiceMatch(text,choices=[]) {
 const q=String(text||'').trim().replace(/[?.!]+$/,'').toLowerCase();
 if(/^choice:/.test(q))return choices.find(c=>c.key===q.slice(7))||null;
 if(/^(?:option )?\d{1,2}$/.test(q))return choices[Number(q.replace('option ',''))-1]||null;
 const exact=choices.filter(c=>c.label.toLowerCase().replace(/[?.!]+$/,'')===q);
 if(exact.length===1)return exact[0];
 const words=q.match(/[a-z0-9]+/g)||[];
 if(!words.length)return null;
 const matches=choices.filter(c=>words.every(w=>(c.label.toLowerCase().match(/[a-z0-9]+/g)||[]).includes(w)));
 return matches.length===1?matches[0]:null;
}
export function liveResolvedQuestion(query,data){
 if(['SELF_RATING','PLAYER_RATING'].includes(query.intent)&&data.season){const type=data.rating==='primetime'?'PrimeTime Season DUPR':'Season DUPR';return query.intent==='SELF_RATING'?`What's my ${type} for the ${data.season}?`:`What is ${data.label}'s ${type} for the ${data.season}?`;}
 if(query.intent==='TEAM_ROSTER'&&data.team)return query.projection==='count'?`How many players are on the ${data.team} roster?`:`Who is on the ${data.team} roster?`;
 return null;
}
