# Read-only duplicate DUPR inventory — September 11, 2026

Production SELECT/catalog reads only. No UPDATE/INSERT/DELETE, Auth changes, Import, Clean, merge or deactivation. Emails masked in the report. Inventory groups nonblank DUPR IDs by uppercase(trim(dupr_id)) where is_active_member=true.

## Finding

Terry Adelman (43e1e363-82f1-47d7-a869-befed4c967b8) is the authoritative current membership/account identity supported by the evidence. Terry Captain (a6cc5885-f6da-41f2-8bdc-88596b176d96) is a separately created manual member/account using the same DUPR ID. The name, missing membership link and tournament display name Terry Player suggest an auxiliary role/test persona for Terry, not an independently verified second club membership. This is an inference: the inspected data does not establish the creator's intent or conclusively prove both accounts belong to the same human.

## Terry Adelman

- Member ID: 43e1e363-82f1-47d7-a869-befed4c967b8
- Email: te***@lwrpickleballclub.com
- DUPR ID: 1R9LNE
- Activity: is_active_member=true; is_active=true; membership_status=Active.
- MembershipWorks ID: 6970334d03ecc53a270a5350; account identifier: 6970334d03ecc53a270a5350.
- Joined: 2022-02-12; renewal: 2027-12-31.
- Created: 2026-05-06 00:19:48.951277; membership sync: 2026-05-18 18:59:20.011089+00.
- Assigned LMS role: commissioner.
- Auth-linked: YES through user_roles; Auth ID 430a30c1-c161-4217-84db-bd6c7940959c; email te***@lwrpickleballclub.com; confirmed 2026-05-06T01:42:59.154656+00:00; last sign-in 2026-09-11T11:40:01.33101+00:00; not banned/deleted.
- League roster rows: 0. Match/lineup player references: 0 in inspected current tables.
- Season Ratings: one 26/27 Saturday Season row, all five working/final fields blank; no Fall row. Rating row ID: b2e88b42-b7ba-4e9c-9646-175f1f896eb5.
- Private current rating source, input_state and initialization provenance references: 0.

Three inactive Saturday / SDUPR7 teams reference him as captain (no roster rows):

- LHC Cove-rt Ops: 4d084755-ed08-4913-8c73-ef332055369d.
- Liquid Ranch Renegades: 047bcaaf-b88b-4429-b183-f8e03030fa8f.
- LWN Pickle Posse: 632e1e60-494a-4bd1-bd3c-e276dac9c231.

Round-robin player reference: 85d1f1bc-17fd-42e5-b13a-9ddeb2f57ffe; group afb28eab-aadd-4112-9247-0529fe4915e4; active; display Terry Adelman; DUPR 1R9LNE. Historical member notes also mention Esplanade Kitchen Killers and Don't Dink and Drive; notes are not current roster references.

Other retained administrative history includes 56 member import batches, 29 answer feedback events, document creator/updater/processor/activation references, six notification-template history entries, and an applied/non-rolled-back identity review associating his Commissioner Auth account with this member.

## Terry Captain

- Member ID: a6cc5885-f6da-41f2-8bdc-88596b176d96
- Email: te***@gmail.com
- DUPR ID: 1R9LNE
- Activity: is_active_member=true; is_active=true; membership_status=NULL (not a verified Active membership status).
- MembershipWorks ID: none; account identifier: manual:d45682ba-2b2e-44c4-a9a5-17b6c5a3d83a.
- Joined: not recorded; renewal: not recorded.
- Created: 2026-05-21 21:13:22.442559; membership sync: none.
- Assigned LMS role: player.
- Auth-linked: YES through user_roles; Auth ID 246d0c7d-1561-4cf0-a766-cb9d0a50f933; email te***@gmail.com; confirmed 2026-05-22T01:52:43.358499+00:00; last sign-in 2026-07-20T13:44:38.412379+00:00; not banned/deleted.
- League roster rows: 0. Match/lineup player references: 0 in inspected current tables.
- Season Ratings: one 26/27 Saturday Season row, all five working/final fields blank; no Fall row. Rating row ID: 7ebdf475-fca1-442c-8ab8-ad0dc3a4fc5f.
- Private current rating source, input_state and initialization provenance references: 0.

Tournament contact: 7d17f276-682a-45ad-ad39-bcaa0a103bbe; display name Terry Player; player slot 1; team Esplanade Net Ninjas (Esp GCC), team ID d8dd1cae-669f-4349-badf-e03c6048436a; tournament ID a450eb3b-3734-4688-99a0-86da99b8e5da; created June 23, 2026. No league team leadership or round-robin member references found.

## Answers and correction assessment

1. **Why two active records:** the legitimate imported MembershipWorks member predates the manual record (May 6 versus May 21). The manual record stores the same DUPR ID and is flagged active. The database has no unique DUPR-ID index; the current Add Member path permits an entered DUPR ID without a uniqueness check. This explains how the state is possible, but does not identify who entered it or whether the DUPR ID was supplied at creation versus later.
2. **Duplicates or different members:** distinct database records and distinct confirmed Auth accounts/emails. Only Adelman has authoritative club-membership provenance. Captain appears to be an auxiliary persona; do not automatically merge two authenticated identities based solely on the DUPR ID.
3. **Authoritative identity:** keep Terry Adelman, member 43e1e363-82f1-47d7-a869-befed4c967b8, MembershipWorks 6970334d03ecc53a270a5350, Commissioner Auth 430a30c1-c161-4217-84db-bd6c7940959c. Membership status Active, renewal 2027-12-31, current sign-in and reviewed identity linkage all support this conclusion.
4. **Is clearing the incorrect DUPR ID sufficient?** Yes for this DUPR matching conflict, assuming owner confirms Captain should not hold Terry's personal DUPR ID. Exactly two total member records currently carry 1R9LNE. Clearing only Captain.dupr_id would leave one matching member while retaining member IDs, emails, Auth links, roles, ratings placeholders and tournament contact/history. It would not itself import or create Terry's Fall ratings. No change executed.
5. **Merge/deactivate consequences:** Captain has a real Auth/role link, a tournament contact and a ratings row. A merge would require deliberate reconciliation of these links and both season-row keys; deletion cascades member_season_ratings and nulls user_roles/tournament contact member references. Deactivation preserves stored history but changes active-member access/eligibility and triggers identity coordination. Importer duplicate counting covers ALL member records, so deactivation alone does not remove the duplicate-ID block. Clearing the erroneous ID is narrower than merge/deactivation. Administrative/history references on Adelman's legitimate record must also be preserved.
6. **Other active duplicate DUPR IDs:** eight groups excluding Terry; nine total groups / eighteen active member rows. All groups currently have two members. Same-name pairs below are candidates for separate review, not proven duplicate people.

## Short active duplicate inventory

| DUPR ID | Active records | Names |
|---|---:|---|
| 1R9LNE | 2 | Terry Adelman / Terry Captain |
| 309R64 | 2 | Liam Daly / Liam Daly |
| 67POVE | 2 | Jay Solomon / Jay Solomon |
| EGL7GM | 2 | Sharon Hunt / Sharon Hunt |
| JJVRPW | 2 | John Ledford / John Ledford |
| MYLYJD | 2 | Kristin Markey / Kristin Markey |
| QP7W65 | 2 | Barbara Ritter / Barbara Ritter |
| RW4QDD | 2 | Kelly Depalo / Kelly Depalo |
| ZN5DGM | 2 | Kathleen Vacca / Kathleen Vacca |

## Reference coverage

Counted all catalog-declared foreign keys to public.members plus member/effective-member UUID columns in identity_repair_private, ratings_initialization_private, ratings_source_private, ratings_workflow_private and view_as_private. These are existing stored references, not reconstruction of deleted historical rows. No comprehensive immutable member-edit audit was found in the inspected schema; creator intent remains unconfirmed. The current importer also refuses ambiguous IDs regardless of a member's inactive flag.

