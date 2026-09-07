# PrimeTime Picklebreaker conflict — original active PDF verification

Read-only verification on 2026-09-06. No implementation or production change.

The two conflicting provisions are in **one currently active production document**, not two separate documents. The conflict remains in the LMS-0722 diagnosis because both the indexed text and the original stored PDF explicitly contain the PrimeTime-specific 11/15 inconsistency.

## Shared document and authority

- Title: **LWR Pickleball Club DUPR League Rules**.
- File: `DUPR-League-Rules.pdf`.
- Version label: `v20260906111607-c0604ad8`.
- Version ID: `c0604ad8-7057-4e63-b6e1-e9389aee2157`.
- Document ID: `9c200d0f-be41-4c73-9f47-41c18dcd0132`.
- Production document status: `active`; active-version pointer equals this version ID.
- Version processing status: `ready`, **not superseded**. Both cited provisions are searchable chunks in this version.
- Authority: document type `league_rules`, authority rank **1**, application classification **`lwr_controlling`** for directly applicable league rules.
- Original PDF printed revision: **9/1/2026** on page 12. This is a printed document revision, not an inferred activation timestamp.
- Downloaded PDF SHA-256 matches the database checksum: `bf6e056a8d8d55aae06659fb499025cfcd8526b284267807396580db761d3f20`.

## Provision 1 — 11 points

**PrimeTime section 6.3; Rule 6.3.3, Match Format; page 12.**

Exact relevant passage, with line wrapping joined:

> 6.3.3. Match Format: Teams play Round Robin. 2 out of 3 to 11 (win by 2). Plus, potential Picklebreaker to 11 (win by 2).

Chunk: `b155a475-67e6-4e59-8dca-694c560a2f75`, ordinal 50. Current active version; searchable; same controlling authority above.

[Original PDF page 12 rendered for verification](lms-0722-primetime-source-page-12.png).

## Provision 2 — 15 points

**PrimeTime section 6.3; Rule 6.3.6; starts on page 12 and continues at the top of page 13.**

Exact passage across the page break, with line wrapping joined:

> 6.3.6. The Picklebreaker™ shall be played only when the match is tied 2–2 following completion of all preceding rounds. The Picklebreaker™ features the designated doubles teams that participated in the preceding rounds, rotating in accordance with the Picklebreaker™ Rotation Rules. The Picklebreaker™ shall consist of one game to 15 points, win by two (2), using Rally Scoring.

Beginning chunk: `ca367459-7b6a-4df0-ba79-930ff1cad0ad`, ordinal 52, page 12. Continuation chunk: `92f8bd25-15df-4815-8e67-ae92c6edf461`, ordinal 53, page 13. Both stored as Rule 6.3.6; current active version; searchable; same controlling authority above. The page 13 text is followed by 6.3.7, confirming that it continues the PrimeTime provision, rather than a Saturday or generic scoring section.

[Original PDF page 13 rendered for verification](lms-0722-primetime-source-page-13.png).

The same page's **DUPR League Summary** independently displays **“15 by 2 (Rally)”** at the intersection of the **PrimeTime League** column and **Picklebreaker (tiebreaker)** row. This is corroborating content in the same PDF, not a separate authority or a reason to choose 15 automatically.

## Conclusion and boundary

Retain the conflict as an internal inconsistency in the PDF currently active in Ask LWR. The 15-point provision is not a superseded chunk, wrong-league passage, or regular-game target. Original PDF rendering rules out an extraction-only or page-binding mistake for these two numbers.

This does not decide which number is intended policy. The owner-reported score sheet and general Picklebreaker document were not independently identified or compared in this bounded verification; no claim is made that those copies contain 15. The exact active Rules PDF provenance and page images above identify the material behind the diagnosis. Do not change the official policy, active corpus, or application behavior without further authorization.
