# Ask LWR follow-up — team-record intent and authorized results

Owner screenshot: “What is our teams record?” incorrectly returns insufficient official evidence. Deterministic routing returns no Live intent; “What is our team's record?” instead matches SELF_TEAM, which answers team identity, not record. LIVE_CAPABILITIES has no team-record capability. Relevant routing source is unchanged from accepted LMS-0727: this is an existing capability gap, not an LMS-0728 regression.

Future bounded work should resolve authorized team/season records, clarify ambiguity and return useful no-team/no-results responses. Never infer records from documents or substitute Commissioner access for the effective View-As user. Include missing/straight/curly apostrophe variants, preserve privacy/read-only boundaries and API cost policy. Keep routing tests deterministic.

Recorded only: no implementation, SQL, corpus, model or production change. Separate from the normal implicit-Player Live identity MUST-FIX; future implementation scope remains for review.
