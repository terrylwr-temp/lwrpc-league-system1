-- Ask LWR Pickleball AI — Stage 3 hybrid retrieval
-- Apply after the Stage 1 / Stage 2 scripts. This creates no tables and does
-- not alter PDF storage or document/version status.

create or replace function public.search_ai_official_chunks(
  p_query_embedding extensions.vector(1536),
  p_query_text text,
  p_ask_about text default 'all',
  p_current_path text default null,
  p_feature_module text default null,
  p_season_id uuid default null,
  p_league_id uuid default null,
  p_division_id uuid default null,
  p_team_id uuid default null,
  p_user_role text default null,
  p_limit integer default 32
)
returns table (
  chunk_id uuid, document_id uuid, document_version_id uuid,
  document_title text, document_type text, document_authority_rank smallint,
  document_scope_kind text, page_number integer, section_label text,
  heading text, rule_number text, content text,
  semantic_score double precision, keyword_score double precision,
  exact_score double precision, authority_score double precision,
  context_score double precision, combined_score double precision,
  vector_rank integer, keyword_rank integer, exact_match boolean
)
language sql
security invoker
set search_path = public, extensions, pg_temp
as $$
  with normalized_input as (
    select
      left(trim(coalesce(p_query_text, '')), 1000) as query_text,
      lower(left(trim(coalesce(p_query_text, '')), 1000)) as query_lower,
      lower(coalesce(nullif(trim(p_ask_about), ''), 'all')) as ask_about,
      lower(left(trim(coalesce(p_current_path, '')), 240)) as current_path,
      lower(left(trim(coalesce(p_feature_module, '')), 120)) as feature_module,
      lower(left(trim(coalesce(p_user_role, '')), 40)) as user_role,
      coalesce((regexp_match(lower(coalesce(p_query_text, '')), '\m(?:rule\s*)?([0-9]+(?:\.[0-9]+)+)\M'))[1], '') as requested_rule,
      -- websearch_to_tsquery joins ordinary input terms with AND. Remove
      -- generic question framing before constructing the keyword query so a
      -- natural-language prompt searches its subject terms rather than also
      -- requiring an unrelated intent word from the question.
      trim(regexp_replace(
        left(trim(coalesce(p_query_text, '')), 1000),
        '\m(?:what|which|who|when|where|why|how|does|do|did|is|are|was|were|can|could|would|should|will|mean|meaning|work|works|requirement|requirements|explain|explained|tell|show|say|says|define|definition|describe|described|please|someone|somebody|anyone|anybody|we|us|our|i|me|my|you|your|they|them|their|he|she|it|this|that|got|get|gets|halfway|through|then|just|really|t|game|games|match|matches|type|kind|using|use|used|brand|playing|need|must|required|deadline|due|latest|early|long|before)\M',
        ' ',
        'gi'
      )) as keyword_query_text,
      greatest(16, least(coalesce(p_limit, 32), 80)) as candidate_limit
  ),
  input as (
    select ni.*,
      websearch_to_tsquery('english', coalesce(nullif(ni.keyword_query_text, ''), ni.query_text)) as keyword_ts_query,
      (
        ni.query_lower ~ '\m(?:injur(?:y|ed|ies)?|hurt|medical|illness|emergency|cannot|unable|can''?t|won''?t|stop(?:ped|ping)?|quit|leave)\M'
        and ni.query_lower ~ '\m(?:players?|participants?|teams?|games?|match(?:es)?|play(?:ing)?|finish|continue|complete)\M'
      ) as continuation_intent,
      (
        ni.query_lower ~ '\m(?:when|deadline|due|latest|early)\M'
        or ni.query_lower ~ '\mhow\s+(?:early|long\s+before|many\s+(?:days?|hours?|weeks?)\s+before)\M'
        or ni.query_lower ~ '\m(?:need|must|required)\s+(?:to\s+)?(?:be\s+)?(?:completed|submitted|done)\M'
      ) as deadline_intent,
      (
        ni.query_lower ~ '\mhow\s+(?:do|can|to)\M'
        or ni.query_lower ~ '\mwhere\s+(?:do|can)\M'
        or ni.query_lower ~ '\mwhat\s+(?:button|screen)\M'
      ) as procedural_intent,
      (
        ni.query_lower ~ '\m(?:team|season|league|rosters?)\M'
        and (ni.query_lower ~ '\m(?:add|remove|delete|drop|update|change|lock|open|close)\M' or ni.query_lower ~ '\m(?:when|deadline|due|date|dates|latest|early)\M')
      ) as team_roster_management_intent,
      -- Match Setup requires a match-specific signal; roster alone is not one.
      (
        ni.query_lower ~ '\m(?:match|game|match\s+setup|(?:starting\s+)?lineups?|player\s+pairings?)\M'
        and (
          ni.query_lower ~ '\m(?:when|deadline|due|latest|early)\M'
          or ni.query_lower ~ '\mhow\s+(?:do|can|to)\M'
          or ni.query_lower ~ '\m(?:enter|submit|set|save|complete|change|assign)\M'
        )
      ) as individual_match_setup_intent,
      (
        (
          ni.query_lower ~ '\m(?:yell|insult|swear|curse|verbal(?:ly)?\s+abus(?:e|ive)|harass(?:ment)?|threaten|taunt|mock|disrespect(?:ful)?|profan(?:e|ity))\M'
          and ni.query_lower ~ '\m(?:another\s+)?(?:player|opponent|partner|member|captain|spectator|someone|anyone)\M'
        )
        or ni.query_lower ~ '\mtrash\s+talk(?:ing)?\M'
        or ni.query_lower ~ '\m(?:sportsmanship|conduct)\M'
        or (
          ni.query_lower ~ '\mthrow(?:ing)?\s+(?:my\s+|a\s+)?paddle\M'
          and ni.query_lower ~ '\m(?:angry|anger)\M'
        )
      ) as conduct_intent
    from normalized_input ni
  ),
  retrieval_expansions as (
    -- This is generic interruption/continuation normalization, not a
    -- document-specific synonym: it gives lexical retrieval the canonical
    -- form used by rules that describe a participant being unable to finish.
    select i.*, case when i.continuation_intent then phraseto_tsquery('english', 'cannot complete') else null::tsquery end as continuation_ts_query
    from input i
  ),
  eligible as (
    select c.id as chunk_id, c.document_version_id, c.page_number, c.section_label,
      c.heading, c.rule_number, c.content, c.search_vector, c.embedding,
      d.id as document_id, d.title as document_title, d.document_type,
      d.authority_rank as document_authority_rank, d.scope_kind as document_scope_kind,
      d.league_id as document_league_id, d.division_id as document_division_id,
      d.season_id as document_season_id,
      lower(concat_ws(' ', c.section_label, c.heading, c.rule_number, c.content)) as searchable_text
    from public.ai_document_chunks c
    join public.ai_document_versions v on v.id = c.document_version_id
    join public.ai_documents d on d.id = v.document_id
    where d.status = 'active'
      and d.active_version_id = v.id
      and v.processing_status = 'ready'
      and c.is_searchable
      and c.embedding is not null
  ),
  team_context as (
    -- Documents are scoped no more narrowly than division. Resolve a supplied
    -- team only to its existing division/league/season for a soft score.
    select t.division_id, d.league_id, l.season_id
    from public.teams t
    join public.divisions d on d.id = t.division_id
    join public.leagues l on l.id = d.league_id
    where t.id = p_team_id
    limit 1
  ),
  vector_candidates as (
    select e.chunk_id, row_number() over (order by e.embedding <=> p_query_embedding) as vector_rank
    from eligible e order by e.embedding <=> p_query_embedding
    limit (select candidate_limit from input)
  ),
  keyword_candidates as (
    select e.chunk_id,
      row_number() over (order by greatest(ts_rank_cd(e.search_vector, i.keyword_ts_query), coalesce(ts_rank_cd(e.search_vector, i.continuation_ts_query), 0::real)) desc, e.chunk_id) as keyword_rank
    from eligible e cross join retrieval_expansions i
    where e.search_vector @@ i.keyword_ts_query
      or (i.continuation_intent and e.search_vector @@ i.continuation_ts_query)
    order by greatest(ts_rank_cd(e.search_vector, i.keyword_ts_query), coalesce(ts_rank_cd(e.search_vector, i.continuation_ts_query), 0::real)) desc, e.chunk_id
    limit (select candidate_limit from input)
  ),
  query_tokens as (
    select token, ordinal_position,
      (
        token not in ('team', 'teams', 'player', 'players', 'game', 'games', 'league', 'leagues', 'match', 'matches', 'score', 'scores', 'rule', 'rules', 'guide', 'guides', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'does', 'do', 'did', 'is', 'are', 'was', 'were', 'can', 'could', 'would', 'should', 'will', 'mean', 'meaning', 'work', 'works', 'requirement', 'requirements', 'explain', 'explained', 'tell', 'show', 'say', 'says', 'define', 'definition', 'describe', 'described', 'please', 'someone', 'somebody', 'anyone', 'anybody', 'another', 'we', 'us', 'our', 'i', 'me', 'my', 'you', 'your', 'they', 'them', 'their', 'he', 'she', 'it', 'this', 'that', 'got', 'get', 'gets', 'halfway', 'through', 'then', 'just', 'really', 't', 'type', 'kind', 'using', 'use', 'used', 'brand', 'playing')
        and to_tsvector('english', token) <> ''::tsvector
      ) as is_distinctive
    from input i
    cross join lateral regexp_split_to_table(i.query_lower, '[^[:alnum:]]+') with ordinality as token_parts(token, ordinal_position)
    where token <> ''
  ),
  token_windows as (
    select token as token_1, lead(token, 1) over (order by ordinal_position) as token_2,
      lead(token, 2) over (order by ordinal_position) as token_3,
      lead(token, 3) over (order by ordinal_position) as token_4,
      is_distinctive as distinctive_1, lead(is_distinctive, 1) over (order by ordinal_position) as distinctive_2,
      lead(is_distinctive, 2) over (order by ordinal_position) as distinctive_3,
      lead(is_distinctive, 3) over (order by ordinal_position) as distinctive_4
    from query_tokens
  ),
  phrase_candidates as (
    select concat_ws(' ', token_1, token_2) as phrase, (distinctive_1::integer + distinctive_2::integer) as distinctive_count, 2 as word_count
    from token_windows where token_2 is not null
    union all
    select concat_ws(' ', token_1, token_2, token_3), (distinctive_1::integer + distinctive_2::integer + distinctive_3::integer), 3
    from token_windows where token_3 is not null
    union all
    select concat_ws(' ', token_1, token_2, token_3, token_4), (distinctive_1::integer + distinctive_2::integer + distinctive_3::integer + distinctive_4::integer), 4
    from token_windows where token_4 is not null
  ),
  phrase_terms as (
    -- Phrase text is assembled only from alphanumeric query tokens, so this
    -- boundary-aware regex has no user-controlled regex operators.
    select phrase
    from (
      select distinct phrase, distinctive_count, word_count
      from phrase_candidates
      where distinctive_count >= 1 and char_length(phrase) >= 8
    ) phrases
    order by word_count, distinctive_count desc, char_length(phrase), phrase
    limit 32
  ),
  official_term_candidates as (
    -- A lone word is exact evidence only when the document itself presents it
    -- as a heading, section label, or parenthetical official outcome label.
    -- Ordinary prose words such as “someone” and “finish” never receive this
    -- boost solely because of their length.
    select distinct term, regexp_replace(term, 's$', '') as label_term
    from (
      select token as term
      from query_tokens
      where is_distinctive and char_length(token) >= 4
      union
      -- Let a compound question word identify a labeled component, such as a
      -- label word embedded at the end of a longer compound. This remains
      -- bounded and is only useful when the document presents that component
      -- structurally as a heading or label.
      select right(token, suffix_length) as term
      from query_tokens
      cross join lateral generate_series(4, least(8, char_length(token) - 4)) as suffixes(suffix_length)
      where is_distinctive and char_length(token) >= 8
    ) terms
    limit 16
  ),
  acronym_terms as (
    -- Acronyms are matched at word boundaries. Preserve NR even when typed
    -- in lower case; other acronyms are detected from uppercase query text.
    select distinct lower(acronym_match.parts[1]) as term
    from input i cross join lateral regexp_matches(i.query_text, '\m([A-Z][A-Z0-9]{1,9})\M', 'g') as acronym_match(parts)
    union
    select 'nr' from input where query_lower ~ '\mnr\M'
  ),
  match_configuration_concept as (
    -- The expansion is document-grounded: an active official chunk must
    -- explicitly establish the relationship between Match Setup and a match
    -- configuration term. A remaining distinctive query word that appears in
    -- no eligible official chunk blocks the expansion (for example, an
    -- out-of-domain sport-specific lineup question).
    select i.*,
      i.individual_match_setup_intent
      and not i.team_roster_management_intent
      and exists (
        select 1 from eligible bridge
        where bridge.searchable_text ~ '\mmatch\s+setup\M'
          and bridge.searchable_text ~ '\m(?:lineups?|rosters?|pairings?)\M'
      )
      and not exists (
        select 1 from query_tokens qt
        where qt.is_distinctive
          and qt.token not in ('match', 'game', 'lineup', 'lineups', 'pairing', 'pairings', 'starting', 'enter', 'submit', 'set', 'save', 'complete', 'change', 'assign')
          and not exists (select 1 from eligible vocabulary where vocabulary.searchable_text ~ ('\m' || qt.token || '\M'))
      ) as match_configuration_concept_enabled
    from retrieval_expansions i
  ),
  team_roster_management_concept as (
    -- The official corpus must contain an explicit roster-management bridge;
    -- this does not depend on a particular document title or date.
    select i.*,
      i.team_roster_management_intent
      and exists (
        select 1 from eligible bridge
        where bridge.searchable_text ~ '\m(?:add|remove|delete|drop|update|change|lock|open|close)\M'
          and bridge.searchable_text ~ '\m(?:player|players|team|rosters?)\M'
      ) as team_roster_management_enabled
    from match_configuration_concept i
  ),
  exact_candidates as (
    select e.chunk_id from eligible e cross join input i
    where i.requested_rule <> '' and lower(coalesce(e.rule_number, '')) = i.requested_rule
    union
    select e.chunk_id from eligible e join acronym_terms a on e.searchable_text ~ ('\m' || a.term || '\M')
    union
    select e.chunk_id from eligible e join phrase_terms p on e.searchable_text ~ ('\m' || replace(p.phrase, ' ', '\s+') || '\M')
    union
    select e.chunk_id from eligible e join official_term_candidates t on (
      lower(coalesce(e.section_label, '')) ~ ('\m' || t.label_term || 's?\M')
      or lower(coalesce(e.heading, '')) ~ ('\m' || t.label_term || 's?\M')
      or e.content ~* ('\(\s*' || t.label_term || 's?\s*\)')
      or e.content ~* ('\m' || t.label_term || 's?\M[^:\r\n]{0,60}:')
    )
    union
    select e.chunk_id from eligible e cross join retrieval_expansions i
    where i.continuation_intent and e.searchable_text ~ '\mcannot\s+complete\M'
  ),
  intent_candidates as (
    -- Intent evidence is considered only when a meaningful phrase from the
    -- question is also present. This prevents a generic timing or procedure
    -- word from pulling unrelated rules or guides into the candidate set.
    select e.chunk_id
    from eligible e cross join retrieval_expansions i
    where exists (
      select 1 from phrase_terms p
      where e.searchable_text ~ ('\m' || replace(p.phrase, ' ', '\s+') || '\M')
    )
      and (
        (i.deadline_intent and (
          e.searchable_text ~ '\mno\s+later\s+than\M.{0,60}\m(?:days?|hours?|weeks?)\M'
          or e.searchable_text ~ '\mat\s+least\M.{0,60}\m(?:days?|hours?|weeks?)\M'
          or e.searchable_text ~ '\mwithin\M.{0,60}\m(?:days?|hours?|weeks?)\M'
          or e.searchable_text ~ '\m(?:deadline|due)\M'
          or e.searchable_text ~ '\m(?:before|prior\s+to)\s+(?:the\s+)?(?:scheduled\s+)?(?:match|match\s+date|date)\M'
        ))
        or (i.procedural_intent and e.searchable_text ~ '\m(?:click|button|select|enter|save|screen|dashboard|step(?:s)?|dropdown)\M')
        or (i.conduct_intent
          and e.searchable_text ~ '\m(?:respect|respectful|sportsmanship|conduct|decorum|behavior)\M'
          and (
            e.searchable_text ~ '\m(?:trash\s+talk|profanity|aggressive|abusive|harass(?:ment)?|paddle\s+throwing)\M'
            or (
              e.searchable_text ~ '\m(?:avoid|prohibit(?:ed|ion)?|not\s+(?:be\s+)?tolerated|violation|disciplin(?:ary|e)|must|shall)\M'
              and e.searchable_text ~ '\m(?:players?|opponents?|partners?|members?|captains?|spectators?)\M'
            )
          ))
      )
  ),
  terminology_candidates as (
    select e.chunk_id
    from eligible e cross join match_configuration_concept i
    where i.match_configuration_concept_enabled
      and e.searchable_text ~ '\mmatch\s+setup\M'
      and e.searchable_text ~ '\m(?:lineups?|rosters?|pairings?)\M'
  ),
  team_roster_candidates as (
    select e.chunk_id
    from eligible e cross join team_roster_management_concept i
    where i.team_roster_management_enabled
      and e.searchable_text ~ '\m(?:add|remove|delete|drop|update|change|lock|open|close)\M'
      and e.searchable_text ~ '\m(?:player|players|team|rosters?)\M'
  ),
  candidate_ids as (
    select chunk_id from vector_candidates
    union select chunk_id from keyword_candidates
    union select chunk_id from exact_candidates
    union select chunk_id from intent_candidates
    union select chunk_id from terminology_candidates
    union select chunk_id from team_roster_candidates
  ),
  base_scores as (
    select e.*, vc.vector_rank, kc.keyword_rank, i.*,
      greatest(0::double precision, least(1::double precision, 1 - (e.embedding <=> p_query_embedding))) as semantic_score,
      least(1::double precision, greatest(ts_rank_cd(e.search_vector, i.keyword_ts_query), coalesce(ts_rank_cd(e.search_vector, i.continuation_ts_query), 0::real))::double precision * 2.5) as fts_keyword_score,
      case
        when i.team_roster_management_enabled
          and e.searchable_text ~ '\m(?:add|remove|delete|drop|update|change|lock|open|close)\M'
          and e.searchable_text ~ '\m(?:player|players|team|rosters?)\M'
          and (e.searchable_text ~ '\m(?:date|dates|deadline|due|open|close|lock)\M' or e.searchable_text ~ '\m(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\M')
          then .95::double precision
        -- This is a concept-compatibility keyword signal, not an exact match:
        -- the active official corpus itself established Match Setup as the
        -- relevant feature for lineup/roster/pairings questions.
        when i.match_configuration_concept_enabled
          and i.deadline_intent
          and e.searchable_text ~ '\mmatch\s+setup\M'
          and e.searchable_text ~ '\m(?:lineups?|rosters?|pairings?)\M'
          and e.searchable_text ~ '\m(?:no\s+later\s+than|at\s+least|within)\M.{0,60}\m(?:days?|hours?|weeks?)\M'
          then .95::double precision
        when i.match_configuration_concept_enabled
          and i.procedural_intent
          and e.searchable_text ~ '\mmatch\s+setup\M'
          and e.searchable_text ~ '\m(?:lineups?|rosters?|pairings?)\M'
          and e.searchable_text ~ '\m(?:click|button|select|enter|save|screen|dashboard|step(?:s)?|dropdown|assign)\M'
          then .65::double precision
        -- Strong timing language in an enumerated rule is direct requirement
        -- evidence. The question phrase must also occur in the chunk, so this
        -- does not globally prefer Rules documents for every timing question.
        when i.deadline_intent
          and exists (select 1 from phrase_terms p where e.searchable_text ~ ('\m' || replace(p.phrase, ' ', '\s+') || '\M'))
          and e.searchable_text ~ '\m(?:no\s+later\s+than|at\s+least|within)\M.{0,60}\m(?:days?|hours?|weeks?)\M'
          and e.content ~ '\m[0-9]+(?:\.[0-9]+)+\.\s*'
          then .95::double precision
        -- A direct phrase plus a concrete date, duration, or deadline is
        -- strong evidence even when it is presented outside a numbered rule.
        when i.deadline_intent
          and exists (select 1 from phrase_terms p where e.searchable_text ~ ('\m' || replace(p.phrase, ' ', '\s+') || '\M'))
          and (
            e.searchable_text ~ '\m(?:no\s+later\s+than|at\s+least|within)\M.{0,60}\m(?:days?|hours?|weeks?)\M'
            or e.searchable_text ~ '\m(?:deadline|due)\M'
          )
          then .75::double precision
        -- “Before the scheduled match” is useful but less specific than a
        -- concrete deadline, so it receives a smaller corroborating score.
        when i.deadline_intent
          and exists (select 1 from phrase_terms p where e.searchable_text ~ ('\m' || replace(p.phrase, ' ', '\s+') || '\M'))
          and e.searchable_text ~ '\m(?:before|prior\s+to)\s+(?:the\s+)?(?:scheduled\s+)?(?:match|match\s+date|date)\M'
          then .45::double precision
        -- Procedural questions receive a bounded boost from direct phrase
        -- matches in operational instructions, without treating a guide's
        -- authority as a substitute for relevance.
        when i.procedural_intent
          and exists (select 1 from phrase_terms p where e.searchable_text ~ ('\m' || replace(p.phrase, ' ', '\s+') || '\M'))
          and e.searchable_text ~ '\m(?:click|button|select|enter|save|screen|dashboard|step(?:s)?|dropdown)\M'
          then .55::double precision
        -- Interpersonal-conduct questions are corroborated only by a chunk
        -- that states a behavioral standard and a prohibition or concrete
        -- misconduct example. No document title or catalog rank is used here.
        when i.conduct_intent
          and e.searchable_text ~ '\m(?:respect|respectful|sportsmanship|conduct|decorum|behavior)\M'
          and (
            e.searchable_text ~ '\m(?:trash\s+talk|profanity|aggressive|abusive|harass(?:ment)?|paddle\s+throwing)\M'
            or (
              e.searchable_text ~ '\m(?:avoid|prohibit(?:ed|ion)?|not\s+(?:be\s+)?tolerated|violation|disciplin(?:ary|e)|must|shall)\M'
              and e.searchable_text ~ '\m(?:players?|opponents?|partners?|members?|captains?|spectators?)\M'
            )
          )
          then .65::double precision
        else 0::double precision
      end as intent_keyword_score,
      case
        when i.requested_rule <> '' and lower(coalesce(e.rule_number, '')) = i.requested_rule then 1::double precision
        when exists (select 1 from acronym_terms a where e.searchable_text ~ ('\m' || a.term || '\M')) then .95::double precision
        when exists (select 1 from phrase_terms p where e.searchable_text ~ ('\m' || replace(p.phrase, ' ', '\s+') || '\M')) then .85::double precision
        when exists (select 1 from official_term_candidates t where
          lower(coalesce(e.section_label, '')) ~ ('\m' || t.label_term || 's?\M')
          or lower(coalesce(e.heading, '')) ~ ('\m' || t.label_term || 's?\M')
          or e.content ~* ('\(\s*' || t.label_term || 's?\s*\)')
          or e.content ~* ('\m' || t.label_term || 's?\M[^:\r\n]{0,60}:')
        ) then .85::double precision
        when i.continuation_intent and e.searchable_text ~ '\mcannot\s+complete\M' then .85::double precision
        else 0::double precision
      end as exact_score
    from candidate_ids ids
    join eligible e on e.chunk_id = ids.chunk_id
    cross join team_roster_management_concept i
    left join vector_candidates vc on vc.chunk_id = e.chunk_id
    left join keyword_candidates kc on kc.chunk_id = e.chunk_id
  ),
  weighted_scores as (
    -- Keep the published hybrid weights unchanged. Intent compatibility is a
    -- conservative keyword-relevance signal, not an additional weight.
    select b.*, greatest(b.fts_keyword_score, b.intent_keyword_score) as keyword_score
    from base_scores b
  ),
  scored as (
    select b.*,
      -- Catalog authority matters only in proportion to direct subject relevance.
      ((100 - b.document_authority_rank)::double precision / 99)
        * greatest(b.keyword_score, b.exact_score, b.semantic_score * .75) as authority_score,
      least(1::double precision,
        (case
          when b.ask_about = 'lms_help' and b.document_scope_kind = 'lms_help' then .70
          when b.ask_about = 'weekday' and b.searchable_text like '%weekday%' then .70
          when b.ask_about = 'saturday' and b.searchable_text like '%saturday%' then .70
          when b.ask_about = 'primetime' and b.searchable_text like '%primetime%' then .70
          else 0 end)
        + (case when p_league_id is not null and b.document_league_id = p_league_id then .25 else 0 end)
        + (case when p_division_id is not null and b.document_division_id = p_division_id then .25 else 0 end)
        + (case when p_season_id is not null and b.document_season_id = p_season_id then .15 else 0 end)
        + (case when tc.division_id is not null and b.document_division_id = tc.division_id then .20 else 0 end)
        + (case when tc.league_id is not null and b.document_league_id = tc.league_id then .15 else 0 end)
        + (case when tc.season_id is not null and b.document_season_id = tc.season_id then .10 else 0 end)
        + (case when b.feature_module <> '' and b.searchable_text like '%' || b.feature_module || '%' then .15 else 0 end)
        + (case when b.current_path <> '' and b.searchable_text like '%' || b.current_path || '%' then .10 else 0 end)
        + (case when b.user_role <> '' and b.searchable_text like '%' || replace(b.user_role, '_', ' ') || '%' then .05 else 0 end)
        + (case when b.query_lower ~ '\mweekday\M' and b.searchable_text ~ '\mweekday\M' then .20 else 0 end)
        + (case when b.query_lower ~ '\mprimetime\M' and b.searchable_text ~ '\mprimetime\M' then .20 else 0 end)
        + (case when b.query_lower ~ '\msaturday\M' and b.searchable_text ~ '\msaturday\M' then .20 else 0 end)
      )::double precision as context_score
    from weighted_scores b
    left join team_context tc on true
  )
  select chunk_id, document_id, document_version_id, document_title, document_type,
    document_authority_rank, document_scope_kind, page_number, section_label, heading,
    rule_number, content, semantic_score, keyword_score, exact_score, authority_score,
    context_score,
    (.47 * semantic_score + .24 * keyword_score + .19 * exact_score + .06 * authority_score + .04 * context_score)::double precision as combined_score,
    vector_rank, keyword_rank, exact_score > 0 as exact_match
  from scored
  order by combined_score desc, exact_score desc, keyword_score desc, semantic_score desc, chunk_id
  limit (select candidate_limit from input);
$$;

comment on function public.search_ai_official_chunks is
  'Stage 3 server-only hybrid retrieval: only active documents, their active ready version, and searchable embedded chunks are eligible.';

revoke all on function public.search_ai_official_chunks(
  extensions.vector(1536), text, text, text, text, uuid, uuid, uuid, uuid, text, integer
) from public, anon, authenticated;
grant execute on function public.search_ai_official_chunks(
  extensions.vector(1536), text, text, text, text, uuid, uuid, uuid, uuid, text, integer
) to service_role;
