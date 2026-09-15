# LMS-0726 / 0.1.548 — final fixture and safety-gate review

**READY FOR CONTROLLED PRODUCTION REVIEW. Not deployed or production accepted.** This supersedes the prior Commissioner/member-directory fixture stops. The implementation and reviewed scoped migration remain unchanged; this continuation modified fixture/test infrastructure and documentation only.

## 1–4. Exact RPC, read-only proof and classification correction

Normal `/members` calls protected GET `/api/admin/member-directory`; its server invokes `public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer)` via Supabase RPC POST. The exact deployed SQL was obtained with a catalog-only SELECT and matches the local historical definition. It is SQL-language, SECURITY INVOKER, empty search_path, with SELECT CTEs and built-in expressions only. No INSERT, UPDATE, DELETE, sequence/session mutation, dynamic SQL or user-defined mutating helper is present. Default VOLATILE metadata was not used as a purity assumption. See [read-only proof](lms-0726-member-rpc-read-proof.md).

The fixture had classified this POST as a table mutation. `test/helpers/fixtureRpcManifest.mjs` now explicitly distinguishes READ from WRITE, checks server credentials and known arguments, denies unknown RPCs, and executes the exact directory SQL inside a READ ONLY transaction. The accepted View-As lifecycle dispatcher remains separate because start/exchange/end/diagnostic operations intentionally update protected context state. It was not converted into an unrestricted read bypass.

Permanent tests pass for the known read RPC, directory filters/roles/paging, wrong credentials, known write denial without explicit authorization, unknown RPC denial and View-As mutation denial through the normal read executor. A deliberately mutating SQL replacement is blocked by transaction enforcement with unchanged member rows. Existing View-As route/security tests separately cover actual application mutation rejection. Native PostgreSQL 17.11 executes the directory in read-only transactions and confirms the expected results and unchanged public business rows. [Focused tests](lms-0726-member-fixture-tests.txt), [native SQL/removal evidence](lms-0726-member-native-rollback.json).

The safe normal member-save check uses a separate bounded synthetic PATCH allowance: named fixture member IDs, synthetic Commissioner/League Manager actors, approved member-edit fields, no View-As context, no member INSERT/DELETE. It does not relax the read-RPC executor or any production privilege. Other synthetic writes retain their explicit existing table allowlist. [Fixture change register](lms-0726-member-fixture-change-register.json).

## 5–7. Accepted first, candidate second, substantive comparison

The accepted application was reconstructed from deployment `dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8`, with 300 source files verified ([provenance](lms-0726-accepted-source-provenance.json)). Its Member Administration passed before candidate migration/application activation:

- Eight active rows out of nine synthetic members; expected Player/Captain/Club Pro/League Manager/Commissioner role presentation and edit/actions.
- Search `Person2` returned exactly one member; normal Edit Member/Save persisted a synthetic note.
- Commissioner and League Manager directory API returned 200; Captain and Player returned 403.

Candidate list/search/edit behavior passed. The accepted note survived cutover; a candidate note save also persisted. Candidate and restored-accepted directory APIs are identical across 12 role/search cases (all rows, one result, no result; two authorized and two unauthorized actors). The candidate's intended presentation difference is the View As User button in the normal Member Detail action row. [Comparison](lms-0726-member-comparison.json), [accepted-first API](lms-0726-member-accepted-api.json), [candidate API](lms-0726-member-candidate-api.json), [restored API](lms-0726-member-rollback-api.json).

No material candidate-only normal behavior difference was found. Transient loading captures and earlier regex-only page-presence matrices are not used as proof of successful backend behavior.

## 8–9. Normal-LMS coverage and live-workflow protection

Coverage combines the new observed workflows below with retained browser/native/deterministic evidence against the unchanged candidate. It does not claim a fresh write-through test of every legacy administration function.

| Area | Evidence and result |
| --- | --- |
| Authentication | Retained normal login, reload/session persistence and logout browser checks; final identity/auth/security suite passed. Synthetic Auth only; no hosted password/reset-email operation. |
| Commissioner Dashboard | Accepted-first and candidate count checks remain passed; SQL semantic regression includes positive, negative, null/empty/zero and scope cases. |
| Player Dashboard | Retained actual shared/normal Player screenshots and behavior checks; final role/context regressions passed. |
| Captain Dashboard | Newly observed normal Captain identity, one published future match, six-player roster, captain tools, standings 12/4 and setup completeness. |
| Teams / Team Detail | Newly observed two-team list and Captain/Co-Captain 1/Co-Captain 2/Club Pro assignments. Retained actual team create and persisted edit evidence applies to unchanged normal handlers. |
| Manage Roster | Newly observed all six players, leadership, Season DUPR 3.72, correct community and normal Add/Remove controls. |
| Add Player | Newly completed existing provisional no-DUPR-ID addition of Synthetic Person7; roster became seven. Existing information-email warning occurred because mail is intentionally unconfigured. |
| Remove Player | Newly removed only that just-added synthetic membership through the existing DELETE confirmation; roster returned to six. No admission/removal business rules changed. |
| Match Setup | Newly saved the six distinct normal Captain assignments successfully; accepted positive save was retained from the prior pass. Own lineup/rating validation remained active. Notification unavailable warning is expected in the fixture. |
| Matches | Published future match details and existing date-based score-entry disablement preserved. Retained normal/isolated match display evidence and final mutation/security controls passed. No fresh positive score submission is claimed. |
| Standings / Ratings | Captain standings and newly observed normal ratings list (eight players, Season DUPR 3.72/PrimeTime 4.1); retained shared standings/match evidence and unchanged normal code. |
| Member Administration | New accepted/candidate/restored list, search, roles, safe edit persistence and protected API denial coverage above. |
| Club Pro / League Manager | Retained role-specific normal/shared browser evidence and final authorization controls; new LM normal Member Detail and directory access verified. |
| Ask LWR | Newly observed compact shared welcome/help, role-availability explanation and Escape/close. Retained normal help evidence and deterministic routing/security/source tests; zero generation requests. |

Business-integrity comparisons bracket migration/cutover and application rollback. Explicit synthetic note/roster/lineup test writes are expected test actions, not migration-caused changes; they are neither production writes nor silently included as zero-change claims. Captain/Co-Captain assignments were unchanged. The temporary roster addition was removed. No normal Data API/security redesign was introduced.

## 10–12. View-As parity, entry button and mini-LMS removal

Retained Player, Captain and Club Pro parity captures remain applicable because every registered candidate application/new scoped-file hash is unchanged. This continuation additionally verified a combined Captain/Player target using only effective target authority, the real LM named separately, persistent READ-ONLY banner, and shared Captain Dashboard.

The same Match Setup displayed all six saved selections; all six selectors, Save and Email were disabled. `/members` under that target showed the approved narrow limitation inside the normal shared LMS shell, with the target's Captain identity—not the real manager's directory. Ask LWR opened the shared compact UI and accessible example help; no question was submitted. Exit returned to normal LMS. Retained shared roster, matches and standings evidence plus final scoped-read/security tests remain the supporting coverage for those screens.

Real Commissioner/League Manager + valid target preflight passed; Captain/Player and inactive target denied across eight new controls ([preflight](lms-0726-member-entry-preflight.json)). The actual normal LM detail showed View As User alongside Edit Member/Edit Ratings/Show Player History. Button height was 40px, with the same rounded-xl, px-4/py-2, semibold normal action styling plus focus/disabled treatment. Normal member Save remained usable.

Retained desktop/390px/320px with/without-button screenshots were reviewed; actual PNG widths are 1264/390/320. The 320px action row wraps normally with matching controls and no special card. Current in-app viewport override did not apply (DOM remained 788px), so its attempted resized captures are excluded; the prior real 320px/390px evidence is retained, not mislabeled as a new responsive run. See [parity evidence inventory](lms-0726-local-parity-acceptance.md) and `lms-0726-member-actions-{390,320}.png` / `lms-0726-member-actions-without-view-{390,320}.png`.

Candidate mini presentation remains removed: `/view-as` is the two-line landing route; the separate snapshot HTTP presentation path is removed. The accepted SQL snapshot remains intentionally available for rollback. Prior removal accounting remains 67 duplicate lines / 12,120 bytes. No parallel mini interface was reintroduced into the candidate.

## 13–16. SQL removal, application rollback, integrity and maintenance

Reviewed candidate migration unchanged: `20260909014356_lms0726_view_as_real_ui_reads.sql`, SHA256 `690f3c2777f760b84fee2b756ef64060c844924ded304d7ae22344e015d28125`. It retains the reviewed four-function scoped-read footprint and dispatcher extension. Previous native clean/replay/lock/publication/role/security checks remain valid; final deterministic suite passed again.

**SQL removal: PASS in isolated PostgreSQL 17.11.** The test captures accepted dispatcher/reader column grants, applies exact candidate SQL, verifies maintenance, then restores the accepted dispatcher, drops the four new functions and scoped policies, and revokes only added column grants. Accepted directory and snapshot reads work afterward; reader grants exactly match baseline and maintenance definition is unchanged. All public business fingerprints match. Exact test-generated removal SQL is retained in the native evidence, not supplied as an unreviewed production migration.

**Application rollback: PASS.** Same isolated database: accepted source → exact scoped migration + candidate source → accepted source. Each cutover event records unchanged public business rows ([events](lms-0726-rehearsal-stage-results.json)). Application-first rollback retains additive SQL; no SQL rollback or data restoration was needed. Restored directory passed all 12 API checks; normal Member Detail retained the intentional test note. Restored accepted mini-LMS rendered Synthetic Person2's authorized dashboard and exited. The accepted application source comes from the verified deployment, not a guessed Git commit (the accepted deployment was dirty).

Cold Next.js development compilation disrupted initial handoffs after source switches; warmed retries completed without application edits. This is documented fixture/dev-server behavior, not a claim that a failed capture passed. Browser/fixture testing is not hosted Vercel/Supabase acceptance. Native tests separately verify database boundaries and rollback.

Existing permanent compatibility/maintenance tests cover active-context preservation, expiry, repeated maintenance, audit and unchanged business rows across upgrade/application rollback. The new native test verifies maintenance survives actual removal as well. Candidate-caused business changes: **ZERO**; no business restoration required.

## 17–19. Final checks, cost and limitations

After the completed gates:

- `npm test`: **1,010/1,010 PASS**, zero failures/skips/cancellations; command exit 0. [Log](lms-0726-member-final-tests.txt)
- `npm run lint`: **0 errors, 10 existing warnings**, exit 0. [Log](lms-0726-member-final-lint.txt)
- `npx tsc --noEmit --incremental false`: **PASS**, exit 0. [Log](lms-0726-member-final-types.txt)
- `npm run verify:ai-pdf-server-bundle`: **PASS**, exit 0. [Log](lms-0726-member-final-pdf.txt)
- `npm run build`: **PASS**, exit 0. [Log](lms-0726-member-final-build.txt)
- `git diff --check`: **PASS**.

OpenAI calls **0**, incremental API cost **$0**. No benchmark, production SQL mutation, deployment, production business mutation, corpus/model change or sent notification. Production catalog access was SELECT-only to verify the exact RPC definition. Local synthetic test servers/tabs were closed.

Limits: external email/SMS and hosted Auth are not simulated end-to-end; no actual notification delivery, password change or production score write was attempted. The fixture is not a complete PostgREST/RLS emulator. Unsupported View-As pages retain reviewed limitations. Deferred broader normal Data API/security hardening is unresolved and remains a separate project. These limitations must remain visible in production review; no claim that LMS-0726 fixes those deferred exposures.

## 20–21. Recommendation and exact controlled production sequence

**LMS-0726 / 0.1.548 — READY FOR CONTROLLED PRODUCTION REVIEW.** No automatic deployment or production acceptance. Original Commissioner/member-directory fixture blockers are closed. Application code/candidate SQL were not changed to satisfy tests. The fixture-only change register and existing candidate source register remain the review boundaries.

After explicit production authorization, use this order:

A. Read-only production preflight: verify accepted deployment/aliases, source version and reviewed candidate file hashes; capture operational counts/fingerprints and maintenance state, accounting for legitimate live admin activity.
B. Apply only `20260909014356_lms0726_view_as_real_ui_reads.sql` with the SHA256 above.
C. Verify exact function ownership/search_path/ACLs/policies, dispatcher and maintenance compatibility; stop on drift or business-data changes.
D. Deploy the reviewed 0.1.548 application artifact; verify both normal and dedicated View-As origins resolve to it.
E. Normal LMS smoke first: Commissioner/LM administration, normal auth, Player/Captain/Club Pro, teams/leadership, roster, Match Setup, matches/standings/ratings and compact Ask UI. Use agreed safe production cases; stop immediately on any normal regression.
F. Compare normal operational integrity with the baseline and known legitimate activity.
G. Member Detail action row: real authorized actor/valid target only; confirmation, isolated tab and original-tab continuity.
H. Player View-As shared UI/effective authorization.
I. Captain and other approved target-role parity.
J. Roster/Match Setup/matches/standings reads and authoritative mutation denial; unsupported pages remain bounded.
K. Targeted Ask acceptance only within the existing API cost policy; no automatic full model benchmark and no broadened effective-user data.
L. Desktop/390px/320px, keyboard/focus/confirmation/help/banner/Exit checks.
M. Final data/security/maintenance integrity check.
N. Explicit owner production acceptance and release recording.

Recovery on normal regression: restore accepted deployment `dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8` first; retain additive SQL; verify normal workflows before restored View-As. Do not restore business data unnecessarily. SQL removal was separately proven locally, but production removal requires its exact reviewed baseline/ACL plan rather than ad-hoc incident commands.

Do not start LMS-0727 or the deferred security expansion. The mandatory post-LMS-0726 Ask LWR cross-community eligibility correction remains recorded and unimplemented.
