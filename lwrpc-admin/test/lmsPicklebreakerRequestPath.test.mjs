import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LWR_AI_ENABLED = 'true';
process.env.OPENAI_API_KEY = 'test-only-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-signing-key';

const { runPlayerOfficialAnswer } = await import('../app/lib/askLwrPlayerAnswer.js');
const { retrieveOfficialEvidence } = await import('../app/lib/aiRetrieval.js');
const { generateOfficialAnswer } = await import('../app/lib/aiAnswerGeneration.js');
const { officialQuestionConcept } = await import('../app/lib/aiQuestionConcepts.js');

const firstQuestion = 'In the saturday league, if the picklebreaker is played, do the same mixed teams need to play?';
const secondQuestion = 'If we play the picklebreaker, do the mixed teams need to be the same?';
const documentId = '8c8c8c8c-8c8c-48c8-8c8c-8c8c8c8c8c8c';
const versionId = '9d9d9d9d-9d9d-49d9-9d9d-9d9d9d9d9d9d';
const roster = {
  id: '259bbd33-00fe-4e7f-ac68-06a6f6d49e2c', rule: '6.2.2',
  content: '6.2.2. Roster & Courts: 12 players—6 men and 6 women—divided into six teams. Mixed teams may be formed from the gender doubles players or from additional players who participate only in the mixed round.',
};
const partners = {
  id: '8e2be834-7d92-4442-a192-9b935e279b98', rule: '6.2.3.5',
  content: '6.2.3.5. Picklebreaker™ Game (Only played if tie at the end of all previous rounds - 12-12): Features all the mixed teams (same partners as the Mixed Round) that played in the Mixed rounds.',
};
const scoring = {
  id: '7f7f7f7f-7f7f-47f7-87f7-7f7f7f7f7f7f', rule: '6.2.3',
  content: '6.2.3. Match Day Format: The Saturday Picklebreaker is played to 25 points, win by two.',
};
const raw = (passage) => ({
  chunk_id: passage.id, document_id: documentId, document_version_id: versionId,
  document_title: 'LWR Pickleball Club DUPR League Rules', document_type: 'league_rules',
  document_authority_rank: 10, document_scope_kind: 'all', page_number: 9,
  heading: 'Saturday League', section_label: 'Saturday League', rule_number: passage.rule,
  content: passage.content, semantic_score: .55, keyword_score: .6, exact_score: .6,
  authority_score: .5, context_score: 0, combined_score: .52,
});

function dbFor(searches) {
  const calls = [];
  const db = {
    rpc: async (name, args) => {
      if (name === 'search_ai_approved_answers') return { data: [], error: null };
      assert.equal(name, 'search_ai_official_chunks');
      calls.push(args.p_query_text);
      const query = args.p_query_text.toLowerCase();
      const result = searches(query, calls.length);
      return { data: result.map(raw), error: null };
    },
    from: () => {
      const query = {
        select() { return this; }, eq() { return this; }, in() { return this; },
        order() { return this; }, limit() { return this; }, abortSignal() { return this; },
        then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  return { db, calls };
}

async function ask(question, searches, plan) {
  const { db, calls } = dbFor(searches);
  const modelInputs = [];
  const output = await runPlayerOfficialAnswer({
    body: { question }, role: 'player', userId: '7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a',
    answerId: '6b6b6b6b-6b6b-46b6-86b6-6b6b6b6b6b6b', supabase: db,
    retrieveOfficialEvidence: (options) => retrieveOfficialEvidence({
      ...options, embedQuery: async () => ({ embedding: Array(1536).fill(.01), inputTokens: 5 }),
      planQuery: async () => ({ plan, usage: null }),
    }),
    generateOfficialAnswer: (options) => generateOfficialAnswer({
      ...options,
      resolveSources: async (_db, evidence) => evidence.map((chunk) => ({
        documentId: chunk.documentId, documentVersionId: chunk.documentVersionId,
        chunkId: chunk.chunkId, documentTitle: chunk.documentTitle, pageNumber: 9,
        ruleNumber: chunk.ruleNumber, heading: chunk.heading,
        citation: `${chunk.documentTitle} — Rule ${chunk.ruleNumber} — Page 9`,
        officialDocumentUrl: 'https://example.test/rules.pdf#page=9',
      })),
      fetchImpl: async (_url, options) => {
        const input = JSON.parse(options.body);
        modelInputs.push(input);
        const evidence = JSON.stringify(input.input);
        const answer = evidence.includes('same partners as the Mixed Round')
          ? 'Yes. The Saturday Picklebreaker features the mixed teams with the same partners as the Mixed Round.'
          : evidence.includes('played to 25 points')
            ? 'The Saturday Picklebreaker is played to 25 points, win by two.'
          : 'The supplied Saturday League evidence does not say whether the same mixed teams must play if a Picklebreaker is played. It only says mixed teams may be formed from the gender doubles players or from additional players who participate only in the mixed round.';
        return { ok: true, status: 200, json: async () => ({
          object: 'response', id: 'resp_test', status: 'completed', model: 'gpt-5.5',
          output: [{ type: 'message', id: 'msg_test', status: 'completed', role: 'assistant',
            content: [{ type: 'output_text', text: JSON.stringify({ answer, conflict: false }), annotations: [] }] }],
          usage: {},
        }) };
      },
    }),
  });
  return { ...output, calls, modelInputs };
}

for (const question of [firstQuestion, secondQuestion]) {
  test(`request to final citation preserves Picklebreaker partner question: ${question}`, async () => {
    const rewritten = question === firstQuestion
      ? 'In the saturday league, can mixed teams be formed from gender doubles players or additional players?'
      : 'Can mixed teams be formed from gender doubles players or additional players?';
    const plan = {
      intent: 'mixed-round roster', factType: 'mixed teams', entities: [], nouns: ['mixed teams'],
      concepts: ['Picklebreaker partners'], normalizedQuestion: rewritten,
      queries: [rewritten], rescueQueries: ['Picklebreaker same partners Mixed Round'],
      documentAffinities: ['league_rules'], verification: null,
    };
    const result = await ask(question, (query) => query.includes('picklebreaker same partners mixed round') ? [partners] : [roster], plan);
    assert.equal(officialQuestionConcept(question)?.kind, 'picklebreaker_partners');
    assert.equal(result.calls[0], question);
    assert.ok(result.calls.includes('Picklebreaker same partners as the Mixed Round'));
    assert.ok(result.calls.includes(rewritten));
    assert.equal(result.retrieval.queryUnderstanding.plan.normalizedQuestion, rewritten);
    assert.equal(result.retrieval.queryUnderstanding.paths[0].kind, 'original');
    assert.ok(result.retrieval.queryUnderstanding.paths.some((path) => path.kind === 'expanded' && path.query === rewritten));
    assert.ok(result.retrieval.queryUnderstanding.paths.some((path) => path.kind === 'rescue' && path.query === 'Picklebreaker same partners Mixed Round'));
    assert.equal(result.retrieval.queryUnderstanding.rescue.evidenceSelected, true);
    assert.ok(result.modelInputs.length > 0, 'answer generation should receive selected evidence');
    assert.equal(result.result.kind, 'answer');
    assert.deepEqual(result.answer.selectedEvidence.map((item) => item.chunkId), [partners.id]);
    assert.deepEqual(result.result.sources.map((source) => source.ruleNumber), ['6.2.3.5']);
    assert.match(result.result.answer, /Yes.*same partners as the Mixed Round/i);
    assert.ok(result.calls.some((query) => query.toLowerCase().includes('picklebreaker same partners mixed round')), 'rescue search should retain the governing relationship');
  });
}

test('direct Rule 6.2.3.5 evidence defeats higher-ranked neighboring Rule 6.2.2 at final citation', async () => {
  const plan = { intent: 'Picklebreaker partners', factType: 'partners', entities: [], nouns: [], concepts: [],
    normalizedQuestion: firstQuestion, queries: [], rescueQueries: [], documentAffinities: [], verification: null };
  const result = await ask(firstQuestion, () => [roster, partners], plan);
  assert.deepEqual(result.answer.selectedEvidence.map((item) => item.chunkId), [partners.id]);
  assert.deepEqual(result.result.sources.map((source) => source.ruleNumber), ['6.2.3.5']);
  assert.equal(result.calls.length, 1);
});

test('legitimate Saturday mixed-round roster question retains Rule 6.2.2', async () => {
  const question = 'Can Saturday mixed teams include additional players who play only in the mixed round?';
  const plan = { intent: 'mixed round roster', factType: 'participation', entities: [], nouns: [], concepts: [],
    normalizedQuestion: question, queries: [], rescueQueries: [], documentAffinities: [], verification: null };
  const result = await ask(question, () => [roster, partners], plan);
  assert.equal(officialQuestionConcept(question)?.kind, 'mixed_participation');
  assert.deepEqual(result.answer.selectedEvidence.map((item) => item.chunkId), [roster.id]);
  assert.deepEqual(result.result.sources.map((source) => source.ruleNumber), ['6.2.2']);
});

test('Saturday Picklebreaker scoring question selects scoring evidence, not partner continuity', async () => {
  const question = 'How many points is the Saturday Picklebreaker played to?';
  const plan = { intent: 'Picklebreaker scoring', factType: 'points', entities: [], nouns: [], concepts: [],
    normalizedQuestion: question, queries: [], rescueQueries: [], documentAffinities: [], verification: null };
  const result = await ask(question, () => [partners, scoring, roster], plan);
  assert.equal(officialQuestionConcept(question)?.kind, 'scoring');
  assert.deepEqual(result.answer.selectedEvidence.map((item) => item.chunkId), [scoring.id]);
  assert.deepEqual(result.result.sources.map((source) => source.ruleNumber), ['6.2.3']);
  assert.match(result.result.answer, /25 points/);
});
