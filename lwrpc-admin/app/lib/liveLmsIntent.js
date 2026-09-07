import {PUBLIC_ORGANIZATIONAL_EMAILS} from './publicOrganizationalContacts.js';
// No retrieval, provider, client role, or database dependency belongs in this module.
export const LIVE_CAPABILITIES = Object.freeze(['SELF_RATING','PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH']);
const normalize = value => String(value || '').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
export function liveIntent(question, continuation = null) {
  const text = normalize(question), q = text.toLowerCase();
  const privacyText=q.replace(/[\w.!#$%&'*+/=?^`{|}~+-]+@[\w.-]+\.[a-z]{2,}/gi,email=>PUBLIC_ORGANIZATIONAL_EMAILS.includes(email)?'':email);
  const result = (intent, extra={}) => ({intent,...extra});

  // Public procedural guidance and policy stay on the accepted document path.
  if (/\b(reset|forgot|change)\b.*\bpassword\b|\b(how do i|how can i) (sign in|log in|update my roster|enter match scores)\b/.test(q) && !/\b(token|someone|their)\b|@/.test(q)) return null;
  if (/\b(all|every|export|list of)\b.*\b(emails?|members?|ratings?)\b|@|\b(dob|date of birth|password|tokens?|private notes|payments?|credit card|phone number|auth id)\b/.test(privacyText)) return result('UNSUPPORTED');
  // Strip only the request wrapper, not the subject of the requested field.
  const core=text.replace(/^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:tell|show)\s+(?:me\s+)?/i,'');
  const possessive=core.match(/^(?:(?:what|when)(?:'s| is| was)\s+)?(.+?)'s\s+(?:(?:season|primetime|prime time|current|official|next|upcoming|team)\s+)*(?:dupr|rating|email|team|division|roster|match)\b/i);
  const fieldFor=core.match(/^(?:what(?:'s| is| was)\s+)?(?:the\s+)?(?:email(?: address)?|(?:(?:season|primetime|prime time)\s+)?(?:dupr|rating))\s+(?:for|of)\s+(.+?)[?.!]*$/i);
  const teamPerson=core.match(/\b(?:what|which)\s+(?:team|division)\s+(.+?)\s+is\s+(?:on|in)[?.!]*$/i);
  const invertedTeamPerson=core.match(/\b(?:what|which)\s+(?:team|division)\s+is\s+(.+?)\s+(?:on|in)[?.!]*$/i);
  const candidate=normalize(possessive?.[1]||fieldFor?.[1]||teamPerson?.[1]||invertedTeamPerson?.[1]).replace(/[?.!]+$/,'');
  const name=/^(?:my|me|i|our|we|he|she|they|his|her|their)$/i.test(candidate)?'':candidate;
  const selfField=/\b(?:my|our)\s+(?:(?:season|primetime|prime time|current|official|next|upcoming|team)\s+)*(?:dupr|rating|email|team|division|roster|match)\b/i.test(text)
    || /\b(?:team|division)\s+(?:am i|are we|i am|i'm|we are|we're)\s+(?:on|in)\b/i.test(text);
  const referential=/\b(?:he|she|his|her|their|they|that player|that team|this team)\b/.test(q);
  const ambiguous=(Boolean(name)&&selfField)||((selfField||name)&&/\b(?:and|with|or)\s+(?:[^?.!]+?'s|mine|me)(?:[?.!]|$)/i.test(text))||(/\b(?:compare|versus|vs)\b/.test(q)&&/\b(?:rating|dupr|team|email)\b/.test(q))
    || Boolean(name&&/\b(?:and|or)\b/i.test(name));
  const subjectKind=ambiguous?'AMBIGUOUS':name?'EXPLICIT_PERSON':selfField?'SELF':referential?'FOLLOWUP_REFERENT':'NONE';
  if(ambiguous)return result('UNSUPPORTED',{subjectKind});
  const self=subjectKind==='SELF';
  const personal = self || Boolean(name) || referential;
  if (personal && /\b(and|also)\b.*\b(rule|allowed|eligible|maximum|limit|policy|email|rating|dupr)\b/.test(q))return result('UNSUPPORTED');
  if (personal && /\b(last season|previous|historical|eligible|eligibility)\b|\bcan .+ (play|join)\b/.test(q)) return result('UNSUPPORTED');
  if (continuation && /^(?:option )?[1-5]$/.test(q)) return {...continuation.query,continueContext:true,choice:Number(q.replace('option ',''))};
  if (continuation && /^(?:next|more)(?: players| page)?$/.test(q) && (continuation.moreChoices || continuation.intent==='TEAM_ROSTER')) return {...continuation.query,continueContext:true,...(continuation.moreChoices?{nextChoices:true}:{nextPage:true})};
  if (continuation && /^(?:season dupr|primetime(?: season)? dupr|prime time(?: season)? dupr|current dupr)[?.!]*$/.test(q)) return {...continuation.query,continueContext:true,rating: /current/.test(q)?'unsupported':/prime/.test(q)?'primetime':'season'};
  const teamMatch=text.match(/(?:roster|next match)\s+(?:for|of)\s+(.+?)[?.!]*$/i)||text.match(/^show (?:me )?(?:the )?(.+?) roster[?.!]*$/i);
  const teamName=!name&&teamMatch&&!/^(my|our|the team|team)$/i.test(teamMatch[1])?normalize(teamMatch[1]).replace(/[?.!]+$/,''):null;
  const subject = {subjectKind,...(name?{name}:subjectKind==='FOLLOWUP_REFERENT'?{useSubject:true}:{} )};
  if (personal && /\b(dupr|rating)\b/.test(q)) {
    const rating = /\b(current|official|imported)\b/.test(q)?'unsupported':/\bprime\s*time\b/.test(q)?'primetime':/\bseason\b/.test(q)?'season':'clarify';
    return result(self?'SELF_RATING':'PLAYER_RATING',{...subject,rating});
  }
  if (personal && /\bemail\b/.test(q)) return result('PLAYER_CONTACT',{...subject,...(self?{self:true}:{})});
  if (/\b(next|upcoming)\b/.test(q) && /\b(match|playing|opponent|game)\b/.test(q)) return result('NEXT_MATCH',{...subject,...(teamName?{teamName}:{})});
  if ((personal || /\bshow\b/.test(q)) && /\broster\b/.test(q) && !/\b(how|rule|maximum|limit|add|update)\b/.test(q)) return result('TEAM_ROSTER',{...subject,...(teamName?{teamName}:{})});
  if (personal && /\b(team|division)\b/.test(q) && /\b(on|in|which|what|name)\b/.test(q) && !/\b(rule|allowed|how many)\b/.test(q)) return result('SELF_TEAM',{...subject,...(self?{self:true}:{})});
  if (/\b(show|list|what|who|when)\b.*\b(my|our|their|his|her)\b.*\b(ratings?|emails?|schedule|lineups?|standings|account status)\b/.test(q))return result('UNSUPPORTED');
  // An unresolved personal request must never become a document/model lookup.
  if (referential && continuation || /\bmy (?:account|rating|dupr|team|roster|match|schedule|email)\b/.test(q) || name || /[a-z]'s\s+(?:season\s+)?(?:dupr|rating|email)\b/.test(q)) return result('UNSUPPORTED');
  return null;
}

export function liveMessage(data) {
  const messages={denied:"I can't access that player information for your account.",not_found:"I couldn't find that player within the players you're authorized to access.",rate_limited:'Please wait before making another live lookup.',unsupported:'That live lookup is not supported yet. No personal data was retrieved.',no_team:'No current authorized team is available for this lookup.',no_season:'No active season is available for this lookup.',missing:'That requested value is not recorded in the authorized LMS data.',no_match:'No upcoming published match is available for this team.',technical_error:"I couldn't complete the live lookup. Please try again.",ambiguous:'Please choose an authorized context by replying with its number:',rating_clarification:'Do you mean Season DUPR or PrimeTime Season DUPR? Current official DUPR is not available through this live lookup.'};
  if(data.status!=='success') return messages[data.status] || messages.technical_error;
  if(data.intent==='SELF_RATING'||data.intent==='PLAYER_RATING') return `${data.label}'s ${data.rating==='primetime'?'PrimeTime Season DUPR':'Season DUPR'} for ${data.season} is ${data.value}.`;
  if(data.intent==='PLAYER_CONTACT') return `${data.label}'s email address is ${data.value}.`;
  if(data.intent==='SELF_TEAM') return `${data.team} — ${data.division}, ${data.league}, ${data.season}.`;
  if(data.intent==='TEAM_ROSTER') return `${data.team} roster (roster membership, not the match lineup):\n${data.players.map(p=>p.label).join('\n')}${data.more?'\nReply “next” for more players.':''}`;
  if(data.intent==='NEXT_MATCH') return `${data.team}'s next published match is ${data.date}${data.time?` at ${data.time}`:' (time to be determined)'} (${data.timezone}) against ${data.opponent} at ${data.location || 'a location to be determined'}. This does not confirm your personal lineup assignment.`;
  return messages.technical_error;
}
