# Member Administration search request race — FAST FIX

September 12, 2026. Reported: normal-speed typing of Steve leaves a broad 1,534-row list, while slow typing returns 23 matching members. Accepted application baseline d5db069335cf85587cae26741b6434c4e9879cbf; recovery deployment dpl_CiR76cjRdyW9Sn6GTn5wRRnYB1aF (lwrpc-admin-q8jvt0rik-terry-lwrpc.vercel.app).

Root cause: MembersPage.loadMembers starts overlapping loads as deferred search/filter/page/sort values change, but every completed response unconditionally replaces rows/count/login state. Earlier broad searches can finish last, particularly with Last Login sorting which may collect multiple result pages. useDeferredValue does not cancel or order network responses.

Minimal application fix: one request-generation ref in MembersPage, checked after authorization and after the complete response, plus effect cleanup invalidation. Only the newest invocation owns result/error/loading state. No API/SQL/search matching/sort/authorization changes, no new business policy or member-data access, and no business-data mutation. Existing edit/maintenance handlers are unchanged.

Regression evidence: the original implementation failed six of seven focused controls, including forced reverse-order s/st/ste/stev/steve responses. Fixed implementation passes all seven: fast typing, slow typing, Clear Search, filter/page/sort changes, delayed authorization, stale API errors/current errors, and cleanup/unmount. Tests execute the actual page loader with controlled asynchronous responses. Two neighboring member-directory read/security fixture tests also pass (nine total). Required lint: zero errors, six pre-existing warnings. Final build and production acceptance recorded in the follow-up report.

Preflight: signed-in normal Teams loaded 108 teams and Members loaded 1,826 active out of 1,986 members. Read-only fingerprints: members 1986 / 389cf3ba4df5bde4ebf1ee4205bb8570; teams 108 / df4b9355263388fecb4b94f7aed45605; team_members 15 / 6efa6510440181a1d80cde990de5c5e8; member_season_ratings 1683 / 8b4ac01a3b87d96175add6e98817b229. Domain identity matched the accepted recovery deployment. No database recovery is necessary for an application-only rollback.

Scope excludes server query optimization or debounce redesign. Latest-result correctness is fixed without forcing users to slow typing. No model generations/cost.
