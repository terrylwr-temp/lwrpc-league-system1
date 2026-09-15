# LMS-0725 / 0.1.547 - official DUPR limitation correction

Local validation passed September 8, 2026; deployed, with the official-DUPR production retest passed. Acceptance stopped at Q55 and final reconciliation found two persistence gaps. NOT production accepted. See [production report](lms-0725-dupr-production-stop.md).

The combined ambiguous-choice message returned before the legacy rating clarification's official-DUPR limitation. The service now passes its resolved query to deterministic formatting; generic rating clarification prepends the capability limitation. Explicit Season DUPR and PrimeTime Season DUPR stay uncluttered; current/official DUPR remains unavailable with no stored-value substitution or lookup. Denial and missing-data outcomes remain separate.

Focused tests also exposed exact typed Season DUPR labels matching the PrimeTime option by word containment. Exact unique labels now take precedence over partial word matching. Opaque buttons, numeric replies, reauthorization, refetch and target-bound receipts remain intact.

Validation: 94 focused tests; 882 full tests; lint (0 errors, 10 existing warnings), typecheck, PDF bundle verification, build and diff checks pass. Existing 99-case routing/evidence preflight passes. Ten added deterministic tests cover required generic/current/explicit wording and follow-up states. No answer model or embedding calls in correction validation. Document generation is unchanged; the prior 78/78 generated validation and 22 accepted production answers remain preserved, without unnecessary provider reruns.

Actual components with synthetic local Live service/authorization transport passed at 1440, 390, 320 in both normal and View-As modes: visible limitation, combined options, keyboard selection, resolved question, missing data, reset, no overflow, no page errors. View-As uses only its effective-context header. These fixtures do not substitute for production authorization checks. See lms-0725-dupr-ui-results.json and lms-0725-dupr-*-320.png. Initial harness expectations were corrected for existing natural wording without an article and for conversation history retaining prior cards; no product change was needed for those fixture failures.

No SQL, corpus, Approved Answer, model configuration, version or View-As parity changes. First production gate is exactly What's my DUPR. If it passes, resume the 76 previously unrun cases and remaining acceptance gates; preserve the previous 22 production passes. Stop on first materially incorrect production result.
