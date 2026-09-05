# LMS-0711 — LWR Match Equipment and USAP Legal-Ball Applicability

## Purpose

LMS-0711 corrects a production regression where a club-context question about the ball used for LWR league play selected generic USA Pickleball ball rules instead of the active LWR source that specifies the league match ball. It also restores direct USAP evidence selection for questions about legal or approved ball specifications.

## Bounded implementation

The player’s original Stage 3 query, hybrid weights, `.350` evidence threshold, normal eight-item handoff, 12-item authority-review window, and four-item model evidence cap are unchanged.

Only a detected **Club-selected match equipment** question receives an additive retrieval probe. The probe embeds a generic LWR league-match-equipment query and sends the lexical query `match balls` to the existing protected RPC. It accepts at most one active, non-USAP source whose stored text contains a structured `Match Ball:` assignment for league or match play. The application never contains a brand or model value.

The probe candidate is deduplicated by chunk ID against ordinary Stage 3 results. It is held separately in `intentEvidenceCandidates`, so it does not alter either normal candidate window. When the candidate is not normally returned, a diagnostics-only RPC call at the existing maximum candidate limit records its original normal Stage 3 rank. Manager diagnostics label the result as a bounded probe and show that original rank instead of presenting the probe score as a normal rank.

For this intent only, a direct LWR equipment-assignment passage has the `lwr_selected_equipment` governing treatment. This is an issue-specific exception: a Captain Guide remains `lwr_supporting_guide` for ordinary playing-rule questions. Generic USAP rules remain governing for equipment legality, approvals, and specifications.

The separate **USAP legal ball specifications** intent selects active USAP passages whose stored heading or text states ball specifications, ball requirements, or approved balls. It uses source wording rather than a hard-coded rule number.

## Production-corpus evidence replay

Using the active corpus, `what kind of ball are we using` still ranks USAP Rule 3.C.5 first in ordinary Stage 3. The active Captain Guide match-ball chunk is normal rank 63, then the bounded probe retrieves it first and Stage 4 selects it as `lwr_selected_equipment`.

The active selected source is **LWR Pickleball Club DUPR Captains Guide**, page 10, `LEAGUE FEES AND WAIVER`. Its stored passage supplies the Franklin Outdoor X-40 Optic match ball. That value is present only in official evidence, not in application logic.

`What ball do we use for league matches?` naturally returns that same chunk at ordinary rank 6; the probe records deduplication and Stage 4 still selects the same stored page-10 evidence. `Which ball are we playing with?` follows the additive probe path and selects that evidence. Legal-ball prompts select active USAP Rules 3.C and 3.C.2. A damaged-ball control remains USAP-only and selects Rules 10.G, 20.F, and their directly related stored evidence.

## Required production deployment and retest

1. Deploy the LMS-0711 application build. No SQL migration, document upload, reprocessing, activation, metadata edit, or embedding update is required.
2. In the manager Test AI Assistant console, run the three club-equipment prompts and verify the bounded probe panel identifies the active Captain Guide page-10 chunk, its original normal rank when outside ordinary results, `Club-selected match equipment`, `lwr_selected_equipment`, and selection for model evidence.
3. Verify `What are the USA Pickleball requirements for a legal ball?` and `What makes a pickleball legal under USA Pickleball rules?` cite active USAP Rule 3.C evidence without the LWR match-ball chunk.
4. Verify `What happens if the ball is damaged during play?` remains USAP-only.
5. Repeat the preserved LMS-0705 through LMS-0710 controls, including a generated answer for `Can I volley in the NVZ?` that begins clearly with `No`.

LMS-0711 is not production accepted by this report. Stage 6 remains paused.
