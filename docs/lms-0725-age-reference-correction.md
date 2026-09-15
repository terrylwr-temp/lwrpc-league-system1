# LMS-0725 / 0.1.547 — PrimeTime age-reference correction

September 8, 2026. Local validation complete; deployed and all ten added production age/event controls passed. Acceptance then stopped on the required DUPR clarification limitation. NOT production accepted. See [production stop report](lms-0725-final-production-stop.md).

The production question “What is the date for the primetime league for basing the age on” reached no applicable evidence despite current Rule 6.3 being retrieved. Another variant incorrectly selected the season-start event. The correction distinguishes eligibility reference dates from event dates, roster dates and score deadlines. It selects the exact current PrimeTime age requirement and age-reference paragraph as separate evidence items, retaining their source identity and exact ranges. December 31 and the age threshold come from the active Rules, not application constants. Stored personal age/DOB requests remain protected; hypothetical eligibility questions require no Live lookup.

Authoritative source: current Rules version f0aad5ad-cf08-46c2-94fd-686ceb1271c0, chunk 78cab232-56b4-454f-aa08-76151dab4bf5, Rule 6.3, page 12. The policy uses December 31 of the current calendar year and retains eligibility before the season-start birthday.

Validation: 99/99 benchmark cases, including all prior 89 and Q90–Q99; 78/78 generated answers in the full run; 872/872 automated tests. Lint (10 existing warnings), typecheck, PDF bundle verification, build and diff checks pass. This correction made 79 local model calls: one exact-question validation plus 78 full-run calls, all completed. Prior model ledgers remain separate.

Evidence: lms-0725-age-reference-production-before.json, lms-0725-age-reference-before.json, lms-0725-age-reference-full-model-results.json, lms-0725-age-reference-full-preflight.json, lms-0725-age-reference-test.txt and associated check logs. No SQL, corpus processing, Approved Answer, model configuration or View-As parity change.

The owner-approved production sequence remains mandatory, with the new exact age-reference question and paired controls added. Stop before correction on the first materially incorrect production answer/source/security result. Local passes are not production acceptance.
