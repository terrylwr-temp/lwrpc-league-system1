# LMS-0724 / 0.1.546 — final production acceptance

**LMS-0724 / 0.1.546 — PRODUCTION ACCEPTED.** September 8, 2026, final production checks through 11:17 UTC. Decision follows the owner's final acceptance instruction permitting demonstrated session/browser availability limitations and explicitly unobservable timing subdivisions. No next version started.

This is the current acceptance decision. Earlier STOP / NOT ACCEPTED entries are historical. The accepted production application remains deployment `dpl_FF21fdcEUy5TBzYvK4xanXMNTrxR`, commit `f9c94b948739e34be071b6af6ffbef52eebccfdc`, READY on both approved hostnames. No application redeployment or security correction was performed during final acceptance. The already-approved database authorization correction and maintenance schedule remain installed once.

## Evidence classification

| Gate | Classification | Result |
|---|---|---|
| View-As start, actor/target separation, read-only navigation, Live SELF and cross-player privacy | PRODUCTION VERIFIED | Retain completed production gates; final timed SELF returned target-authorized season choices. |
| Active context across scheduled maintenance, Exit, credential erasure, retained audit, original Commissioner session | PRODUCTION VERIFIED | Valid context survived a tick unchanged; subsequent UI Exit sanitized it. |
| Official Source request and document validity | PRODUCTION VERIFIED, with corroborating artifact verification | Protected source requests returned 200, produced a same-origin PDF blob; exact active Rules object is a valid nonempty PDF and renders independently. |
| Native embedded blob-PDF rendering | LIVE ENVIRONMENT LIMITATION | Same blank iframe reproduced without any LMS CSP/frame headers; identical PDF renders top-level. No CSP/frame-denial diagnostic observed. A separate normal Chrome/Edge session was unavailable. |
| Independent normal real Player parity | ISOLATED VERIFIED / LIVE ENVIRONMENT UNAVAILABLE | No legitimate independent Player authentication/session is connected. Commissioner preview was not substituted for this test. |
| Detailed timings | MEASURED WHERE OBSERVABLE | UI intervals and server diagnostic intervals reported below; inaccessible subdivisions explicitly unavailable. |
| Business-mutation denial probes | PRODUCTION PROBE BLOCKED BY SAFETY CONTROL | No retry or bypass; retain isolated and production-matched boundary evidence. |
| Maintenance and final data/security integrity | PRODUCTION VERIFIED | Exactly one every-minute job, 36 successes/0 failures at checkpoint, expected lifecycle records and no unintended changes. |

## Independent normal-Player session

**INDEPENDENT NORMAL-PLAYER SESSION — NOT LIVE-VERIFIABLE WITHOUT USER CREDENTIAL/SESSION.** Browser inventory contained only the signed-in Commissioner in Codex's in-app browser. The target used for approved preview has no linked Auth account. No passwords were changed/reset, no Auth session impersonated, and no production member/role/session was manufactured.

Independent normal-Player navigation, accessible/denied manager pages, document answers, SELF and protected cross-player requests are therefore not newly live-tested. Retain previously completed isolated normal-Player and View-As authorization evidence, including the focused 18-test boundary/database/authorization-lock/maintenance pass and earlier full suites. No material normal/preview mismatch was observed; the unavailable comparison is not represented as a production pass.

## PDF diagnosis and source security

The final preview's PrimeTime question returned the properly scoped match format with `LWR Pickleball Club DUPR League Rules — Rule 6.3.3 — Match Format — Page 12`. Official Source remained inside the read-only preview, retaining the real Commissioner/effective Player banner. Its iframe source was `blob:https://view-as.lwrpickleballclub.com/<opaque-object-id>#page=12`; no actor token, View-As selector or source receipt was in the navigated URL. The opaque blob object ID is not an authentication credential.

Vercel production logs show successful POST `/api/view-as/read` requests, including the source-action interval around 11:13:31 UTC. Observed asset requests stayed on the isolated origin (`bootstrap`, `exchange`, `read`). The source region appeared only after the deployed client accepted a successful PDF response and created a blob. Deployed `showSource` checks response Content-Type; the server source branch validates the active View-As context, verifies the citation's context-bound subject and source document/version/chunk, downloads that precise storage object and returns `application/pdf`. This is corroborating application-path evidence, not a claim that this browser tool exposed the raw source response headers/body.

Independent trusted server-side **read-only** download verified the exact current resource:

- Bucket: `ai-official-documents`.
- Path: `documents/9c200d0f-be41-4c73-9f47-41c18dcd0132/5e8efa91-4f6c-47eb-9747-b122f0ebf656/DUPR-League-Rules.pdf`.
- Active version: `v20260908020221-5e8efa91`; ready, activated at 02:02:29 UTC, before this acceptance run.
- HTTP **200**, Content-Type **application/pdf**, **463,557 bytes**, `%PDF-1.7`, **17 pages**.
- SHA-256 **9e7de44a266066933df3e252432339805a7b41665adcd706a61b49d6504554ae**, exactly matching stored metadata.
- Page 12 was parsed and visually rendered with PDFium, containing PrimeTime and Rule 6.3.3. The same downloaded bytes also rendered correctly in the browser's top-level native PDF viewer at page 12.

The independent storage read used existing server-side credentials only in memory; no credential or secret value was printed, exported into browser state or embedded in a URL. This verifies object validity separately from the preview authorization path; it is not a substitute for target authorization.

### Controlled rendering comparison

A loopback-only diagnostic fixture served the identical verified PDF, with an iframe populated by `fetch → blob → URL.createObjectURL`, matching the relevant LMS viewer mechanism. It did not alter the app or production configuration.

| Control | Observation |
|---|---|
| Unrelated W3C dummy PDF, top-level | Renders normally. |
| Exact Rules PDF, top-level local HTTP | Renders normally, 17 pages, page 12 visually verified. |
| Exact Rules PDF, blob iframe, **no CSP/X-Frame-Options** | Blank iframe; local status confirms HTTP 200, application/pdf, 463557 bytes. |
| Same blob iframe with LMS-equivalent CSP, DENY and no-referrer | Same blank iframe, same complete PDF response, no CSP/frame violation in returned logs. |
| Production preview | Blank blob iframe; browser log sample includes Electron sandbox renderer failure / null-iterable initialization error, not a CSP denial. |

The blank result is reproducible independently of LMS and independently of its security headers. This supports classification **A: in-app embedded blob-PDF environment limitation**, rather than a demonstrated LMS-0724 access/security defect. Top-level rendering is a diagnostic control, not a newly implemented user workaround. No separate normal-browser end-to-end session was available, and its embedded rendering is not claimed tested. The controls do not claim exhaustive compatibility across browsers.

Fresh production GET headers retain `frame-src 'self' blob:`, `worker-src 'self' blob:`, `connect-src 'self'`, nonce-only script permission, `object-src 'none'`, `frame-ancestors 'none'`, X-Frame-Options DENY, Referrer-Policy no-referrer and private/no-store caching; Access-Control-Allow-Origin is absent. No CSP/CORS/frame/origin protection was weakened. The distinction between allowed child frame sources and ancestors is defined in the [W3C CSP specification](https://www.w3.org/TR/CSP/).

Context-bound encrypted source receipts remain validated with `v.record.id`; arbitrary external resource URLs are rejected by the route's exact source-path pattern. Storage service credentials stay server-side. Source viewing did not exit the context or confer manager mutation authority. Retain the completed isolated cross-context receipt/replay and central write-guard tests.

## Detailed timing evidence

One final sample per listed action; no p50/p95 or benchmark claim. UI intervals were measured around browser actions and visible-state/URL waits using tool-runtime wall-clock timestamps; they include automation overhead and are not pure HTTP/server durations. Server diagnostics have the implementation's narrower scope.

| Phase | Observed measurement | Scope / limitation |
|---|---:|---|
| Start preflight / confirmation | 452 ms | Button action to confirmation visible. |
| Start submission | 928 ms | Confirmation action to start control restored/new tab discoverable. Includes browser automation; not isolated handoff. |
| Start/handoff through observed target dashboard | ≤12,165 ms | Loose observation upper bound spanning a separate tool call; includes orchestration delay, unsuitable for latency regression claims. |
| Target-effective page/read authorization | 549 ms | Ask LWR navigation through validation to authorized heading. Combined UI interval. |
| Context validation alone | Unavailable | Server emits `Server-Timing: viewas;dur=…`, but connected browser tooling does not expose response headers/resource timing. It includes context load, actor authentication and effective resolution; do not invent a subdivision. |
| Live LMS SELF clarification | 421 ms UI; 125 ms diagnostic | UI click-to-LIVE result; diagnostic at 11:13:04.677556 UTC covers ask branch plus post-answer revalidation, excluding initial validation and diagnostic insert. |
| Ask LWR document request | 4,681 ms diagnostic | At 11:13:18.577797 UTC. Same branch scope. UI wait hit the tool's selector deadline before completion; no precise UI duration reported. Earlier continuation's 4,879 ms is retained separately. |
| Official Source open | 652 ms | Click to source region visible, not time to native PDF rendering. |
| Exit | 507 ms | Click through navigation back to original member detail origin. |
| Maintenance | First 30.831 ms; second 7.653 ms; max 36.723 ms across 36 successful runs | Actual cron start/end times; no failures through 11:17 UTC. |

For Live SELF, **server authentication, effective-user resolution, authorization, protected lookup and deterministic formatting are not separately measured by this connected tool surface**. Some values are emitted in the unrendered `result.live.timing` payload, but were not extracted through an unsupported browser-state or credential workaround. The 125 ms diagnostic is not relabeled as any one of those components or the full request total.

**Answer-model calls = 0; embedding calls = 0 for the deterministic Live SELF branch.** Evidence: production response/diagnostic is LIVE_LMS_DATA, and the unchanged deployed `runLive`/route branch returns the deterministic result before document retrieval/generation. Retained isolated branch tests corroborate this. This is code-path evidence, not newly installed provider-call tracing. The separate document question appropriately uses the document pipeline.

## Maintenance, Exit and security

Exactly one job **3**, `lms0724-view-as-maintenance`, active, database postgres / user postgres, schedule `* * * * *`, command `SELECT public.lms_view_as_maintenance();`. No duplicate job. At 11:17:00.059780 UTC: **36 successes, zero failures** since correction.

The exact verified function, privilege boundary, guarded one-time applied SQL, first/second natural-run evidence, retention semantics and isolated tests are recorded in [maintenance correction](lms-0724-maintenance-correction.md). That SQL must not be replayed. Browser/PUBLIC/authenticated EXECUTE remains absent; no new grants, ownership or policies.

Active-context protection was verified in production in the prior resumed run: unchanged credentials/metadata and usable preview after the 11:02 tick. Final sample context ran from 11:12:01.887041 to explicit Exit at 11:16:44.730007, with expiry unchanged at 11:42:01.836. Exit cleared credential, code and context. Final state: **5 contexts, zero unended, zero expired/ended retained credentials, 5 STARTED, 5 ENDED, 2 READ_DENIED**, 9 private diagnostics. Context/audit history remains retained; no age-eligible production history required deletion. Existing isolated tests cover 1/30/90-day boundaries and rollback on audit failure. Failed maintenance cannot reactivate expired access.

**PRODUCTION PROBE BLOCKED BY SAFETY CONTROL.** Retain central mutation denial, event-code denial, omit-context protection and credential replay evidence from completed isolated/production-matched tests. None of the blocked production mutation probes was repeated or bypassed.

## Final integrity and concurrent activity

Read-only fingerprints at start/end of this final continuation matched for members, empty roster/matches, complete document corpus, Approved Answer current/revision/event history and Stage 7 outcomes/feedback. Final counts: 1,951 members; 0 roster rows; 0 matches; 7 documents; 23 versions; 1,804 chunks; 1 Approved Answer; 2 revisions; 7 approved events; 221 outcomes; 20 feedback events. These totals are current, not substituted for older checkpoint totals. The current Rules version predates this run.

Teams increased **90 → 91**, roles **154 → 155** during the run. Read-only inspection identifies a team created at 11:16:04.964719 UTC and its matching Captain role at 11:16:05.100827, unrelated to the preview target. Excluding those new rows exactly reproduces the initial team hash `3af000269c14c3f1ff663e3d16f69292` and role hash `2f7f7bd855794a69144c70d58fb83913`. This is consistent with legitimate concurrent registration, not an acceptance mutation. No team/role write was performed by this run.

Unchanged security fingerprints relative to maintenance preflight: functions+ACL `3b0cea8945a5ce434fee17dbec4b4063`, policies `1a63c008eebf086b9aa2998589239aee`, table ACL `d0b66fb3ae720e39847ee2358cca19b6`, column ACL `905a9bba51795669f6f2563e29075637`. The function inventory includes LMS-0723 identity coordination; existing role rows remained intact apart from the new registration row. Members hash remains `3d595ec6dd91734bfdb6bbcb5a346ad3`.

Target has zero linked Auth users, hence no target Auth/session to alter; no Auth credentials were read from its context and no Auth DML/reset/session impersonation was performed. Global Auth hashes differ from the early maintenance checkpoint after legitimate sign-in/registration activity; they are not claimed byte-identical. Original Commissioner session remains available after Exit.

Document/version/chunk fingerprints: `eaf8437616f7bb52649b3fff60380279` / `ef75f8969629ad24d737a939780d3d4c` / `de33cbf3c9e1dbc0b64bf282edc0f421`. Approved revisions: `404cbfae87bb73312f9412f627402356`; Stage 7 outcomes: `d99fc69c5ef25b83c1d545931ad2ad99`; feedback: `8c75eaf1fc1da099d79bba4c7b24553b`. Each matched its start-of-final-run fingerprint.

HMAC/environment were not changed; the same immutable deployed application and unchanged project deployment metadata remain active. Secret values were not retrieved or printed, so this is deployment/action evidence rather than a newly computed secret-value comparison. No deployment, application, function, grant, RLS, corpus, identity, Approved Answer or Stage 7 mutation was made during final acceptance.

## Decision and next work

All remaining testable gates passed at the available level of observation. The independent Player-session gap is a demonstrated access-availability limitation; embedded PDF failure reproduces outside LMS without its security settings; no LMS-0724 defect requiring correction was established. Timing boundaries and unavailable subdivisions are disclosed, as requested. Under the owner's stated final decision rule: **LMS-0724 / 0.1.546 — PRODUCTION ACCEPTED**.

No next release has started. The already-roadmapped consolidated Ask LWR refinement remains future work: Rally applicability/default-vs-exception, roster-entry policy/date routing, DUPR clarification, accessible clickable choices, resolved-question display and natural missing-data wording.
