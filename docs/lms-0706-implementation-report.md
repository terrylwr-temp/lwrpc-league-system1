# LMS-0706 implementation report

LMS-0706 is implemented locally. It is **not deployed, migration-applied, or production accepted**. Stage 6 remains **paused and unstarted**. The pre-existing roadmap change recording LMS-0705 production acceptance is preserved; the appended LMS-0706 entry records the latest pause instruction.

## Migration

Exact filename: `lwrpc-admin/supabase-ai-assistant-lms-0706-usap-rulebook.sql`.

```sql
-- LMS-0706: additive catalog type only. Apply before deploying LMS-0706.
begin;

alter table public.ai_documents
  drop constraint ai_documents_document_type_check;

alter table public.ai_documents
  add constraint ai_documents_document_type_check check (document_type in (
    'league_rules',
    'league_supplement',
    'usap_rulebook',
    'captain_guide',
    'player_guide',
    'lms_guide',
    'other'
  ));

commit;
```

This replaces only the existing Stage 1 document-type check constraint, preserving every existing allowed value. The transaction requires the existing `ai_documents_document_type_check` constraint. No table, Storage, RLS, or retrieval RPC changes are included. The SQL was checked against the repository's Stage 1 definition and regression-tested for its allowed types and scope; it has not been executed against a database in this task.

## Application representation

- Database/catalog/API value: `usap_rulebook` in `ai_documents.document_type`.
- Add Official PDF and Edit Document Details label: **USA Pickleball Rulebook**. Selecting it defaults authority rank to **2**. LWR League Rules and Supplements default to **1**. Existing saved ranks are not rewritten.
- Server metadata validation accepts the type; missing USAP rank defaults to 2. Edit roundtrips retain the stored type/rank/scope.
- Processing, immutable versions, extracted-content preview, exclusions, activation, active-version retrieval, and secure citation validation use their existing shared workflows.
- Retrieval carries the document type/rank and a derived source classification. Manager diagnostics show source classification and applicability/precedence reasons. The model receives the classification and supported issue with selected evidence. Player responses retain their existing answer/trusted-citations-only contract.
- Source classifications: `league_rules` / `league_supplement` → `lwr_controlling`; `usap_rulebook` → `usap_governing_fallback`; guides/other supporting documents → `lwr_supporting_guide`.

## Applicability, precedence, and compound questions

The existing Stage 3 sufficient-evidence gate remains mandatory. The new authority path only considers supplied candidates meeting the unchanged threshold. When there is no directly applicable USAP passage, the existing LWR selector runs over the remaining LWR candidates. With no USAP candidates, the LMS-0705 selector is unchanged.

Explicit independent question clauses are evaluated separately. Team/season roster management and individual-match Match Setup reuse the existing LMS-0705 coherent-passage support checks and strength ordering. Other playing-rule issues require the question's substantive terms, after bounded wording normalization, together in a body sentence containing a rule/instruction signal. Title-only matches, scattered terms, and directions merely to consult/review another rule do not qualify. Normalization covers wording such as kitchen/non-volley zone, serving/service, touch/touching, and injury/inability to finish; it supplies no rule outcomes.

Only after this check does a directly applicable LWR rule/supplement take precedence over USAP for that same issue. Numeric rank cannot promote unrelated LWR evidence or let a guide override USAP. The model never receives corresponding overridden USAP evidence. If a USAP chunk also supports an independent issue, only eligible verbatim passages are sent; overlapping overridden passages are removed conservatively. The original retrieved content remains visible for manager review. Trusted citations are derived solely from the final selected set.

If no LWR rule directly modifies an ordinary playing-rule issue, applicable uploaded USAP evidence governs it. Guides can answer their own supported procedural issue but cannot independently override a governing playing rule. Same-rank governing evidence remains eligible for the existing material-conflict safeguard. Evidence slots are reserved per covered issue before additional support, within the existing four-chunk limit.

Applicability is a conservative deterministic text check, not a general semantic-entailment model. Unrecognized paraphrases may still need clarification. An indivisible passage containing both an overridden and independent issue is excluded conservatively. Actual-PDF production questions remain necessary to evaluate real extraction, retrieval, wording, and generated answers.

## Exact fallback

A shared constant is used by Stage 3 insufficiency diagnostics and Stage 4/5 skipped answers:

> I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.

## Regression results

All 80 tests pass: the existing 66 tests plus 14 new governing-source tests. Existing test assertions were retained except the required official-evidence prompt wording update; the raw production compound case additionally receives a high-scoring general USAP candidate and still selects Important Dates and Rule 5.4.

| Coverage | Result |
| --- | --- |
| Existing LMS-0705 raw production compound candidates | Important Dates + Rule 5.4 retained; incidental score-entry and weaker roster material excluded |
| Existing roster-only and Match Setup-only cases | Independent selections preserved |
| Existing Sep. / Sept. / September and update/updating roster wording | All retained |
| Existing four-chunk budget / compound-intent reservation | Both required intents retained |
| Existing medical/incomplete-match, NR, ball, Match Setup, conduct and procedure cases | Pass |
| Controlled Rule 5.7 retirement, scoring-freeze and Franklin Outdoor X-40 Optic conflicts | LWR selected; USAP excluded from model payload and citations, even with inverted numeric ranks |
| Match Setup with general USAP match terminology | Rule 5.4 retained |
| Ordinary USAP kitchen-volley, serve/baseline and two-bounce fixtures | USAP selected; generation not skipped |
| Related LWR kitchen/serving material, heading-only, scattered-sentence/paragraph terms, and cross-references | Do not suppress directly applicable USAP |
| Rank-1 guide conflicting with USAP | USAP governs |
| Compound lineup + kitchen volley | LWR and USAP selected independently |
| One USAP chunk with overridden ball passage and independent volley passage | Overridden passage removed; applicable passage retained; original retrieval preserved |
| Insufficient gate, below-threshold and unrelated USAP evidence | Exact fallback; no model/source-resolution call |
| Metadata default/edit roundtrip and migration scope | Pass |
| Existing live-data guard, role visibility, citation viewer, processing and retrieval security tests | Pass |

USAP evidence and conflicting outcomes in these new tests are explicitly synthetic fixtures, not a verified transcription of the 2026 Official Rulebook. Generation tests use a mock Responses API: they verify final evidence, prompt, trusted citations, and response handling, not a live model's production answer wording.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | PASS: 80 tests, 0 failed, 0 skipped |
| `npm run lint` | PASS: 0 errors; 3 existing warnings in unchanged Captain/Player Dashboard files |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run build` | PASS: compiled successfully; 69/69 static pages generated |
| `npm run verify:ai-pdf-server-bundle` | PASS against the final fresh production build |
| `git diff --check` | PASS |

The first sandboxed builds compiled but hit Windows EPERM writing `.next/cache/.tsbuildinfo`. Removing that generated cache file and running the build with approved filesystem access resolved it; no app configuration or type-check bypass was introduced. Bundle verification ran after the build because it inspects the actual compiled server chunks. Existing lint warnings: unnecessary `router` dependency at Captain Dashboard line 803 and unused `PlayerHistoryDetailsModal` / `calculatePlayerHistoryDetails` at Player Dashboard lines 2189/2208. Node tests also emit the existing module-type advisory. No live production database or real-PDF/model acceptance run was performed.

## Files changed

| File | Change |
| --- | --- |
| `lwrpc-admin/app/lib/aiGoverningSources.js` | New per-issue applicability/authority selector, source classes, shared exact fallback |
| `lwrpc-admin/app/lib/aiAnswerGeneration.js` | Integrates authority selector, model instructions, classifications and diagnostics |
| `lwrpc-admin/app/lib/aiRetrieval.js` | Shared fallback and derived candidate classification only |
| `lwrpc-admin/app/lib/aiDocumentMetadata.js` | USAP type validation and default authority helper |
| `lwrpc-admin/app/ai-assistant/page.js` | USAP catalog label/default and applicability-first help |
| `lwrpc-admin/app/ai-assistant/console/page.js` | Governing source and applicability diagnostics |
| `lwrpc-admin/app/lib/version.js` | Visible version LMS-0706 |
| `lwrpc-admin/supabase-ai-assistant-lms-0706-usap-rulebook.sql` | Focused migration |
| `lwrpc-admin/test/aiGoverningSources.test.mjs` | New authority/metadata/fallback regressions |
| `lwrpc-admin/test/aiAnswerGeneration.test.mjs` | Prompt assertion and USAP interference regression |
| `docs/project-roadmap.md` | Appended implementation status and Stage 6 pause; preserves pre-existing edit |
| `docs/lms-0706-implementation-report.md` | This report and rollout instructions |

Stage 3 RPC, scoring weights, .350 threshold, embeddings, PDF chunking, Storage architecture, secure citation viewer, live-data guard, LMS-0705 coherent-passage logic, Question/Answer colors, and role-aware guide visibility remain unchanged. No dynamic equipment lists or web-rule retrieval were added.

## Exact deployment order

1. Apply `supabase-ai-assistant-lms-0706-usap-rulebook.sql` to the intended Supabase project. Confirm the transaction succeeds and the document-type constraint now includes `usap_rulebook`. Do not assume local implementation applied it.
2. Deploy the LMS-0706 application to that same environment. Confirm the visible version and the new type option in AI Assistant Administration.
3. Upload and process the actual official 2026 PDF using the steps below. Processing does not activate it.
4. Review extraction/chunks, rule references, page numbers and processing warnings; then explicitly activate the ready version.
5. Run production LWR-override and USAP-fallback questions in the management console and player experience. Inspect selected evidence, excluded USAP reasons and citations. Confirm Important Dates + Rule 5.4 for the exact compound question.
6. Record LMS-0706 production acceptance only after these checks pass. Stage 6 stays paused throughout.

## Add Official PDF steps after deployment

1. Sign in as a League Manager and open AI Assistant Administration → **Add Official PDF**.
2. Set **Document title** to `2026 USA Pickleball Official Rulebook`.
3. Select **Document type: USA Pickleball Rulebook** and verify **Authority rank: 2**.
4. Set **Ask About applicability: All leagues**. Leave **Season: All seasons** unless you intentionally want to restrict its applicability. Do not choose a specific league or division.
5. Choose the actual official 2026 PDF and click **Upload and Process PDF**.
6. Wait for **ready**. Inspect **Processing Preview**, **Selected version readiness**, warnings/errors, and **Extracted Content Preview**. Verify text, rule references and PDF pages; exclude unusable chunks as appropriate. The existing preview displays at most 50 chunks, so it is not a complete review of a large rulebook. Review additional retrieved passages via the test console and their official-PDF citations before acceptance; do not mistake the preview limit for full-document coverage.
7. Click **Activate Ready Version** only after review; verify **Active Version**.
8. Test medical retirement (Rule 5.7), scoring freeze, Franklin Outdoor X-40 Optic balls, Match Setup (Rule 5.4), and `When can I add a player to my team and when do I submit my lineup for Friday's match?`. LWR answers must retain their applicable local outcomes.
9. Test ordinary playing-rule questions directly supported by the actual uploaded PDF and not modified by LWR; include a generally related LWR candidate and a mixed LWR-procedure/USAP-playing-rule compound question. Confirm USAP governs only the appropriate issue, citation pages open correctly, and answers do not blend overridden outcomes.
