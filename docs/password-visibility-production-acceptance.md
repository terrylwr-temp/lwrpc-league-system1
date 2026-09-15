# Password visibility controls — production acceptance

Status: **PRODUCTION ACCEPTED** on September 15, 2026.

The Account Security Change Password form now has an independent eye button in each password field. Each button switches only its own field between masked and visible text, preserves the typed value, and announces Show/Hide state to assistive technology. Disabled recovery forms keep both values masked and disable the eye buttons.

Application identity: commit `fc05970` deployed READY as `dpl_3g8znJ2WgtjoHiGTL1PaD1jWLiZW` at `league.lwrpickleballclub.com`. Previous READY deployment `dpl_tbbTjQUM77cJAyEs3Cz5kZYf3uAg` is the application rollback target.

Validation:

- 12 focused password-reset and password-visibility tests passed.
- `npm run lint` passed with 11 existing warnings and zero errors.
- `npm run build` passed locally and in Vercel.
- Local and production browser checks showed both labeled eye controls; the invalid-link control kept all recovery actions disabled and passwords masked.
- Normal production sign-in rendered before and after deployment.
- The post-deploy Vercel runtime error scan returned no errors.
- `git diff --check` passed for the scoped application and test files.

No SQL, schema, RLS, role, authentication-policy, credentials, or production business data changed. No password was entered or submitted during acceptance. The update is limited to display behavior, so rollback is an application-only promotion to the previous deployment.
