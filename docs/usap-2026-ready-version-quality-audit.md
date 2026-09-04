# 2026 USA Pickleball Official Rulebook: pre-activation quality audit

**Recommendation: C — reprocessing required before activation.** The readable source text is largely intact, but rule identification, rule continuity, and structural exclusions are not adequate for reliable governing evidence. This is not a recommendation to reprocess merely for aesthetics.

**Read-only audit.** No processor/application code, database record, embedding, version, activation state, or retrieval guard was changed. Stage 6 remains paused. No live answer-model request or new query/document embedding was generated. Only local audit copies, diagnostics, this report, its CSV inventory, and a roadmap note were written.

## Exact audited version and method

- Project: LWR PC League Management (`glikrmmgirilnmamxxyl`).
- Document: `2026 USA Pickleball Official Rulebook`, ID `247d222a-84c8-4994-bbe8-1ac3956899cf`.
- Version: `v20260904223428-8e03c077`, ID `8e03c077-478b-4319-9c68-db7a13751915`.
- Processed: September 4, 2026, 22:34:45.573 UTC. Ready; document inactive; active version ID null; type `usap_rulebook`; authority 2; All leagues, with no season/league/division restriction.
- Source: `USAP-Official-Rulebook.pdf`, 858,085 bytes, 96 PDF pages. Downloaded from this exact version's stored object; SHA-256 matched `5acf9ebc2be39804c92d58988b09fc302199a863e06f9fb95f9411d5426f16f2`.
- Read **all 403 actual database rows**, ordered by ordinal, including content, metadata, search flags and embedding presence/dimensions. Counts were independently verified by SQL. This is not an inference from the 50-chunk admin preview.
- Ran only the existing pure extraction/chunking functions against a local source copy. They reproduced **all 403 chunks with zero differences** in content, page, rule number, heading and searchability. The processing/persistence/embedding entry point was never called.
- Checked every stored line against its recorded source PDF page: **zero line/page mismatches**. Two chunks contain intentional gaps between surviving source lines, investigated below; they are not on the wrong page.
- Visually inspected rendered PDF pages 4, 12, 19, 30, 52, 53, 72, 73 and 85 to verify TOC layout, early/middle/late numbered rules, actual page breaks, footer locations and the index. PDF page numbers below are physical, one-based viewer pages, not printed folio numbers.

The companion [403-row audit inventory](C:/lwrpc-league-system/docs/usap-2026-chunk-audit.csv) lists every chunk's ID, page, embedding/search status, character length, stored metadata, detected body-rule declarations, split-rule membership and audit flags. No actual embedding vectors are included.

## Complete inventory and structural audit

| Requested check | Actual result |
| --- | --- |
| Total chunks | **403**, covering all 96 pages |
| Searchable | **402** |
| Non-searchable | **1**: Chunk 8, PDF page 4 |
| With embeddings | **402**, all 1,536-dimensional, `text-embedding-3-small` |
| Non-searchable with embeddings | **0**; searchable missing embeddings: **0** |
| Very short searchable chunks | **98 under 40 characters; 186 under 80; 267 under 160**. These are overlapping thresholds, not automatic exclusion decisions. |
| Title/front matter | Cover: **3 chunks**, #1–3, all searchable/embedded (`2026`, `OFFICIAL`, `RULEBOOK`). Front matter occupies #1–7 on PDF pages 1–3; #6–7 contain meaningful explanatory text and should not be discarded wholesale. |
| Copyright-only material | **22 chunks**, all searchable/embedded, containing only the recurring notice with optional page/year branding. #5 includes the additional `2026 USA PICKLEBALL` line. |
| Recurring page header/footer text | The exact copyright/rulebook notice survives in **92 chunks**. **91 are searchable/embedded**; #8 is excluded. Of those 92, 22 are notice-only and 70 contain other material (69 searchable). It is visually a footer although PDF text extraction often emits it before the body. |
| Standalone folios/page numbers | **46 chunks**, all searchable/embedded, excluding the cover year. Example: #4 is `ii`; #22 is `1`. Additional printed folios are fused with the copyright line and are counted above, not as standalone chunks. |
| Table of Contents | **14 chunks**, #8–21, on PDF pages **4–5**. Only #8 is excluded/unembedded. **13 TOC chunks are incorrectly searchable and embedded.** |
| Index | PDF pages **85–93**, **144 chunks**, all searchable/embedded. **139 contain topic/reference navigation; five are pure folio/copyright noise** already counted above. The inspected index entries contain pointers, not explanatory definitions. |
| Glossary/definitions | Actual definitions are in Section 2, PDF pages **7–10**: six substantive chunks, #27, #29–32 and #34, all searchable/embedded. Preserve them. Two intervening standalone page-number chunks are not definitions. |
| Appendices/end matter | Appendix A, PDF pages 77–82: **33 chunks** of fault/replay summaries plus structural material. Appendix B, PDF pages 83–84: **16 chunks** of priorities/guiding principles plus structural material. Final pages 94–96: **five chunks**, including acknowledgments #400, blank `NOTES:` #402, and back-cover descriptive material #403. Do not treat the informative appendices as a blanket deletion set. |
| Exact duplicates | **One exact duplicate group of nine chunks** containing the same copyright notice: #69, 73, 79, 85, 90, 115, 120, 141, 166. Eight redundant copies beyond the first; all searchable/embedded. |
| Near duplicates | Normalized text screen found **176 non-identical pairs across 25 chunks**: 174 copyright-only variant pairs, #217/#236 notice-plus-`Rule Scenario`, and #222/#237 almost identical Section 25 summary headings (including a source spelling difference). These are not 176 independently defective chunks. No additional substantive rule-body duplicate was identified by this screen. |
| Malformed extraction | **0 replacement, private-use or suspicious embedded characters** in the processor's extraction diagnostics; seven list bullets were normalized. Body text and rule labels remain readable. Structural classification is defective, and four meaningful edge lines were wrongly removed, detailed below. |
| Page/rule fragmentation | Audit reconstruction found **48 rule spans crossing chunk boundaries**, including **17 crossing physical PDF pages**. This includes short reference/figure continuations, so not every span is a harmful split. Several concrete splits do remove necessary rule conditions/outcomes from the selected evidence. |

The short-chunk count must not be used as a deletion rule. Of the 186 searchable chunks under 80 characters, **78 belong to the clearly structural set below, 94 are index navigation, and 14 are other material**, including necessary continuations such as #58 and #63.

**Conservative structural-noise total: 84 distinct searchable/embedded chunks (20.8% of all 403).** This is the non-overlapping union of 3 cover fragments + 46 standalone folios + 22 notice-only chunks + 13 TOC chunks. The 139 index-navigation chunks are a separate set. Together they account for 223 chunks, but index treatment should be structural/context-based rather than a blanket “anything at the end is useless” rule. #402 (`NOTES:`) is an additional clear non-answer fragment.

The literal uppercase `OFFICIAL RULEBOOK` occurs in the body of #6 once and is carried as heading metadata into #7. It is not, by itself, a large repeated-body chunk family. The significant repetition is the full title/copyright footer surviving in 92 chunks. Meaningful introductory material about standard, tournament and inclusive play remains useful.

## Numbered-rule quality: the principal blocker

The source uses identifiers such as **3.A.1, 6.D.1, 20.E.1.e and 25.A.10.c**. The current heading parser recognizes numeric-only rule IDs. It does not recognize this alphanumeric hierarchy as rule metadata.

An audit-only scan of governing body sections identified **548 distinct rule declarations across 99 stored chunks**. This scan requires a rule identifier followed by title-like text; it excludes index entries and bare cross-references. It is a text-structure inventory, not a count of independent legal requirements.

- **Zero of the 403 stored `rule_number` values contains an actual alphanumeric USAP playing-rule ID.**
- **151 chunks have nonempty numeric metadata; 252 are blank.** The numeric values include `2026` (58 chunks), printed folios, decimal measurements, numbers in wrapped prose and numbered Appendix B principle lists. The principle lists are real lists, but are not USAP playing-rule IDs.
- Among the **99 chunks containing actual rule declarations**, **60 have unrelated numeric metadata and 39 are blank**.
- Sections are sometimes retained correctly, sometimes truncated at a wrapped heading, and sometimes replaced by a footer or standalone cross-reference. Part II / Part III / Part IV applicability is not reliably carried into each rule chunk.

Representative actual stored evidence follows. Excerpts are short; the audit checked the complete surrounding chunks and source pages.

| Actual rule/content | Actual stored chunks and page | Metadata/context finding |
| --- | --- | --- |
| **3.A.1 — Court Dimensions**: “The court must be a rectangle measuring 20 feet…” | #36, PDF **11**, printed page 6 | Rule text is present, but stored `rule_number` is **6**, heading blank. The existing citation formatter emits **Rule 6 — Page 11**, not Rule 3.A.1. |
| **3.A.4.c — Non-Volley Zone** | #38–39, PDF **12**, printed page 7 | Splits inside the metric dimension. #39 starts `6.08 m) area…` and is falsely labeled **Rule 6.08**. The page is right; rule identity is wrong. |
| **6.D.1 — Fault – 10-Second Violation** | #57–58, PDF **19**, printed page 14 | #57 ends “When the server does not serve”; #58 contains the time limit and fault outcome, with no rule ID. Both have the truncated heading `Player Readiness and Calling the`. |
| **10.A — Two-Bounce Rule**: “The serve and the return of serve must each bounce before being returned.” | #80, PDF **28**, printed page 23 | This specific rule is complete and usable in content; `rule_number` is blank. Section `Rally Situations` is correct. The same large chunk ends inside a different rule, 10.C.5. |
| **11.A.2 — Non-Volley Zone Momentum** | #86, PDF **30**, printed page 25 | Rule and necessary outcome are intact; section `Non-Volley Zone Infractions` is correct; actual rule ID is absent from metadata. This is a useful rule-body chunk, not noise. |
| **20.E.1.e — Fault – Volley Serve and Drop Serve, Spin or Manipulation on Release** | #143 PDF **52**, printed 47 → #144 PDF **53**, printed 48 | #143 ends “When the server”. The actual condition/outcome begins on the next page. #144 has **Rule 48**, blank heading; the shared rule identity and section do not survive. |
| **23.A — Retirement from Match** | #180, PDF **67**, printed page 62 | Parent rule and nearby retirement provisions are present; section `Retirements and Withdrawals` is retained, rule ID blank. Tournament applicability comes from Part III rather than this chunk's section title. |
| **25.A.9 — Two-Bounce Allowance**, wheelchair play | #193, PDF **72**, printed page 67 | Complete useful allowance exists in the text, but stored metadata is **Rule 2026**, heading blank. The wheelchair/inclusive context must be preserved when used. |
| **25.A.10.c — Fault – Failure to Exit the Non-Volley Zone Before Volleying** | #193–194 PDF **72** → #195–196 PDF **73** | A short rule is spread across four chunks including its modified-rule reference. Metadata changes from **2026** to **68** to a bare `11.A.3)` heading. There is no safe shared rule linkage. |

**Can a player reliably get “Rule X — actual text” with a correct trusted citation?** The text is often available and physical page coordinates are correct. However, current stored metadata cannot reliably supply the actual rule label, and some necessary rule continuations are not selected. A correctly authenticated citation can still display an incorrect “Rule 2026”, “Rule 6” or “Rule 6.08” label because it trusts those stored fields. This is a metadata defect, not a viewer authorization defect.

All stored content lines were verified on their recorded physical page. Do not replace these page fields with printed folios; for example, physical PDF page 19 is printed page 14. The secure viewer's active-version requirement remains intact, so I did not manufacture or open a production player citation for this inactive version.

## Fragmentation and existing context behavior

**Chunk 6 → 7:** this is a normal physical page break inside introductory prose, PDF 2 → 3. The heading carries across and the following text identifies non-sanctioned tournaments. This split alone would not justify reprocessing. Keep useful introduction text.

The governing-rule splits are different:

- **7.B.2.a:** #62–63 on PDF 21 → #65 on PDF 22. The replay rule crosses both a size boundary and a page boundary; #63 is only 56 characters, and #65 starts with the outcome after a copyright notice.
- **20.E.1.e:** the condition/outcome is disconnected from the named rule, demonstrated in the selector smoke test below.
- **25.A.10.c:** the prerequisite, fault outcome and modification reference are distributed across four chunks with incompatible metadata.
- **6.D.1:** a complete short rule that already fits on one PDF page is split at the size limit. It should not require a page-level solution; respecting the rule boundary would suffice.

The processor carries heading metadata between pages but adds **no textual overlap**, explicit continuation links, or automatic adjacent-chunk fetch. A footer often overwrites that carried metadata. The existing USAP evidence selector does not automatically assemble an unrecognized rule from adjacent chunks. Therefore the current carry behavior does **not** make these examples safe.

The 48-span count also includes potentially harmless references and figure/table context. It is not a mandate to keep every paragraph on one page or merge every span into one enormous chunk.

## Why structural/TOC detection failed

1. **Footer protection is backwards for this layout.** `isRepeatedHeaderOrFooter` exempts anything recognized as a structural heading. A copyright line starting `2026 …`, or a folio fused to that line, looks like a numeric rule and escapes removal. This creates false rule metadata and repeatedly resets section context.
2. **Wrapped TOC entry ends TOC mode prematurely.** On physical PDF page 4, the Section 13 title wraps, with its dot leaders/page number on a separate line. The first line is recognized as a section heading but not as a TOC row, so exclusion ends at #9. Consequently #9–15 remain searchable.
3. **TOC state resets each page.** Physical PDF page 5 continues the TOC without repeating `TABLE OF CONTENTS`; #16–21 are all searchable. The existing Stage 2.1 exclusion recognizes only #8, not this complete two-page TOC.
4. **Standalone uppercase-like references become headings.** Strings such as `11.A.3)` and index rule-reference lists pass the all-uppercase heading heuristic. They create fragments and incorrect context instead of linking to a real rule.
5. **Repeated edge text is not necessarily a footer.** Existing removal also deleted the meaningful cross-reference line `Rule 15.B.4.a for a round robin.)` from PDF pages **66 and 68**, and `definition 2` from index pages **85 and 89**. These four meaningful lines are not garbled text; they were wrongly classified as recurring edge material. The two index removals explain why #271 and #321 are not contiguous raw-text substrings despite all surviving lines belonging to the right page.

Definitions should remain searchable. The index inspected here is navigation to definitions/rules, not the definitions themselves. Appendix A explicitly describes its rows as an informational compilation and directs readers to complete rules; its summary rows must not be treated as substitutes for all necessary rule parameters. Appendix B provides useful principles, so retain meaningful content and distinguish numbered principles from playing-rule IDs.

## Inactive retrieval and selection smoke tests

The actual deployed `search_ai_official_chunks` function requires document **active**, matching **active_version_id**, version **ready**, chunk **searchable**, and a non-null embedding. It has no inactive-version testing parameter. A read-only guard test used an already stored vector: it returned **32 active candidates, zero from this inactive rulebook**. No activation or guard alteration occurred.

I then used two isolated diagnostics:

**Stored full-text index diagnostic:** read-only SELECTs scoped to the exact inactive version, outside the production retrieval RPC, measured `ts_rank_cd` for substantive terms. These scores are raw keyword diagnostics, not final hybrid scores or a prediction of the .350 gate.

| Terms | Observed candidates |
| --- | --- |
| `time-outs breaks` | Actual body #154 scored .0643; TOC #17 .0500; Appendix A summary #220 .0500. The TOC genuinely participates in the searchable index. |
| `retirements withdrawals` | #107 .2100; body #180 .0848; TOC #19 .0500. |
| `non-volley zone momentum` | Inclusive summary #223 .2500; general summary #214 .1286; actual general rule body #86 .1101. This demonstrates why summaries/inclusive context need care; it does not prove final hybrid order. |
| `spin manipulation release` | #62 .0536, #144 .0334, incomplete #143 .0333, tiny continuation #63 .0250, summary #229 .0200. Necessary fragments and summaries compete independently. |

**Controlled local selector fixtures:** the real stored chunks and metadata were supplied to the unchanged Stage 4 selector with explicitly synthetic equal scores of .60, above the unchanged .35 threshold. No production eligibility or scoring was modified, no new embeddings were made, and no answer model was called.

| Question / fixture candidates | Result |
| --- | --- |
| Court rectangle / #36 | Selects usable court text, but citation says **Rule 6 — Page 11**. |
| Serve and return must bounce / #80 | Selects the useful actual two-bounce rule, with correct page 28 and section but no actual rule ID. |
| More than one paddle / #88 | Selects usable rule text, correct page 31; no rule ID. |
| Retirement for any reason / #180 | Selects text and page 67; tournament context and local LWR precedence remain necessary in real questions. |
| Wheelchair two-bounce allowance / #193 | Selects useful text but citation says **Rule 2026 — Page 72**. |
| “What is the fault for spin or manipulation on release?” / **#143 and #144 both supplied** | Selects **only #143**, ending **“When the server”**. The actual condition/outcome in #144 is not supplied to the model. **Concrete grounding failure.** |
| “What is Rule 6.D.1?” / #57 and #58 | Selects #57 only, leaving this named rule's final clause in unselected #58. The neighboring 6.D text may help, but the explicit rule is not preserved as a unit. |
| “How many standard time-outs are allowed?” / #154 | Selects nothing despite readable relevant text in the fixture. This is an additional deterministic-applicability limitation to validate separately after processing repair, not evidence that source text is missing. |

The Stage 3 explicit rule-number matcher is also numeric-only. After metadata repair, test alphanumeric requests such as `Rule 6.D.1` explicitly; a narrow compatibility correction may be needed. That finding does not justify changing retrieval weights, threshold, embeddings, or the active guard during this audit.

There is **no current player retrieval pollution from this document while inactive**. The stored searchable/embedded noise and the fixture results show a material risk **if this version is activated**.

## Smallest justified automatic remediation for a later approved change

This is a proposal only; nothing below was implemented.

1. Detect recurrent title/copyright/folio material before broad heading classification, with structural/location checks that preserve actual body rules and repeated cross-references. On this snapshot that targets **22 notice-only chunks, 46 standalone folios, 3 cover fragments**, and strips notices from **70 mixed chunks** without deleting their substantive text. Do not hardcode 2026 or individual page numbers.
2. Recognize general alphanumeric rule hierarchies, reject years/dimensions/wrapped prose as rule IDs, join wrapped section headings, and retain Part/Section/parent-rule context. This addresses **zero valid stored USAP rule IDs** and the metadata of **99 actual rule-bearing chunks**, representing **548 detected declarations**.
3. Keep short rules intact where practical; preserve correct page attribution and explicit rule/parent context on unavoidable continuations. Ensure necessary continuation evidence reaches the model. Validate the **48 spans**, especially the **17 page-crossing spans**; do not merge every paragraph indiscriminately.
4. Carry TOC recognition over wrapped rows and continued TOC pages until actual governing body text begins. This corrects **13 searchable TOC chunks**, retaining preview visibility if useful.
5. Recognize navigation-only index material by its content and structure. On this source, **139 chunks are topic/reference navigation**, while the six actual definition chunks should remain searchable. Retain useful appendix summaries with their “consult full rule” context, rather than deleting every appendix/index/glossary page automatically.
6. Reprocess into a new inactive version after the approved repair, audit it again, and repeat local evidence-selection/numbered-rule tests before any activation. Verify LWR overrides and standard/tournament/inclusive applicability before production acceptance.

**Why C rather than B:** excluding front matter/TOC alone would leave incorrect rule labels and demonstrated incomplete governing evidence. Those defects affect citations and what the model can know; they require rebuilding the processed structure, followed by retrieval/selection validation. The source PDF itself does not need wholesale replacement or OCR.

## Rule-span appendix

The following is the complete automated inventory of the 48 spans. “Cross-page” includes necessary text, reference tails, or figure/table context; use the examples above to distinguish material risks from harmless layout.

| Rule span | Stored chunk ordinals | Physical PDF pages | Cross-page |
| --- | --- | --- | --- |
| 3.A | 35, 36 | 10, 11 | Yes |
| 3.A.3 | 36, 38 | 11, 12 | Yes |
| 3.A.4.c | 38, 39 | 12 | No |
| 3.C.2 | 40, 41 | 13 | No |
| 3.C.5 | 41, 43 | 13, 14 | Yes |
| 3.D.6.a | 44, 45 | 15 | No |
| 5.B.3 | 51, 52 | 17 | No |
| 5.B.4 | 52, 54 | 17, 18 | Yes |
| 5.C.1.c | 54, 55 | 18 | No |
| 6.D.1 | 57, 58 | 19 | No |
| 7.B.2.a | 62, 63, 65 | 21, 22 | Yes |
| 7.D.4 | 65, 66 | 22 | No |
| 9.A.1 | 74, 75 | 26 | No |
| 9.B.1 | 75, 76 | 26 | No |
| 10.C.5 | 80, 81 | 28 | No |
| 10.K | 82, 83 | 29 | No |
| 13.I.1.b | 93, 94 | 33 | No |
| 14.B.1.c | 98, 99 | 35 | No |
| 14.B.2 | 101, 102 | 36 | No |
| 15.A.4 | 104, 106 | 37, 38 | Yes |
| 15.B.3 | 106, 107 | 38 | No |
| 15.B.4.a | 107, 108 | 38, 39 | Yes |
| 15.B.4.c | 108, 109 | 39 | No |
| 15.F | 111, 112 | 40 | No |
| 17.C.5 | 121, 122 | 44 | No |
| 17.D.16 | 124, 126 | 45, 46 | Yes |
| 18.B.4 | 128, 129 | 47 | No |
| 18.G | 131, 132 | 48 | No |
| 19.D.2 | 134, 135 | 49 | No |
| 19.G.2 | 137, 138 | 50 | No |
| 19.H | 138, 139 | 50, 51 | Yes |
| 20.E.1.e | 143, 144 | 52, 53 | Yes |
| 20.E.2.e | 145, 147 | 53, 54 | Yes |
| 20.G | 147, 148 | 54 | No |
| 20.H.2 | 149, 150 | 55 | No |
| 21.B | 154, 155, 157 | 57, 58 | Yes |
| 21.C.9 | 159, 160 | 59 | No |
| 21.C.10 | 160, 162 | 59, 60 | Yes |
| 22.D.6 | 172, 173 | 64 | No |
| 22.H | 173, 174, 175 | 64, 65 | Yes |
| 22.K | 175, 176, 178 | 65, 66 | Yes |
| 23.B.2 | 180, 181 | 67 | No |
| 24.F | 185, 186 | 69 | No |
| 25.A.10.c | 193, 194, 195, 196 | 72, 73 | Yes |
| 25.A.11 | 196, 197 | 73 | No |
| 25.B.2.e | 200, 201 | 74 | No |
| 25.B.3.b | 202, 203 | 75 | No |
| 25.B.3.f | 203, 205 | 75, 76 | Yes |

## Reproducibility and final state

Near-duplicate screening used case/whitespace normalization, minimum length ratio .90, and a character similarity threshold .90; long-text pairs were screened by token overlap before comparison. Reported near matches were inspected. All categories are explicitly defined; overlapping counts should not be added except for the stated non-overlapping union.

Final SQL verification: document still **inactive**, active version ID **null**, version still **ready**, 96 pages, 403 chunks, 402 searchable/embedded. Latest chunk update remains **2026-09-04 22:34:45.548318 UTC**, from the original processing run. The reported version has not been activated or altered. LMS remains LMS-0706; Stage 6 remains paused. No app lint/build run was necessary because no app code changed.
