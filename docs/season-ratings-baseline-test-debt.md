# MUST-FIX — accepted-baseline test-suite cleanup

Status: OPEN, separate from Season Ratings release. Owner authorized recording this debt, not bundling its correction into candidate 1cf9fb25.

Seven Ask LWR expectations predate this candidate and must be reconciled with the accepted Important Dates/date intent behavior. Three rollback/function-identity tests have line-ending-sensitive fixture/guard mismatches (0724 prosrc equality; 0728 restored lookup hash; 0729 second-apply feedback hash). Review deployment/recovery identity requirements before changing these tests or guards; preserve drift protection, metadata, business data and idempotence checks. Verify supported Windows and LF environments in the cleanup.

Completion requires a separately reviewed correction and full-suite pass; none of the ten failures is resolved or waived globally. See season-ratings-baseline-differential-release.md for the complete ten-test matrix and evidence links.
