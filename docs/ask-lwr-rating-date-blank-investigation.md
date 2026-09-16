# Ask LWR rating-date blank-answer investigation — 2026-09-16

Baseline: accepted LMS-0736 / 0.1.558, c52f74f863f5beb27b51307e915549de65a78def.

Reported exact text: Regarding Season DUPR rating date, When is that actual date
Owner clarified the panel stays open with a blank answer area.

Read-only connected real Commissioner drawer replay:
- Without prior context: question remains visible, returns Please ask the full question again so I can check the official rules. Outcome at 19:28:49.348 UTC: unresolved_follow_up, Stage 3 false, generation skipped, 2 ms.
- Canonical When are Season DUPR ratings recorded? returns Sunday September 27, 2026 with Important Dates citations for Weekday, Saturday and PrimeTime.
- Exact wording after that answer also remains visible and returns September 27, 2026 with all three Important Dates sources. Displayed resolved question includes both the prior question and the supplied Regarding clause.
- Browser warning/error log empty. Vercel deployed runtime error/warning check for the preceding hour returned no logs.
- Recent player-interface outcome records contained seven successful generated answers before the isolated clarification replay, including three follow_up answers. Successful question text is not retained in these outcome rows, so these cannot conclusively be attributed to the owner's exact request.

Confirmed separate routing weakness: aiConversation.js isContextualFollowUp classifies any <=12-word question containing that/it/mine/ours as dependent, despite an explicit subject in this question. No code changed yet: this alone does not explain the reported disappearance.

Client review: pending/success/error entries persist through shared in-memory context; request failure renders an error card. Reset while busy is blocked. Forced identity reset invalidates pending completion and clears history by design; there is no evidence yet that this occurred in the reported incident. Do not weaken identity/privacy reset on speculation.

Focused existing context/state/UI regression checks: 69/69 passed (lms0719, aiStage6Correction, askLwrAssistant). No build/deployment required because application unchanged. No production business/security/config/document changes issued. Waiting for the immediately preceding user question to reproduce the same conversation path. Blank-answer root cause remains unconfirmed; do not claim a fix or production acceptance for this incident.

## LMS-0737 correction

After refresh the owner reproduced the visible clarification. Corrected that confirmed defect under FAST FIX; the historical blank-panel root cause remains unconfirmed.

Two localized changes: named current topics take precedence over the short-pronoun follow-up heuristic; the existing Season DUPR recording-date intent recognizes explicit rating-date wording and selects the official calendar excerpts instead of only generic Rule 4.1. No date or answer is hard-coded. Signed context remains mandatory for dependent questions; private-data guards remain intact.

Version LMS-0737 / 0.1.559, commit 4d3c4a9c18ee1dda8d8c77d119defcf3b9044e4c. Eight scoped application/version/test files. 122 focused tests passed (14 new); lint passed with 11 existing warnings; production build passed. Initial local model run exposed generic Rule 4.1 selection; final targeted OpenAI run passed exact question, variant and match-ball contrast. Both date questions answer Sunday September 27, 2026 for Weekday, Saturday and PrimeTime from Important Dates. Final generation estimate $0.05617 (plus embeddings); initial generation estimate $0.037625. Raw local evidence is retained outside the public commit.

Production deployment and acceptance in progress. Known-good rollback: LMS-0736 c52f74f863f5beb27b51307e915549de65a78def, dpl_3HPPGWmv4v9ixRHa3KJguQRSexD3. No database rollback needed.

Final: LMS-0737 passed all three targeted production drawer checks and is FAST FIX — PRODUCTION ACCEPTED. See lms-0737-production-acceptance.md for deployment identity, exact answers and integrity attribution. The historical disappearance remains unconfirmed; the reproduced clarification and wrong generic evidence selection are corrected.
