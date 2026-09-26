import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LWR_AI_ENABLED = 'true';
process.env.OPENAI_API_KEY = 'test-only-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-signing-key';

const { runPlayerOfficialAnswer } = await import('../app/lib/askLwrPlayerAnswer.js');
const { retrieveOfficialEvidence } = await import('../app/lib/aiRetrieval.js');
const { generateOfficialAnswer } = await import('../app/lib/aiAnswerGeneration.js');
const { officialQuestionConcept } = await import('../app/lib/aiQuestionConcepts.js');

const question = 'Can Saturday mixed teams include additional players who play only in the mixed round?';
const documentId = '8c8c8c8c-8c8c-48c8-8c8c-8c8c8c8c8c8c';
const versionId = '9d9d9d9d-9d9d-49d9-9d9d-9d9d9d9d9d9d';
// Current published PDF ingestion puts the complete 6.2.2 provision in the
// searchable chunk whose stored metadata names the preceding Rule 6.2.1.
const roster = {
  id: '259bbd33-00fe-4e7f-ac68-06a6f6d49e2c', rule_number: '6.2.1',
  heading: 'Scheduling', page_number: 9, chunk_ordinal: 32,
  content: '6.2.1. Scheduling: Games are typically scheduled for every other Saturday at noon.\n6.2.2. Roster & Courts: 12 players—6 men and 6 women—divided into six teams: 3 men’s\ndoubles teams and 3 women’s doubles teams. Mixed teams may be formed from\nthe gender doubles players or can be from additional players who participate only in\nthe mixed round. Requires 4 courts.',
};
const cap = {
  id: '6cf3bfbb-4545-4eaf-bf1f-c7d546c2e8fc', rule_number: '6.2.5',
  heading: 'Player Cap', page_number: 10, chunk_ordinal: 38,
  content: '6.2.5. Player Cap: Every player plays 3 gender double games to 15 and will then play 1 mixed game to 15. Optional lineups may include players who compete only in gender doubles or only in mixed doubles.',
};
const section = { id: '782e17be-2eeb-4508-a73c-c74b23091264', rule_number: '6.2', content: '6.2. Saturday DUPR League', chunk_ordinal: 30 };
const stored = [roster, cap, section].map(chunk => ({ ...chunk, document_version_id: versionId, is_searchable: true, section_label: '' }));
const raw = (chunk, score) => ({
  chunk_id: chunk.id, document_id: documentId, document_version_id: versionId,
  document_title: 'LWR Pickleball Club DUPR League Rules', document_type: 'league_rules',
  document_authority_rank: 10, document_scope_kind: 'all', page_number: chunk.page_number,
  heading: chunk.heading || '', section_label: '', rule_number: chunk.rule_number,
  content: chunk.content, semantic_score: score, keyword_score: score,
  exact_score: score, authority_score: .5, context_score: 0, combined_score: score,
});

function database() {
  const searches = [];
  return {
    searches,
    db: {
      rpc: async (name, args) => {
        if (name === 'search_ai_approved_answers') return { data: [], error: null };
        assert.equal(name, 'search_ai_official_chunks');
        searches.push(args.p_query_text);
        return { data: [raw(roster, .55), raw(cap, .52)], error: null };
      },
      from(name) {
        const filters = { eq: {}, in: {} };
        const query = {
          select() { return this; },
          eq(key, value) { filters.eq[key] = value; return this; },
          in(key, values) { filters.in[key] = values; return this; },
          order() { return this; }, limit() { return this; }, abortSignal() { return this; },
          maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          then(resolve, reject) {
            let data = [];
            if (name === 'ai_document_chunks') {
              data = stored.filter(row => Object.entries(filters.eq).every(([key, value]) => row[key] === value)
                && Object.entries(filters.in).every(([key, values]) => values.includes(row[key])));
            } else if (name === 'ai_document_versions') {
              data = [{ id: versionId, document_id: documentId, storage_bucket: 'official', storage_path: 'rules.pdf', processing_status: 'ready',
                document: { id: documentId, title: 'LWR Pickleball Club DUPR League Rules', status: 'active', active_version_id: versionId } }];
            } else if (name === 'ai_documents') {
              data = [{ id: documentId, title: 'LWR Pickleball Club DUPR League Rules', document_type: 'league_rules', authority_rank: 10, scope_kind: 'all', active_version_id: versionId }];
            }
            return Promise.resolve({ data, error: null }).then(resolve, reject);
          },
        };
        return query;
      },
      storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/rules.pdf' }, error: null }) }) },
    },
  };
}

test('Saturday mixed-round permission keeps governing Rule 6.2.2 through request, verification retrieval, answer and final citation', async () => {
  const { db, searches } = database();
  const assessments = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const input = JSON.parse(options.body);
    assert.equal(input.text.format.name, 'official_evidence_relevance');
    assessments.push(input);
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({
      supported: true, chunkIds: [roster.id, cap.id], reason: 'Both excerpts describe mixed participation',
      comparison: { relation: 'matches', chunkId: roster.id,
        quote: 'Mixed teams may be formed from\nthe gender doubles players or can be from additional players who participate only in\nthe mixed round.',
        documentedValue: 'additional players',
      },
    }) }] }] }) };
  };
  try {
    const plan = { intent: 'Saturday mixed-round roster participation', factType: 'additional players', entities: [], nouns: ['mixed teams'], concepts: [],
      normalizedQuestion: question, queries: [], rescueQueries: [], documentAffinities: ['league_rules'],
      verification: { subject: 'Saturday mixed-round roster participation', proposedValue: 'additional players who play only in the mixed round',
        scope: 'governing_rule', subjectQueries: ['Saturday mixed round roster participation'] } };
    const modelInputs = [];
    const response = await runPlayerOfficialAnswer({
      body: { question }, role: 'player', userId: '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a',
      answerId: '6b6b6b6b-6b6b-46b6-86b6-6b6b6b6b6b6b', supabase: db,
      retrieveOfficialEvidence: options => retrieveOfficialEvidence({ ...options,
        embedQuery: async () => ({ embedding: Array(1536).fill(.01), inputTokens: 5 }),
        planQuery: async () => ({ plan, usage: null }),
      }),
      generateOfficialAnswer: options => generateOfficialAnswer({ ...options,
        fetchImpl: async (_url, modelOptions) => {
          modelInputs.push(JSON.parse(modelOptions.body));
          return { ok: true, status: 200, json: async () => ({ object: 'response', id: 'resp_test', status: 'completed', model: 'gpt-5.5',
            output: [{ type: 'message', id: 'msg_test', status: 'completed', role: 'assistant', content: [{ type: 'output_text',
              text: JSON.stringify({ answer: 'Yes. Saturday mixed teams may include additional players who participate only in the mixed round.', conflict: false }), annotations: [] }] }], usage: {} }) };
        },
      }),
    });
    assert.equal(officialQuestionConcept(question)?.kind, 'mixed_participation');
    assert.equal(searches[0], question);
    assert.ok(searches.includes('Saturday mixed round roster participation'));
    assert.deepEqual(response.retrieval.queryUnderstanding.paths[0].candidates.map(candidate => candidate.chunkId), [roster.id, cap.id]);
    assert.ok(response.retrieval.queryUnderstanding.paths.some(path => path.kind === 'expanded' && path.query === 'Saturday mixed round roster participation'));
    assert.equal(response.retrieval.queryUnderstanding.initialFailure, null, 'the direct 6.2.2 passage was already selected before verification');
    assert.deepEqual(response.retrieval.queryUnderstanding.semanticEvidence.candidateIds, [roster.id, cap.id]);
    assert.deepEqual(response.retrieval.queryUnderstanding.semanticEvidence.attempts[0].returnedIds, [roster.id, cap.id]);
    assert.equal(assessments.length, 1);
    assert.equal(modelInputs.length, 1);
    assert.equal(response.result.kind, 'answer');
    assert.match(response.result.answer, /additional players who participate only in the mixed round/);
    assert.deepEqual(response.answer.selectedEvidence.map(source => source.chunkId), [roster.id]);
    assert.match(response.answer.selectedEvidence[0].content, /^6\.2\.2\. Roster & Courts:/);
    assert.doesNotMatch(response.answer.selectedEvidence[0].content, /^6\.2\.1\. Scheduling:/);
    assert.ok(!JSON.stringify(modelInputs[0].input).includes(cap.content));
    assert.deepEqual(response.result.sources.map(source => source.ruleNumber), ['6.2.2']);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
