# LMS-0726 / 0.1.548 — corrected production retry

IN PROGRESS; NOT PRODUCTION ACCEPTED.

The owner approved the corrected migration by reference to the exact reviewed filename/hash. The permanent Live LMS Production Protection rule also applies and is saved verbatim in live-lms-production-protection.md and linked from root AGENTS.md. Normal Tier 1 workflows and live data remain the first gate.

Corrected file: 20260909153000_lms0726_view_as_real_ui_reads_role_compat.sql
SHA256: e46a527351d8dd1cef6c4f23e4cda2a9e3a2389308846c115b89e0cbc28fa207

Refreshed preflight at 2026-09-09 15:42:42 UTC: accepted Vercel deployment dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8 remains production READY; Supabase glikrmmgirilnmamxxyl has no LMS-0726 entry/partial reader/schema; dispatcher and maintenance match accepted hashes; existing public policies/table/column ACL hashes unchanged. Maintenance has 10/10 successful recent runs. Fresh baseline includes legitimate team/Captain registration and is saved in lms-0726-corrected-retry-baseline.json.

Corrected SQL applied successfully ONCE. Supabase recorded version 20260909154337, name lms0726_view_as_real_ui_reads_role_compat. Exactly one statement is stored and its database-computed SHA256 equals the approved file exactly. No superseded migration or deferred hardening SQL applied.

Post-apply verification PASS:
- Reader LOGIN/SUPERUSER/INHERIT/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION all false; role settings null.
- Exactly one incoming membership: postgres, grantor supabase_admin, ADMIN true, INHERIT false, SET false; no other memberships.
- Four bounded helper functions have reviewed body MD5, owner, definer/invoker, empty search_path and exact EXECUTE ACLs.
- Dispatcher MD5 13affa58248e50db42f998d66f8ab412; existing executor owner/ACL preserved.
- Maintenance MD5 b33c163b8a739d361f939aa5704bb5cf unchanged; five recent runs succeeded.
- 238 column SELECT grants, 19 scoped SELECT policies, zero reader table grants, no persistent DDL privileges.
- Existing non-reader column ACL hash 3d6c4eaaf98d472ed2d54cde421ea074 unchanged; original policy and table ACL hashes unchanged.
- All 19 fresh business counts/fingerprints compare exactly equal immediately after apply.

Evidence: lms-0726-corrected-retry-verification.json and lms-0726-corrected-retry-after.json.

Application packaging: all 312 source/staged hashes verified. Vercel production project uses rootDirectory=lwrpc-admin; upload wrapper preserves that layout without changing application bytes. No env files, logs, SQL or test fixtures uploaded as application source. Deployment requested at https://lwrpc-admin-ermfn7rgj-terry-lwrpc.vercel.app; build/READY and normal-LMS smoke pending.

Normal Commissioner session available. Separate legitimate normal Captain/Player sessions or owner-run acceptance results requested; no impersonated target session will substitute for normal-role testing. No View-As acceptance has started. No business acceptance probes, notification sends or OpenAI calls.

Recovery: tested application-first rollback to exact accepted deployment while retaining additive SQL; no business restoration. SQL removal remains optional, separately reviewed, and not triggered by successful apply. Deferred Data API hardening remains HIGH PRIORITY and OPEN in a separate release.

## Owner normal-role acceptance and Player target finding

Owner reported PASS for the requested normal Captain and normal Player acceptance checks on 2026-09-09. This is owner-performed evidence, not agent-run normal-role sessions. Commissioner checks remain in progress; View-As acceptance is not yet complete.

Exact candidate deployment dpl_8izJw6e8exu15BH4DTMMysVBTyRj is READY and serves both production aliases. No application bytes changed during deployment.

Owner reported missing View As User for Marilyn Niedzwiecki. Read-only production verification: member 52a44220-1ca6-406c-b703-0f73c1bda316 is active; assigned user_roles aggregate is null; accepted view_as_private.member_role returns null. The Members UI labels absent role assignments as Player (app/members/page.js get role fallback). This display fallback does not establish a valid target principal. The accepted LMS-0724 preflight denies a null target role; LMS-0726 hides invalid-target buttons as required. No member/role/auth changes made. Do not silently create role assignments or relax target validation to expose the button. This finding does not prove that valid explicitly assigned Player targets fail.

Normal Commissioner Dashboard, Members directory, Member edit controls, and Teams list loaded. No member form was saved. Member edit showed a NaN current-rating display and unsaved-change prompt without deliberate edits; comparison to exact accepted LMS-0725 source shows only View-As button placement differs in this page. Record as pre-existing behavior pending any separate diagnosis; no correction included.

## Production acceptance checkpoint — 2026-09-09 16:09 UTC

- Deployment: dpl_8izJw6e8exu15BH4DTMMysVBTyRj, READY, both league.lwrpickleballclub.com and view-as.lwrpickleballclub.com. Exact reviewed candidate; previous accepted rollback target dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8 retained. No rollback performed.
- Normal Commissioner smoke PASS: Dashboard; Members list/search; Member Detail/edit controls (no save); Teams list (62 active of 98), existing team and Captain/co-Captain presentation; roster/Add control; division standings; Season Ratings; Scheduling Admin (9 settings, 1 court-unavailability, 7 blackout entries); Schedule Editor; Scoring Operations; compact Ask LWR. Empty match state is consistent with baseline. No positive production business-write test claimed.
- Normal Captain/Player: owner reported PASS for requested normal-role checks. This is separate from View-As evidence.
- Normal-first integrity: all 19 counts/fingerprints exactly match post-migration baseline before agent View-As acceptance began. Evidence: lms-0726-normal-production-integrity.json.
- Player target Mark Abbott: valid explicit Player role; normal action row includes View As User; named read-only confirmation; separate dedicated-origin tab; actual shared Player Dashboard identifies Mark, no administrative navigation, expected no-team/no-match state. Ask LWR SELF TEAM returns no current authorized team, consistent with target facts.
- Captain target Nick Williams: actual shared Captain Dashboard identifies Nick and Net Rushmore (AL), MPT 7, PrimeTime, 2026 Fall. Manage Roster and View Team both honor current league roster lock; no real Commissioner override. Division schedule displays this team and no matches. Shared standings opens correct division with no published standings. Scoring/match actions disabled. Ask LWR SELF TEAM returns Net Rushmore (AL), MPT 7, PrimeTime, 2026 Fall.
- Tab A remains normal Terry Adelman / Commissioner with normal member actions. Player/Captain context tabs return to the normal member URL after Exit.
- Both contexts ended explicitly; credential/code/context fields cleared; VIEW_AS_STARTED and VIEW_AS_ENDED audit events preserved. Evidence: lms-0726-production-exit-evidence.json.
- Final 19 business fingerprints remain exactly unchanged. Evidence: lms-0726-final-production-integrity.json.
- Final scoped role/functions/ACLs retain reviewed values; one migration with exact approved source SHA; 238 column grants, 19 scoped policies, zero reader table grants. Maintenance 10/10 recent runs succeeded. Evidence: lms-0726-final-production-security.json.
- Agent-generated OpenAI traffic: 0 calls, 0 tokens, $0. Two deterministic Live LMS self-team queries only. Owner-performed traffic is not measured by this count.
- No production member/role/roster/lineup/schedule/score mutation, notification, correction, or additional SQL migration. Protected View-As lifecycle/audit and diagnostic writes are expected infrastructure activity.

Coverage limits: populated rosters, saved Match Setup and score-entry behavior cannot be positively exercised against the current zero-membership/zero-match production baseline without prohibited fake business data. Retained accepted local populated fixtures, server denial controls, responsive 390/320 screenshots, unsupported-page shell and mini-LMS source-removal evidence are documented in lms-0726-member-final-readiness.md; do not describe them as fresh production tests. Fresh production unsupported-route/negative endpoint and responsive coverage has not been completed in this checkpoint. Release remains NOT PRODUCTION ACCEPTED until the remaining acceptance matrix is closed. No new version or deferred hardening started.

## Owner no-role clarification

The owner accepts Marilyn's no-role/default-Player-label finding as a separate existing semantics issue. It does not block LMS-0726. Mark Abbott remains the verified legitimate Player target; remaining acceptance must use durable role-assigned members. No role/account mutation or authorization relaxation. Follow-up: post-lms-0726-member-role-semantics.md. The separately requested active-team schedule-filter correction remains local and is not part of the deployed candidate's byte manifest.

## Continued acceptance after owner no-role clarification

Production Captain target Nick Williams was used again under his durable Captain assignment. Direct navigation to /members on the dedicated View-As origin returned the approved unsupported-page message within the real LMS shell, showing Nick / Captain and the persistent read-only banner. No member directory or real Commissioner navigation appeared. Return to shared Captain Dashboard succeeded. Explicit Exit returned to the normal member URL.

Fresh production responsive checks now completed: actual DOM viewport width 390 on unsupported-page shell, 320 on Captain Dashboard; banner and Exit remain visible. On the returned normal Member Detail tab, actual 320 and 390 widths confirmed normal action-row wrapping. At 390, Edit Member, Edit Ratings, Show Player History and View As User each measured 40px high. At 320, actions stack within the narrow width. The normal desktop action row was also visually inspected. Marilyn's read-only detail was used only to verify absence of the button with the remaining controls reflowing at 390/320; her account/role/data were not changed. Temporary viewport override reset and completed temporary tab closed.

No model calls, migrations, account changes or role backfills in this continuation. No new View-As acceptance failure observed. No-role semantics is explicitly not a blocker. The separately owner-reported active/inactive Division Team Schedules defect remains corrected locally but not deployed; corrected-source deployment and targeted acceptance remain outstanding before closing the release. Existing security-denial and populated-data local evidence remains retained and is not relabeled as live write testing.

## Final status supersession

LMS-0726 / 0.1.548 — PRODUCTION ACCEPTED after the owner-authorized active-team application correction and final targeted normal-first review. Current deployment dpl_39U8T1potC5w7bhUiHFwTG1cXYBb. See lms-0726-active-schedule-production-acceptance.md for the final 20-item report, evidence and limitations. No further SQL, business-data mutation or deferred work introduced.
