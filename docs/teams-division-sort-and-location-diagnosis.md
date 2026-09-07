# Teams By Division sort and captain-location diagnosis

2026-09-07. Local chart change and read-only production diagnosis following LMS-0723 acceptance. No release version change, production deployment or member-data mutation.

## Chart change

`lwrpc-admin/app/AdminDashboardClient.js`: Teams By Division now has Number of Teams and Division Name toggle buttons. Count descending remains the default with the existing name tie-break. Name sorting uses natural, case-insensitive order so Division 9 precedes Division 10. The sorted copy does not mutate shared analytics. Native buttons expose aria-pressed, visible keyboard focus, wrapping layout and 44px minimum height. Other charts and scope filters remain unchanged.

## Esplanade at the Heights finding

Production aggregate inspection found 14 members displaying this community, all eligible for the team page's active-member filter:

| Stored relationship | Count |
| --- | ---: |
| location_id points to Esplanade at the Heights | 2 |
| location_id is NULL | 11 |
| location_id points to Indigo @ LWR | 1 |

Member Administration renders members.club_location (text). The Teams & Rosters captain/co-captain/club-pro options filter on members.location_id, except already-selected people or the explicit all-communities override. The query is already paginated; this is not a 1,000-row truncation or inactive-member problem. The two correctly linked members exactly explain the reported dropdown count.

The member detail save writes club_location and location_id together. Re-selecting and saving the same location therefore supplies the missing/correct link, matching the owner's observation. The import path in app/member-import/page.js writes club_location on insert and when filling an empty name on update, but does not write location_id. This is a demonstrated recurrence path; per-row historical provenance was not established, so it is not proof that a particular import created every affected record.

Broader read-only counts: 84 members have nonblank community text without a location link; 77 uniquely match an active location by trimmed case-insensitive name. No duplicate active location names under that comparison. Another 356 linked records have differing text/catalog names, but many are spelling/renaming variants (for example Esplanade GCC versus G&CC and Del Webb Parrish versus Parrish/Bayview). These must not be treated as 356 incorrect memberships or blindly overwritten.

## Recommended bounded repair

Prepare an exact dry-run list for the 11 NULL Esplanade links, preserving names and every other member field; condition updates on the reviewed text and still-NULL link to avoid overwriting concurrent manager changes. Review the one Indigo-linked record separately before deciding which community is authoritative. For future import writes, resolve only an unambiguous active catalog location and store the text/link together; preserve existing non-NULL links and report contradictions rather than silently changing them. Do not add fuzzy matching or silently bypass conflicting IDs in the captain picker. Consider the remaining uniquely matched missing links only as a separately reviewed scope.

No member IDs, names, emails or credentials are included in this report. Production access was SELECT-only. No repair, import, location reassignment, role change or authorization change was executed.

## Validation

Direct execution of the chart sort expression passed descending-count, natural-name, nonmutation and empty-scope checks. Lint passed with six existing warnings and no errors. Normal production build compiled successfully, then encountered the established .next/cache/.tsbuildinfo EPERM lock. All 646 existing automated tests passed. The isolated clean production build passed. git diff --check passed. Browser interaction with the new local toggle has not been claimed as verified.
