# LMS-0712 — Stage 6 Conversation, Follow-ups & Feedback

## Scope

LMS-0712 adds deterministic conversational follow-up resolution, conservative clarification, player feedback collection, and manager-only resolver diagnostics. It does not change Stage 3 weights, the `.350` threshold, the normal eight-item handoff, the 12-candidate authority review, the four-evidence generation cap, active documents, document metadata, processing, embeddings, or activation state.

## Conversation safety

The player browser retains its existing eight-exchange session display history. It sends the server an opaque, encrypted, user-bound one-turn receipt rather than raw prior messages. The receipt contains only either the prior effective question or a pending clarification question/category and expires after 20 minutes.

The server runs the personal/live-data guard on the raw question, resolves the turn deterministically, and runs the guard again on the effective question. Only the effective standalone question reaches normal retrieval and answer generation. The model continues to receive only that effective question and selected active official evidence.

Color questions without an object receive a concise clarification. A signed pending-clarification receipt lets `Paddle.` or `Ball.` complete the effective retrieval question without treating either turn as evidence. A complete standalone question clears the prior context.

## Feedback migration and deployment

Deploy the application first, then apply [supabase-ai-assistant-lms-0712-stage6.sql](/C:/lwrpc-league-system/lwrpc-admin/supabase-ai-assistant-lms-0712-stage6.sql). The migration creates only the append-only `ai_answer_feedback_events` table and index, enables RLS, and revokes direct browser access. It does not touch any document or retrieval table.

After migration, verify a grounded answer shows feedback controls, a first Helpful vote creates one event, a repeated Helpful vote does not add an event, a switch to Not Helpful adds one event, and a repeated Not Helpful vote does not add an event. Then replay the accepted LMS-0705 through LMS-0711 questions and the Stage 6 clarification/follow-up cases. Stage 7 remains out of scope.
