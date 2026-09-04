# LMS-0708 — Medical Issue Authority Review

## Scope

LMS-0708 corrects the production failure for `Medical issue during match` without changing the 2026 USA Pickleball Official Rulebook, its processing, document metadata, embeddings, active version, Stage 3 weights, evidence threshold, or Stage 6 status.

## Application change

The continuation detector now recognizes both singular `match` and plural `matches` through `match(?:es)?`. It still requires an interruption term plus an activity term before expanding to the existing, generic `cannot complete` retrieval phrase.

Stage 3 continues to return up to its existing diagnostic candidate set. The normal model-handoff evidence remains eight candidates and final GPT evidence remains capped at four selected chunks. LMS-0708 adds a bounded 12-candidate authority-review window for Stage 4 only. It exists because the production reproduction placed LWR Rule 5.7 at rank 11 after the continuation expansion became available. Stage 4 still requires direct applicability before it applies LWR-over-USAP precedence.

## SQL migration

Apply `lwrpc-admin/supabase-ai-assistant-lms-0708-medical-authority-review.sql` after deploying the matching application code. The migration reads the installed definition of `public.search_ai_official_chunks`, replaces the single activity matcher token `matches?` with `match(?:es)?`, and recreates that same function definition. It does not alter tables, row data, versions, chunks, embeddings, Storage, document activation, or function grants.

## Production deployment order

1. Deploy LMS-0708 application code.
2. Apply `supabase-ai-assistant-lms-0708-medical-authority-review.sql` once to production.
3. Confirm the SQL function contains `match(?:es)?` in its continuation-intent activity expression.
4. Do not reprocess, activate, deactivate, or edit the active 2026 USA Pickleball Official Rulebook.
5. In the manager-only Test AI Assistant, rerun the medical and control questions below and inspect raw rank, authority-review inclusion, applicability, source class, selected evidence, and trusted citations.
6. Keep Stage 6 paused. Do not mark LMS-0708 production accepted until those tests pass against the live corpus.

## Required production retest questions

1. `Medical issue during match`
   - Expected selected evidence and sole Official Source: LWR Rule 5.7, page 5.
   - USAP Rule 21.C.9 may be reviewed but must be excluded as an overridden fallback.
2. `What happens if a player has a medical issue and cannot finish the game?`
   - Expected selected evidence: LWR Rule 5.7.
3. `Can I volley in the kitchen?`
   - Expected fallback evidence: directly applicable USAP rule when no LWR rule directly addresses that issue.
4. `When can I add a player to my team and when do I submit my lineup for Friday's match?`
   - Expected evidence: Important Dates and LWR Rule 5.4, with no irrelevant USAP evidence.

## Acceptance boundary

The manager diagnostics expose raw Stage 3 rank, authority-review inclusion, direct applicability and precedence, governing-source class, final model selection, and selection/exclusion reason. Player responses remain limited to the final grounded answer and trusted citations.

Stage 6 remains paused.
