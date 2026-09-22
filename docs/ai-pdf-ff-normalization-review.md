# Stage 2.2 PDF `ff` glyph normalization review

**Predeployment review complete; [LMS-0750 was subsequently production accepted](lms-0750-production-acceptance.md).** On 2026-09-20 automatic approval review rejected the first attempted production Rules reprocess before the command started. The stated reason was that normal reprocessing creates a persistent Supabase version and sends the complete extracted official Rules text to OpenAI's embeddings API; the authorization did not explicitly identify that payload and destination. The owner then explicitly authorized that full Rules payload, OpenAI destination, and persistent version creation. The owner separately authorized the same payload, destination, and inactive-version workflow for the Captains Guide and Important Dates. Each reprocess succeeded through the controlled processing function. No business-data write resulted from the rejected attempt or the three reprocesses.

## Corpus and source audit

The read-only audit scanned all **2,515 stored AI document chunks** across 7 documents and 37 versions. It found **537** U+01AF (`Ư`) occurrences in stored text. The per-occurrence [local audit](../.local-validation/ai-pdf-glyph-audit-before.json) records source document, version, active state, page, chunk, character offset, and surrounding text for every occurrence.

| Document | All stored versions | Active version |
| --- | ---: | ---: |
| DUPR League Rules | 513 | 23 |
| DUPR Captains Guide | 18 | 3 |
| Code of Conduct | 3 | 0 |
| 2026 Fall League Important Dates | 3 | 1 |
| **Total** | **537** | **27** |

The contexts resolve to English words with `ff`: `sufficient`, `sufficiently`, `official`, `officially`, `officiating`, `officers`, `off`, `offer`, `different`, `differential`, `effect`, `affect`, `affected`, `playoff`, and `playoffs`. Older versions sometimes contain spaces around the glyph from earlier PDF line assembly (for example `O Ư icial`); those are the same visual `ff` mapping. No context suggests legitimate Vietnamese `Ư`. Source PDFs for the active Rules, Captains Guide, Important Dates, and a historical Code of Conduct version were downloaded read-only and SHA-256 checked against version records. Rendered pages visibly show **sufficient**, **affected**, **playoff**, **officers**, **Playoffs**, and **Official** where the stored extraction has `Ư`. The [source-file manifest](../.local-validation/ai-pdf-glyph-source-files.json) and page renders remain in `.local-validation/ai-pdf-glyph-sources/`.

The 510 originally historical occurrences are retained source history; reprocessing an active document creates a new version rather than editing old chunks. Therefore “zero remaining” applies to newly processed and active versions, while immutable historical rows retain their original content. All **27 originally active occurrences** were corrected by normal reprocessing: 23 in Rules, 3 in Captains Guide, and 1 in Important Dates. The final read-only scan finds **zero active occurrences** across all 7 documents and 40 versions. The total stored count is still **537**, all in superseded historical versions. [Final corpus audit](../.local-validation/ai-pdf-glyph-audit-final.json) records every remaining historical occurrence and confirms the active count.

## Correction and boundary

`repairVerifiedLigatureArtifact` in `app/lib/aiDocumentProcessing.js` now maps every U+01AF to `ff` in the existing English PDF text-line normalization path. This runs after visual PDF text-item assembly and **before** logical chunk construction, stored chunk content, FTS indexing, and embeddings. The prior repair handled only `oƯi`/`OƯi`, explaining why other `ff` words remained malformed. The new function supplies no policy text or document-specific exception. Other application input paths are unchanged.

Unit tests cover `suƯicient`, `oƯicial`, `diƯerent`, `eƯect`, `aƯected`, playoffs, punctuation, unchanged ordinary `ff`, the existing split-run Official repair, soft-hyphen behavior, and preservation of user-entered `Ư` in Ask LWR request normalization. Focused PDF processing tests pass **11/11**. Full tests pass **1,409/1,409**; production build passes; lint passes with zero errors and the existing 11 warnings. No SQL, schema, grant, RLS, retrieval threshold, or business-data code changed.

## Exact local source preflight

The checksum-verified source PDFs were processed locally with the updated Stage 2.2 function, with no Supabase or embedding writes. Newly constructed chunks contain **zero `Ư`** in every sampled PDF. Every active chunk's page, ordinal, heading, rule number, section label, searchability, and text was compared to its stored counterpart. The only text delta is literal `Ư` → `ff`:

| Active source | Stored chunks | New chunks | Stored `Ư` | Other differences |
| --- | ---: | ---: | ---: | ---: |
| Rules | 68 | 68 | 23 | 0 |
| Captains Guide | 18 | 18 | 3 | 0 |
| Important Dates | 4 | 4 | 1 | 0 |

Rules remain 66 searchable chunks plus two table-of-contents chunks. The local extraction reports 33 repaired glyphs in Rules (the 23 previously stored malformed glyphs plus ten already repaired by the former narrow matcher), with zero unexplained unusual character sequences. Rule 5.1.1 contains `sufficient`; the operative Rule 5.1.2 and Rule 3.7 text, headings, numbering, and boundaries remain unchanged. These results are in the [local processing preflight](../.local-validation/ai-pdf-glyph-preflight.json) and [active baseline](../.local-validation/ai-pdf-glyph-active-baseline.json).

## Production Rules reprocess and retrieval

The normal `processAiDocumentVersion` function created version `efe8e0ff-9e8e-40c3-88f4-cb6bf068ddbf` (`v20260920154949-efe8e0ff`) from the checksum-verified active Rules PDF. It first remained inactive while **all 68 persisted chunks** were compared exactly with the reviewed preflight: 68/68 content, headings, rule/section metadata, boundaries, and searchability matched; 66/66 searchable chunks had embeddings; zero `Ư` remained; there were no mismatches. The existing activation RPC then made this ready version active at **2026-09-20 15:51:14 UTC**, retaining the prior version as superseded history. The new version's only text changes from the previously active Rules are the **23** `Ư` → `ff` repairs. Its processor reports 33 total repaired glyphs, including ten already repaired by the former narrow matcher. The [reprocess receipt](../.local-validation/ai-pdf-glyph-reprocess-2b548146-006e-4f66-853e-e1e61430a50e.json) and [activation receipt](../.local-validation/ai-pdf-glyph-activation-2b548146-006e-4f66-853e-e1e61430a50e.json) retain exact IDs and checks.

A read-only postactivation search selected Rule **5.1.2** for all six general multiple-team phrasings, with correct Rule 5.1.2 source citations from the new version. The same-community control selected and cited Rule **3.7**. Rule 5.1.1 now reads `sufficient`; Rule 5.1.2 and Rule 3.7 retain their exact operative language. The postactivation scan found **zero active Rules occurrences** and **four active occurrences elsewhere**; the total historical stored count remains **537** because old versions were not edited. [Retrieval trace](../.local-validation/ai-pdf-glyph-postrules-retrieval.json), [source validation](../.local-validation/ai-pdf-glyph-postrules-sources.jsonl), and [postactivation corpus scan](../.local-validation/ai-pdf-glyph-audit-postrules.json) record the results.

## Other active PDF reprocessing and final corpus scan

The owner explicitly authorized full text from the two remaining active PDFs to OpenAI embeddings and new inactive Supabase versions. Both new versions matched the reviewed local PDF preflight **chunk for chunk**, including content, page, ordinal, heading, rule/section metadata, and searchability. No other text change appeared. They were activated only after embedding and zero-glyph checks:

| PDF | Superseded version | New active ready version | Active glyphs corrected | Chunks | Searchable/embedded |
| --- | --- | --- | ---: | ---: | ---: |
| Captains Guide | `a6ad6df1-0432-4abc-873c-75b7ad4b48d0` | `bfe6d170-a683-4a43-9a1d-c59244012173` | 3 | 18 | 17/17 |
| Important Dates | `d8f9b2a9-a804-48d4-88e7-a26d80948456` | `af622e44-b128-45a5-919f-29a3901af0c9` | 1 | 4 | 4/4 |

The Captains Guide retains its **23 preexisting private-use glyph warnings**. They occur in unchanged text and are outside this verified `ff` mapping; there is no new extraction discrepancy. Activation occurred at **16:04:55 UTC** and **16:05:14 UTC**, respectively. The local [Guide reprocess](../.local-validation/ai-pdf-glyph-reprocess-a6ad6df1-0432-4abc-873c-75b7ad4b48d0.json), [Guide activation](../.local-validation/ai-pdf-glyph-activation-a6ad6df1-0432-4abc-873c-75b7ad4b48d0.json), [Dates reprocess](../.local-validation/ai-pdf-glyph-reprocess-d8f9b2a9-a804-48d4-88e7-a26d80948456.json), and [Dates activation](../.local-validation/ai-pdf-glyph-activation-d8f9b2a9-a804-48d4-88e7-a26d80948456.json) receipts preserve the exact checks.

With all three documents active, a fresh [retrieval trace](../.local-validation/ai-pdf-glyph-final-retrieval.json) again selected the same Rule 5.1.2 chunk for all six general phrasings and the Rule 3.7 chunk for the same-community control. A separate citation run returned one empty selection for “Can a player be rostered on more than one team?” while the trace had selected Rule 5.1.2; three focused reruns and one complete [seven-case citation rerun](../.local-validation/ai-pdf-glyph-final-sources-recheck.jsonl) all selected and cited the expected rule. The isolated empty result is recorded as a transient retrieval observation; it did not repeat and no threshold or rescue logic was changed.

The final full suite passed **1,409/1,409**, focused PDF tests **11/11**, lint **0 errors/11 existing warnings**, and production build passed. Logs are in `.local-validation/ai-pdf-glyph-final-{tests,pdf-tests,lint,build}.txt`.

## Predeployment release gates (subsequently completed)

Complete the prior controlled application deployment and production acceptance gates. The currently aliased READY production deployment is `dpl_EP8usAGHkKhqmCMBLkTVbdi6pb1B` from GitHub main commit `dfec4e81b947ce8f4d368e7d030d6607cbc4b41f`; it is the rollback target for this release. The older `dpl_Dr68zt62cthVFL5HHb5diAwKE12B` recorded in the LMS-0749 acceptance report was superseded by the subsequent commit `dfec4e8` before this review. Stop before deployment for any new unexplained corpus change. No application commit, version bump, or deployment had occurred as of this review.
