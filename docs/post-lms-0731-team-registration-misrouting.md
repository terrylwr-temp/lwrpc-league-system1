# ASK LWR MUST-FIX — Explicit PrimeTime/Season Team Registration Procedure Misrouting

Mandatory separate targeted follow-up after the current LMS-0731 Approved Answer Save Draft UX release is complete. Recorded from owner production observation; diagnosis and implementation have not started. Do not expand the current release.

## Observed failure

Question: “I'm trying to sign up our team for the 2026 Fall PrimeTime DUPR league. Will you send me step-by-step instructions?”

Reported response: LIVE LMS DATA / SELF RATING → “Which season do you mean?” → 2026 Fall Season or 26/27 Saturday Season.

The supplied procedure intent, PrimeTime league and 2026 Fall season must survive routing. Do not ask again for explicit dimensions or offer unrelated Saturday scope. Do not fetch personal ratings because the question mentions PrimeTime, DUPR, season or “my team.”

## Required diagnosis

Trace raw question → intent classification → league extraction → season extraction → Live/document/how-to routing → clarification generation. Identify the first incorrect stage. Inspect current active Captains Guide, League Rules, LMS help/admin/player/captain guides, applicable active Approved Answers and existing procedural evidence to locate authoritative registration instructions. Do not assume the instructions exist or invent steps. Existing official documentation should be used without requiring a duplicate Approved Answer. If the process is genuinely undocumented, report that finding as a possible Approved Answer candidate.

## Required behavior and permanent controls

- “send me step-by-step instructions,” “how do I sign up our team,” “how do I register a team,” and “what do I need to do to register my PrimeTime team” are procedural/how-to requests, not SELF_RATING.
- Resolve explicit 2026 Fall to 2026 Fall Season unless genuinely ambiguous; preserve explicit league scope. Clarify only missing/ambiguous dimensions.
- Explicit PrimeTime → no Saturday clarification choice. Explicit 2026 Fall → no unrelated 26/27 Saturday season. Cross-League Leakage = 0; cross-season leakage = 0.
- Context matrix: PrimeTime + 2026 Fall + registration instructions → PrimeTime / 2026 Fall; Weekday + 2026 Fall → Weekday / 2026 Fall; Saturday + 26/27 Saturday Season → Saturday / that season.
- Rating contrast: “What is my PrimeTime Season DUPR for the 2026 Fall Season?” retains LIVE SELF_RATING.
- Procedure contrast: “How do I register my PrimeTime team for the 2026 Fall Season?” routes to procedural/help evidence, not SELF_RATING.
- State contrast: “Is my PrimeTime team registered for 2026 Fall?” is a potential supported Live team/registration-state question; do not conflate it with how-to instructions or invent unsupported Live capability.
- If documented, provide concise ordered steps grounded in current official evidence. Separate any genuinely necessary current Live facts from the general procedure. Preserve exact-evidence/source identity requirements and avoid unnecessary personal data.

## Boundaries

Preserve effective-user View-As authorization; no View-As redesign. No team, registration, roster, schedule, Match Setup, standings or rating changes. No production changes now; no SQL expected. Diagnose deterministically with zero OpenAI calls. No broad generated benchmark; affected generated cases only if actual model behavior needs certification under the governing API cost policy. Keep separate from Approved Answer Save Draft UX and all other deferred projects.
