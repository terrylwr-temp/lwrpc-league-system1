# Member location repair and import correction

2026-09-07. Owner approved repair of the 11 missing Esplanade at the Heights links, separate review of the Indigo conflict, correction of the import path and checking other missing links. This is separate from LMS-0724 View As User design. No version change or deployment performed.

## Production repair completed

Fresh read-only candidate review confirmed the exact 11 Esplanade records still had NULL location_id and an exact unique active location-name match. An encrypted DPAPI CurrentUser backup, ACL-restricted to the current Windows user and SYSTEM, was written and read back successfully before mutation. Backup file is in the existing private-artifacts/member-location-repair operational directory, outside source control. Plaintext SHA-256: fcea28049776380d181cecabaa9601803e20b7007f194fbe7f55bd2f998afa25.

One bounded UPDATE repaired only location_id on those 11 reviewed IDs. The statement rechecked the unchanged location text, still-NULL link, active catalog entry and unique exact name match, with row locks. Result: approved 11, repaired 11, all other fields unchanged 11 (per-row comparison excluding location_id). Member identity triggers are limited to identity-relevant columns and do not run for this location-only UPDATE. No team, roster, role, Auth, rating, corpus or schema change was made.

Post-repair production query matches the captain dropdown's active-member rule: **13 eligible members linked to Esplanade at the Heights**, zero remaining NULL links with that displayed name, and the one Indigo conflict unchanged. Refresh Teams & Rosters to reload the options. This repair is already live and does not require an application deployment.

## Other missing links checked, not changed

Before repair, 84 members had a nonblank location name without a link. Seventy-seven uniquely matched an active location. Eleven were the approved Esplanade repair; **66 additional exact-match candidates remain** for a separately approved repair scope. Seven remaining names do not exactly match an active catalog entry:

| Name | Count |
| --- | ---: |
| Sarasota National | 1 |
| Del Webb Parrish | 1 |
| Not Listed/Enter in Comment | 1 |
| Lakehouse Cove @ LWR | 1 |
| Longboat Key Public | 2 |
| LWR Golf and CC | 1 |

After repair, 73 named-but-unlinked records remain: 66 exact matches plus seven needing review. No fuzzy/alias assignment was performed. The separate prior diagnosis found many textual catalog aliases among existing non-null links; that is not authority to overwrite those links.

The 66 exact-match candidates span: Artisan Lakes - Esplanade Palmetto (3), River Strand G&CC (4), The Isles (2), Del Webb of LWR (10), Azario - Esplanade (5), Cresswind (5), LWR High School (4), Lakewood National (9), Indigo @ LWR (3), Country Club East (3), Del Webb Catalina (3), Bayfront (1), Shoreview LWR Waterside (1), Bridgewater (3), Del Webb Parrish/Bayview (2), Waterside (1), Canoe Creek (2), Arbor Grande of LWR (1), Open (2), Wildblue (1), Sweetwater (1). Recheck current state before any later repair; do not overwrite concurrent manager edits.

## Indigo conflict review

The held member displays Esplanade at the Heights but has an Indigo @ LWR link. Five latest retained import entries, September 2–5, all explicitly contain Club/Location = Esplanade at the Heights. This supports the displayed text, but no authoritative location-change event was found that proves the Indigo assignment was accidental. Leave it unchanged for owner confirmation. The member was identified privately to the owner; no member identity/contact fields are committed here.

## Import correction implemented locally

- Preview now fetches club_location and location_id. Previously both were omitted, so existing location text could be mistaken for an empty field and overwritten by import text without changing the link.
- New records receive both text and location_id in the same insert when there is exactly one active trimmed/case-insensitive catalog-name match.
- Existing text wins over differing import text. A missing link can be filled from that existing name, not a conflicting incoming name.
- Existing non-null links are preserved. Differing names (including possible aliases), unresolved names and ambiguous matches are counted for review, not auto-reassigned.
- Updates compare both location fields against the preview before writing. Concurrently changed rows are skipped and reported; they are excluded from successful update counts.
- The import completion notice/summary includes location-review and stale-row counts.

Changed application files: app/member-import/page.js; new app/lib/memberImportLocation.js. Added test/memberImportLocation.test.mjs covering insertion, existing-name precedence, conflicting-link preservation, inactive/duplicate matches, aliases, blank input and normalized exact matching. No database migration or production import was run. These code changes require later deployment before they protect future production imports.

## Validation

652 automated tests passed (six new). Normal build compiled successfully then encountered the established .next/cache/.tsbuildinfo EPERM lock. Lint passed with zero errors and six existing warnings. The isolated clean production build passed. git diff --check passed. No production import or synthetic member creation was used for validation.
