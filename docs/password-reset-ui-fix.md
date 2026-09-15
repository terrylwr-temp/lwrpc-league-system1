# Password reset invalid-link UI correction

Status: locally verified in the primary GitHub Desktop working tree; not deployed by the agent.

The reported screenshot contains `error=access_denied&error_code=otp_expired`. The page previously displayed an editable password form even when the recovery link had already failed. It reported the missing session only after submission.

The page now captures recovery URL errors, reports a fixed actionable message immediately, and disables password and passkey controls until a usable session exists. An invalid recovery URL cannot fall back to an unrelated existing session. Session access is checked again before either action; signing out clears password inputs and disables the form. Valid recovery and ordinary signed-in Change Password continue to use the existing Supabase update flow.

Validation:

- `node --test test/passwordResetAccess.test.mjs`: 9 passing controls, including invalid URL, missing/failed session, valid session, expired-before-submit, mismatched passwords, and passkey denial.
- `npm run lint`: passes with 11 existing warnings and zero errors.
- `npm run build`: passes.
- Built application browser replay at localhost:3017: the screenshot's synthetic `otp_expired` URL shows the invalid/expired message immediately; both password inputs, Update Password, and passkey registration are disabled.
- Direct reset page without a session shows the missing-session message immediately and disables the actions.
- `git diff --check`: passes.

Local browser limitation: sandbox restrictions prevented the unrelated remote logo image fetch/cache write. The reset page rendered and its disabled controls and error messages were verified successfully.

No actual password was entered or changed in browser acceptance. No production emails, credentials, business data, SQL, authentication configuration, or email templates were changed. This corrects the misleading form; it does not restore an expired link or establish whether an email scanner consumed it. The underlying link-delivery problem remains a separate investigation.

Deployment handoff: commit and push the scoped application/helper/test and documentation changes through the owner's primary GitHub Desktop repository. Application recovery is to revert this scoped patch. Production acceptance after deployment may replay a synthetic invalid-link URL without submitting credentials.
