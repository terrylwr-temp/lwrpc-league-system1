# Season DUPR rounding retrieval FAST FIX

September 13, 2026. Baseline application 9e02e61; baseline production deployment dpl_EesjhBpXCrugcoUAihC4Fy7wqzhB retained for application rollback.

Exact production question reproduced the official-document fallback: “For the Season DUPR rating, do you round up down to the first decimal?” Active League Rules version 478a87bb-1b05-4da9-ac09-7ddecec64f69, Rule 4.2 page 3 explicitly requires truncating to one decimal; examples 3.496 and 3.401 both become 3.4.

First failure: questionIntent returned unresolved and ratingQuestionKind returned empty for ordinary rounding/decimal wording. Consequently the established rating-method policy-evidence completion was not selected. Two existing matchers now recognize Season DUPR rounding/decimal/tenth language and reuse the established calculation-rule retrieval. No answer text or numerical business calculation was added to the application.

Scope: two matcher files, one permanent test file, one exact active-source fixture. No SQL, corpus change, Approved Answer, security expansion, rating calculation/write, roster change or new Live capability. Source/page revalidation remains in place. Eight new controls cover the exact wording, five variants, missing Rule 4.2 evidence, and nearby personal/date/eligibility/non-rating routing; affected run 111/111 passed. Lint/build and production replay outcomes are recorded in the final acceptance report.

Normal pre-release Commissioner dashboard and Teams page load; Teams shows 83 active of 110. A fresh 14-table business snapshot was taken for this release, distinct from yesterday's accepted snapshot. Production acceptance must replay exact question, natural variant and nearby control, confirm official classification/source and immutable deployment identity. Generation telemetry/cost is recorded only for bounded replays; no broad generated benchmark.
