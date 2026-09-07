# LMS-0722 owner source-correction verification — STOP

Read-only production verification: 2026-09-06/07 UTC. No production mutations, processing, activation, migration or deployment performed by Codex.

## Result

The new Rules version is active, but the PrimeTime source conflict is **not fully resolved**. Implementation is paused at the owner's explicit source-verification gate.

Document: **LWR Pickleball Club DUPR League Rules**; document ID `9c200d0f-be41-4c73-9f47-41c18dcd0132`; type `league_rules`; authority rank 1; directly applicable passages classify as `lwr_controlling`.

- Current active version: `v20260906234736-a8d90205`, ID `a8d90205-156d-478a-a021-ca24790b1408`; status `ready`; 17 pages, 76 stored chunks.
- Prior version: `v20260906111607-c0604ad8`, ID `c0604ad8-7057-4e63-b6e1-e9389aee2157`; status `superseded`, not active. Its 74 chunks and stored PDF remain present.
- Created/uploaded timestamps are not asserted to be activation timestamps.

## Current official passages

| Location | Current text | Result |
| --- | --- | --- |
| Rule 6.3.3, Match Format, page 12 | “Plus, potential Picklebreaker to 11 (win by 2 using Rally Scoring).” | Corrected to 11 |
| Rule 6.3.6, page 12 continuing onto page 13 | “The Picklebreaker™ shall consist of one game to 11 points, win by two (2), using Rally Scoring.” | Corrected to 11 |
| DUPR League Summary, page 13; PrimeTime League column, Picklebreaker (tiebreaker) row | “15 by 2 (Rally)” | Still conflicts with 6.3.3 and 6.3.6 |

The summary is searchable current production chunk `236d9626-e7fd-4c14-9a3a-de531e1d47ba`, ordinal 58. Rule 6.3.3 is chunk `c4a69e19-5b0e-4036-adca-6a427b825e65`, ordinal 50. Rule 6.3.6 spans chunks `46b761f6-6cd8-411c-8667-7a28b33f92c2` and `0a094510-b026-4a7f-95d1-075a864210e1`, ordinals 54–55.

The original stored PDF was downloaded read-only, its SHA-256 matched database checksum `9624c48108edeaff243451d1ee5fc025e27eb83b2cc217b1ef1879dfb6dc2347`, and page 13 was rendered and visually inspected. The 15 is unambiguously in the PrimeTime column; this is not a flattened-table alignment assumption, another league's column, or a regular-game value.

[Verified original current PDF page 13](lms-0722-owner-correction-page-13.png).

The current general Picklebreaker overview on page 16 also still describes games to “either 15 or 25 points, depending on the league,” while directing readers to league-specific rules. That general statement must not override the specific PrimeTime rule; the explicit PrimeTime summary cell alone is sufficient to fail the requested verification.

## Current retrieval and history

Read-only inspection of the deployed `search_ai_official_chunks` definition confirms its eligibility predicates require `d.status = 'active'`, `d.active_version_id = v.id`, `v.processing_status = 'ready'`, searchable chunks and a non-null embedding. The superseded Rules version cannot enter current retrieval through this RPC. No new player request or telemetry event was created for this check.

The prior version's PDF and chunks are retained. The unchanged Stage 7 historical viewer resolves exact document/version/chunk identities and permits `ready` or `superseded` processing state; it does not replace historical references with the new active version. This verifies retained data and the existing resolution path, not a new browser click on every historical citation.

## Implementation checkpoint

Local LMS-0722 implementation had begun under the prior approval. It is incomplete and has not been deployed. On receipt of the owner's new verification gate, further implementation was paused; an already-running patch completed. No hardcoded PrimeTime score has been added. The previous 525-test run passed before the latest in-flight integration edits; that is not final LMS-0722 validation.

Do not mark the specific production conflict resolved or adopt this as a conflict-free benchmark baseline. Keep the requested generic equal-authority conflict regression requirement. Resume implementation only after the owner-corrected active source passes this gate. No further Rules processing or policy edits are authorized for Codex.
