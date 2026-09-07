# LMS-0723 subject-resolution correction — migration stop

**Historical stop, subsequently approved for correction.** The bounded function/router correction is now implemented locally; see [current correction report](lms-0723-subject-resolution-report.md). Production remains unchanged.


Status: STOP before application correction or migration editing. LMS-0723 / 0.1.545 remains local and not production accepted; accepted production remains LMS-0722 / 0.1.544.

The owner authorized a routing-only correction and explicitly required stopping if a migration change became necessary. The six-capability review found a second boundary defect that prevents faithfully supporting an explicit named-person team lookup through its own protected operation.

## Evidence

The existing JavaScript self detector treats conversational `me` as the requested subject. That explains the previously reproduced named-person rating error. Separately, `ai_live_lookup` in the pending migration enters authorized person resolution only for PLAYER_RATING, PLAYER_CONTACT, or an already-resolved cross-person `subject` UUID (line 89). A `name` on SELF_TEAM does not enter that branch; line 113 defaults the target to the requester. Team filtering at line 151 likewise checks only the presence of `subject`, not a resolved name.

An isolated PGlite replay used the real pending migration and existing synthetic fixture, with Captain Person2 managing Person1 and unrelated Person9 belonging to Other Team:

| Protected RPC input | Actual result |
|---|---|
| SELF_TEAM, name = Synthetic Person9 | success, returned requester's Synthetic Team |
| SELF_TEAM, subject = synthetic Person9 reference | not_found |

This demonstrates name/reference inconsistency and wrong-subject output, not disclosure of Person9's protected data. No production access, model call or embedding call occurred. The temporary probe was removed after its assertions passed.

## Required bounded extension for owner review

Keep the intended operation during person resolution. For supported team/person requests, a supplied explicit person name must enter that operation's authorized candidate population, resolve there, and constrain the returned team relationships to that person. Reject contradictory self/name/reference inputs rather than defaulting to the requester. Preserve final relationship rechecks and existing minimal projections. Do not use a fabricated PLAYER_RATING clarification request as a general person resolver: that would substitute another capability's policy and accounting for the requested team operation.

This requires editing the function body in the pending, unapplied migration; no new table or column is proposed. No SQL change has been made. The proposed team-resolution extension and router correction require review before work resumes.

## Six-capability review disposition

- SELF_RATING: recipient-pronoun routing defect confirmed previously; genuine possessive self fields must be distinguished from named subjects.
- PLAYER_RATING: existing RPC already resolves names within the authorized population; router must choose it for explicit rating subjects, including generic rating wording.
- PLAYER_CONTACT: existing RPC resolves names, but router self flags and discourse/name parsing require the approved regression controls; self-contact is not to be silently substituted.
- SELF_TEAM / TEAM_IDENTITY: named subject is ignored at the SQL boundary, confirmed above. Protected reference is correctly denied for the unrelated fixture.
- TEAM_ROSTER and NEXT_MATCH: share the same name/reference gate and team filtering. Named team context must stay distinct from a named person's team; neither may default silently to requester context.

No application correction was implemented; full validation/build and corrected rating replay were not run because the explicit migration stop condition was reached. Earlier 627-test results remain historical, not validation of a fix. The diagnostic probe's two assertions passed. Operational data, pending migration, application version and production were unchanged.

After separate approval: implement bounded router and RPC subject resolution; run the required complete synthetic matrix, projection/authorization checks and full validation/build; replay the exact managed-player rating blocker with distinct requester/target values; then stop for review before production. Production continuation, once separately released, remains read-only preflight, apply the pending migration once, security verification, normal deployment, and the previously approved production acceptance gates.
