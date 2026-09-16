// Derived only from revalidated source text. No clock or league-specific dates.
export function deriveTemporalContext(content,{title='',heading=''}={}) {
  const events=[];
  if(!/dates|calendar|timeline|season|schedule/i.test(`${title} ${heading} ${String(content).split('\n')[0]}`))return events;
  const prefix=String(content).split(/\n(?=[•*–-]?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i)[0];
  const years=text=>[...String(text||'').matchAll(/\b(20\d{2})\b/g)].map(m=>Number(m[1]));
  const headingYears=years(heading),prefixYears=/season|timeline|calendar|dates/i.test(prefix)?years(prefix):[];
  const titleYears=headingYears.length?headingYears:prefixYears.length?prefixYears:years(title);
  let anchor={source:headingYears.length?'section_heading':prefixYears.length?'source_heading':'document_title',calendarYear:titleYears[0]?String(titleYears[0]):null};
  let year=titleYears[0]||null,previousMonth=null,rollovers=0,ambiguous=false;
  const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const pattern=/^(?:[•*–-]\s*)?(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\.?\s+\d{1,2}[^\r\n]*/gmi;
  for(const m of String(content).matchAll(pattern)){
    const month=months.indexOf(m[1].slice(0,3).toLowerCase())+1;
    const explicit=m[0].match(/\b(20\d{2})\b/);
    let derivation='source_heading_year';
    if(explicit){year=Number(explicit[1]);ambiguous=false;derivation='explicit_source_year';anchor={source:'explicit_date_entry',calendarYear:String(year),start:m.index};rollovers=0;}
    else if(previousMonth!==null&&month<previousMonth){
      if(previousMonth>=9&&month<=4&&year&&!ambiguous){year++;rollovers++;}
      else ambiguous=true;
    }
    if(!explicit&&anchor.source==='explicit_date_entry')derivation='preceding_explicit_source_year';
    if(!explicit&&rollovers)derivation='ordered_source_month_rollover';
    events.push({sourceText:m[0],start:m.index,end:m.index+m[0].length,calendarYear:!ambiguous&&year?String(year):null,derivation:ambiguous||!year?'unknown_calendar_year':derivation,anchorYears:titleYears,anchor:{...anchor},rollovers});
    previousMonth=month;
  }
  return events;
}
