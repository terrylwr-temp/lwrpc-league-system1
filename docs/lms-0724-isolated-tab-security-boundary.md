# LMS-0724 isolated-tab implementation preflight — security boundary stop

**Current decision:** dedicated-origin implementation approved and implemented locally in LMS-0724 / 0.1.546. The historical stop and actor-wide-lock alternatives below are superseded. See [implementation, actual boundaries, validation and production gates](lms-0724-implementation-report.md). No production deployment or migration.


2026-09-07. Owner approved implementation with independent normal and View-As tabs and protection of all event-code mutation endpoints. Those decisions supersede the earlier actor-wide recommendation. **No View-As application code, SQL, version change or deployment performed.** Existing member-import changes are unrelated and remain intact.

## Concrete boundary found

The approved design's section 14 distinguished two different mechanisms:

- Same-origin opaque context in sessionStorage: explicitly insufficient for the full write invariant with the current shared administrator bearer credential.
- Dedicated View-As origin with isolated renderer and server-mediated real-administrator authentication: a feasible independent-tab architecture, but its bootstrap/session/hosting boundary was deferred for detailed review.

The implementation approval selects isolated tabs while retaining the administrator as real authenticated actor. That product behavior is feasible. It does not make an optional context header a sufficient security boundary.

Repository evidence:

1. app/lib/auth.js uses one normal Supabase client and obtains the administrator's access token for Authorization headers. Browser pages also perform direct database writes, such as members/[id]/page.js and teams/page.js.
2. app/api/tournaments/action/route.js validates tournamentId/eventCode and then calls service-role mutations/sends. It does not require an LMS actor or mandatory trusted View-As transport classification.
3. app/api/round-robin/action/route.js has multiple role/event-related action paths, including scores, players, schedules and SMS. Patching only the normal authorization helper cannot cover this surface.
4. On the existing origin, a normal Tab A write and a Tab B write with its View-As header omitted can have identical method, URL, Origin, bearer credential and body. A local synthetic request-shape assertion confirmed equality; no HTTP request or production mutation was executed. This is a protocol observation, not a completed implementation security test.

Rejecting requests that carry a valid View-As header protects cooperative requests only. A tab flag, client fetch wrapper, disabled button, cookie shared across tabs, or decoded target role does not solve the omission case. An actor-wide lock would solve omission but violate the owner's newly selected normal-Tab-A behavior, so it will not be implemented.

## Recommended concrete isolated architecture to resolve the stop

Use a dedicated, configured View-As origin with a read-only application boundary. The normal LMS stays on its current origin and retains its real Supabase session. The View-As browser renderer must not receive the normal administrator bearer/refresh token, service key or an independently writable event-code credential. It remains authenticated **as the real administrator through a server-mediated binding**, never as the target. This distinction needs confirmation against the instruction that the real Supabase authenticated session remains the administrator in every tab; it does not involve a target Auth session.

Proposed transport, for detailed review before implementation:

1. Normal Member Detail validates the real actor and target, creates the 30-minute context and a short-lived one-use bootstrap reference. Start and audit are atomic. Target/member/role values are not client authority.
2. Open the dedicated View-As origin without tokens in its URL. Deliver only the one-use bootstrap reference through an exact-origin, expected-window postMessage handshake (never wildcard). Protect against opener navigation, replay and unsolicited messages. Exchange it server-to-server for a context bound to the already verified real administrator; close the opener relationship after bootstrap.
3. The isolated host uses a Secure host-only HttpOnly binding cookie plus a tab-local opaque context selector if multiple contexts share that isolated origin. The server record binds context to actor, initiating session, expiry and target. Every read revalidates the real administrator with getUser and current database roles/target state. A short-lived encrypted server-held real-actor access token may be needed for online validation; no target token and no refresh token. Expiry cannot exceed the real actor authentication lifetime without a new controlled bootstrap. This introduces credential-lifecycle/rotation/retention details beyond the earlier simple context table, which must be reviewed rather than invented silently.
4. The isolated origin exposes only context lifecycle, authorized read/Ask LWR/source operations and audit/diagnostic persistence. All ordinary mutation routes on that origin reject before authentication alternatives/event-code parsing. Missing or invalid context fails closed there; it never falls back to ordinary administrator mode.
5. Normal-origin mutation routes enforce the intended origin/request boundary in addition to their existing credentials and reject View-As-bearing requests. Event-code endpoints participate before side effects. Deny credentialed cross-origin access and simple-request/CSRF paths from the View-As origin; explicitly preserve legitimate system cron separately. Do not treat a client-supplied Origin string as a universal defense against arbitrary non-browser clients: the enforceable boundary is that the isolated renderer has no normal write credential, and context-bearing API clients have read-only credentials.
6. CSP/connect-src and iframe/navigation policy prevent the isolated application from contacting the Supabase Data API/Storage/Auth or mounting the normal writable app as its renderer. Target-effective server readers provide all protected data. CORS alone does not prevent every write side effect; mutation origin/content-type guards are mandatory.
7. Exit invalidates only that context and returns to a validated normal Member Detail URL; the normal origin's existing administrator session remains. Refresh retains the opaque context and bounded binding. Another context/tab must not reuse the target or invalidate siblings. Expiry/revocation do not turn requests into normal writes.

Separate local origins can validate this before any hosting deployment. Production origin/domain configuration, bootstrap trust pair and encrypted real-actor authentication storage must be explicit in the implementation/security manifest. No production DNS, secret or Auth changes have been made or requested by tools.

## Required review decision

Confirm that the View-As tab may run on a **dedicated origin with server-mediated real-administrator authentication and no writable administrator Supabase token in its browser runtime**. The normal tab keeps the actual existing Supabase session; target authentication never occurs.

This is the missing concrete boundary, not a request to revert the owner's tab decision or exclude event-code endpoints. If the requirement instead mandates the writable administrator bearer credential inside both same-origin tabs, the strict omission-resistant read-only invariant cannot simultaneously distinguish permitted Tab A writes from identical Tab B requests. A context-header-only implementation would leave the known bypass.

## Status and scope

Stopping under implementation approval section 11: if an event-code endpoint cannot safely consume the guard architecture, report before completion and leave no known bypass. Full application/security tests and builds were not run because no View-As implementation was made. The only local check was the non-network request-shape assertion. LMS-0723 / 0.1.545 remains the accepted production version. LMS-0724 / 0.1.546 is approved work pending this isolated-runtime boundary, not implemented or accepted.
