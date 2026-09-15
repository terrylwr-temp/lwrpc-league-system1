# View-As schedule Captain names: separate parity defect

Owner reported during local LMS-0729 validation: Division Team Schedules shows Captain names only for the effective user's own team.

Read-only source diagnosis: the accepted LMS-0726 competition projection returns captain_member_id/co_captain_member_id/co_captain_2_member_id only for viewer.teams. Other teams get competition identifiers/name/activity/location only. The people projection likewise does not generally include other team leadership. Captain Dashboard's division schedule query requests joined Captain/Co-Captain names, and TeamScheduleModal formats those joined records. Missing projected relationship keys therefore produce missing names even if the live assignments exist. This explains the report; no live account/assignment diagnosis or mutation performed.

Source: lwrpc-admin/supabase/migrations/20260909153000_lms0726_view_as_real_ui_reads_role_compat.sql lines 142/151; app/captain-dashboard/page.js around 2548; app/components/TeamScheduleModal.js around 682.

Proposed separate bounded review: compare ordinary effective-role schedule visibility, then add only the permitted schedule leadership references and display names for active teams in the authorized division scope. Do not expose additional email, phone, roster, RF, or member-detail data. Keep real-actor privileges excluded, active-team filtering, dedicated origin, read-only enforcement, and shared UI. Require exact SQL/projection review and normal-first regression before any production change.

Acceptance: own and other active teams with assigned Captains/Co-Captains show the same permitted names as normal mode; missing assignments stay blank; inactive teams remain excluded; unrelated member/contact fields remain absent; Player/Captain View-As authorization, exit and mutation denial preserved; desktop/390px/320px.

Recorded separately; not implemented or bundled into LMS-0729 identity/team record SQL. No production changes or model calls.
