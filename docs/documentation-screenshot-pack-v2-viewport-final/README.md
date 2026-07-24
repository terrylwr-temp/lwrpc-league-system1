# LWRPC Documentation Screenshot Pack v2 — Viewport Edition

This is the print-ready documentation library for the League Managers & Commissioners Operations Manual.

## Capture standard

- 116 curated screenshots, each a genuine PNG.
- Desktop Playwright viewport captures only: 1905–1920px wide by 1080px high.
- No browser or operating-system chrome.
- No stitched or full-page images.
- Long pages are represented by consecutive, natural scroll positions (about 900px apart) rather than a stitched composite.
- Existing realistic club, member, team, location, league, and match records are shown. No records were created or changed for documentation.
- Relevant accordion lists are expanded before capture, including division and team reference lists.

## File groups

| Prefix | Content |
| --- | --- |
| `01-admin-dashboard-*` | Dashboard overview, analytics, and operations navigation |
| `02-members-*` | Member search/table workflow plus Add Member form |
| `03-member-detail-*` | Member review and edit workflow |
| `04-ratings-*` | Season-ratings workflow |
| `05-seasons-*`, `06-leagues-*`, `07-divisions-*` | League-structure workflows and create forms |
| `08-teams-*` | Expanded team list plus add, edit, and copy-team dialogs |
| `10-scheduling-*`, `11-schedule-editor-*` | Schedule setup and visual schedule editor |
| `12-scoring-*`, `13-match-detail-*` | Match operations, new match, score entry, and match detail |
| `14-standings-*` through `20-score-sheets-*` | Standings and system-management pages |
| `21-tournaments-*` through `24-pbcourtcommand-*` | Supporting operations modules |

## Workflow coverage note

The app's **Generate Schedule** action opens a browser-native confirmation. Native browser dialogs cannot be captured in a clean page viewport without browser chrome, so the scheduling frames document its prepared, expanded workflow state. The confirmation was dismissed without changing schedule data.

Near-identical short-page frames were intentionally excluded from this final library. The staged capture directory is not part of the deliverable; use this folder for manual production.
