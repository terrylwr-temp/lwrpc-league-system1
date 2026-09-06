// Matcher-only annotations. Never use this view for persistence, embeddings or display.
export const INTERPRETATION_POLICY = "lms0720-v1";
const TERMS = ['using','playing','volley','damaged','cracked','broken','roster','lineup','community','season','medical','saturday','weekday','primetime'];
const COMPETITORS = [...TERMS, 'placing'];
const EXACT = new Set([...COMPETITORS, 'step','stop','play','rose','nr','dupr','rooster','roaster','foster','medial','valley','broker','damages','cranked','weekdays','seasons']);
const LEAGUES = new Set(['saturday','weekday','primetime']);

function distance(a,b) {
  if (Math.abs(a.length-b.length)>1) return 2;
  const rows=Array.from({length:a.length+1},(_,i)=>Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) {
    rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+Number(a[i-1]!==b[j-1]));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
  }
  return rows[a.length][b.length];
}
function support(term,text,leagueChoice) {
  if(LEAGUES.has(term)) return leagueChoice ? 'signed_league_choice' : /\bleague\b|\bwhen\s+(?:does|do|will|can)\b.*\b(?:start|begin|open|add|record)/i.test(text) ? 'league_timing' : '';
  if(['using','playing'].includes(term)) return /\bballs?\b/i.test(text)&&/\b(?:what|which|kind)\b/i.test(text) ? 'equipment_question' : '';
  if(term==='volley') return /\b(?:kitchen|nvz|non.volley zone)\b/i.test(text) ? 'nvz_context' : '';
  if(['damaged','cracked','broken'].includes(term)) return /\bball\b/i.test(text)&&/\b(?:if|happens|during|rally|point)\b/i.test(text) ? 'ball_condition' : '';
  if(term==='community') return /\b(?:join|play|team|registered|assigned|affiliated)\b/i.test(text) ? 'community_rule_or_affiliation' : '';
  if(term==='roster') return /\b(?:add|enter|update|remove)\b/i.test(text) ? 'roster_action' : '';
  if(term==='lineup') return /\b(?:submit|enter|setup|exchange)\b/i.test(text) ? 'lineup_action' : '';
  if(term==='season') return /\bdupr\b/i.test(text) ? 'season_dupr' : '';
  if(term==='medical') return /\bissue\b/i.test(text)&&/\b(?:match|game|play)\b/i.test(text) ? 'medical_match' : '';
  return '';
}
export function interpretQuestion(value,{leagueChoice=false}={}) {
  const original=String(value||'');
  const annotations=[];
  const protectedSpans=[...original.matchAll(/(?:https?:\/\/|www\.)\S+|\S+@\S+|\b\S*\d\S*|\b(?:team|community|member|player|location)\s+(?:named|called)\s+[^?!.;,]+|["“][^"”]+["”]/gi)].map(m=>[m.index,m.index+m[0].length]);
  for (const match of original.matchAll(/\b(?:ID|UUID)\s*[:=/-]\s*[a-z0-9_-]+/gi)) protectedSpans.push([match.index, match.index+match[0].length]);
  // A capitalized person in an eligibility/action construction is not rule vocabulary.
  for (const match of original.matchAll(/\b(?:Is|Does|Can|is|does|can)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}(?=\s+(?:eligible|registered|join|play)\b)/g)) protectedSpans.push([match.index,match.index+match[0].length]);
  // Stop pathological input from turning a bounded vocabulary into unbounded work.
  for(const match of original.slice(0,2400).matchAll(/\b[a-zA-Z]+\b/g)) {
    const token=match[0], word=token.toLowerCase(), start=match.index, end=start+token.length;
    if(annotations.length===4) break;
    if(word.length<4||word.length>24||EXACT.has(word)||/^[A-Z]{2,}$/.test(token)||protectedSpans.some(([a,b])=>start<b&&end>a)) continue;
    const candidates=COMPETITORS.filter(term=>distance(word,term)===1);
    if(candidates.length!==1||!TERMS.includes(candidates[0])) continue;
    const canonical=candidates[0], context=support(canonical,original,leagueChoice);
    if(!context) continue;
    annotations.push(Object.freeze({originalToken:token,start,end,canonical,editDistance:1,context,confidence:'unique_edit_1_with_context',policyVersion:INTERPRETATION_POLICY}));
  }
  let matchingView=original;
  for(const a of [...annotations].reverse()) matchingView=matchingView.slice(0,a.start)+a.canonical+matchingView.slice(a.end);
  return Object.freeze({policyVersion:INTERPRETATION_POLICY,annotations:Object.freeze(annotations),matchingView});
}
export function matchingQuestion(question,options) { return interpretQuestion(question,options).matchingView; }

// Only the validated resolver calls this; descriptors are never read from request bodies.
export function medicalScoreContext(subject,current) {
  const inherited=matchingQuestion(subject);
  const subjectWords = new Set('what happens if a player has medical issue during match game and cannot can t finish complete someone got hurt halfway through the do we injury injured unable to play with'.split(' '));
  if(!/\b(?:medical issue|injury|injured|hurt)\b/i.test(inherited) || !/\b(?:match|game)\b/i.test(inherited)
    || (inherited.toLowerCase().match(/[a-z0-9]+/g)||[]).some(word=>!subjectWords.has(word))) return null;
  const score=String(current).match(/^what (?:if|happens if) (one team|either team|both teams|neither team) (?:has|have|reaches?|has reached|have reached) (\d{1,3}) points?[?.!]*$/i);
  if(!score) return null;
  return Object.freeze({kind:'medical_score_condition',subject:inherited,teamCondition:score[1].toLowerCase(),score:Number(score[2])});
}
