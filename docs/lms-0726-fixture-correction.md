# LMS-0726 / 0.1.548 — fixture-only correction

The accepted Commissioner query remains unchanged in `app/AdminDashboardClient.js` (`countScopedPlayedGames`). It counts `line_games` through `match_lines!inner(matches!inner(...))`, restricts league/division/status, and ORs three `not.is.null` checks.

The original synthetic REST harness delegated this query to the deliberately narrower View-As display adapter. Its OR parser did not implement `not.is.null`; it also did not provide the nested inner-join filtering required by this count. The resulting fixture error was not a production application regression.

`test/helpers/normalDashboardFixtureQuery.mjs` now translates this exact supported query shape into parameterized SQL against the isolated fixture database. It uses real inner joins, ANDed scope predicates, and SQL IS NULL/IS NOT NULL. It returns the actual matching rows/count, including zero and empty-string values as non-null. It rejects unsupported fields/operators/selections. No application adapter was broadened. Other existing fixture reads remain unchanged.

PostgREST documents [filter operators](https://docs.postgrest.org/en/stable/references/api/tables_views.html) and [embedded inner joins](https://docs.postgrest.org/en/stable/references/api/resource_embedding.html). Those operations are native query capabilities of Supabase's PostgREST/PostgreSQL interface. The accepted app already uses that supported query; only the local substitute lacked it.

Focused tests cover matching/non-matching rows, all-null values, zero scores, empty text, missing relationships, empty collections, multiple scopes, AND plus OR, and unsupported syntax. PostgreSQL-backed tests pass; native PostgreSQL 17.11 independently returned the same six expected result sets in `lms-0726-fixture-postgres-results.json`.

Normal workflow fixtures additionally require faithful lineup upserts and a valid positive-save dataset. The local harness now uses a unique match/team/line key with ON CONFLICT updates, six rostered players, non-duplicated lineups and the match-to-league link needed for server Season DUPR lookup. Earlier negative save testing correctly rejected unavailable ratings; that was not bypassed. These are synthetic fixture-only schema/data, not changes to the candidate migration or business behavior.

Accepted baseline Commissioner count passed first, followed by the candidate. Initial 18-page normal comparisons matched except the approved Member Detail entry placement. Final workflow/rollback verification is continuing; consult the subsequent readiness report for the final result. No production SQL/deployment, application change, or OpenAI call is part of this correction.
