import {deriveTemporalContext} from './aiTemporalContext.js';
// Official calendar intent/metadata only: no user records, model calls or answer dates.
export function leagueDateIntent(q) {
 if (/\b(?:my|our|his|her|their|next|upcoming|reschedule|change|move|cancel|create|delete)\b/.test(q)) return null;
 if (!/\b(?:when|date|day|begin|start|open|close|end|playoffs?|championship)\b/.test(q)) return null;
 let event=null;
 if (/\bregistration\b|\bregister\b/.test(q)) event=/\b(?:clos\w*|last|deadline|end\w*)\b/.test(q)?'registration_close':/\b(?:open\w*|start\w*|begin\w*)\b/.test(q)?'registration_open':null;
 else if (/\b(?:playoffs?|championships?)\b/.test(q)) event='championship';
 else if (/\b(?:league|season|weekday|saturday|primetime|first.*match)\b/.test(q)) event=/\b(?:end\w*|finish\w*)\b/.test(q)?'season_end':/\b(?:start\w*|begin\w*)\b|\bfirst\b.*\bmatch\b/.test(q)?'season_start':null;
 if (!event || /\b(?:roster|lineup|rating|recorded|calculated|established)\b/.test(q)) return null;
 return {event,gender:/\bwom[ae]n(?:'s)?\b/.test(q)?'women':/\bmen(?:'s)?\b/.test(q)?'men':null,category:q.match(/\bdupr\s*(\d{1,2})(?![.\d])\b/)?.[1]||null};
}
export function officialDateEvent(text) {
 if (/schedules?\s+(?:completed and sent|released|published|posted|sent)/i.test(text)) return 'schedule_release';
 if (/open registration/i.test(text)) return 'registration_open';
 if (/last day to register/i.test(text)) return 'registration_close';
 if (/championship|playo(?:ff|ư)s/i.test(text)) return 'championship';
 if (/end of regular season|regular season ends/i.test(text)) return 'season_end';
 if (/(?:season|league) starts/i.test(text)) return 'season_start';
 return null;
}
// The source's chronological bullet list, not today's date, grounds a year rollover.
export function officialDatePeriod(content,start,period) {
 const result={seasonLabel:period?.seasonLabel||'',calendarYear:null,derivation:'unknown_calendar_year'};
 const event=deriveTemporalContext(content,{title:period?.seasonLabel||'',heading:content.split('\n')[0]}).find(e=>e.start===start);
 if(!event?.calendarYear)return result;
 return {...result,calendarYear:event.calendarYear,derivation:event.derivation==='ordered_source_month_rollover'?'active_title_and_ordered_month_rollover':event.derivation==='source_heading_year'?'revalidated_active_document_title':event.derivation};
}
