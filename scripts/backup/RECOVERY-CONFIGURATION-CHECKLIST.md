# LWRPC LMS Configuration Recovery Checklist

This checklist belongs inside the encrypted off-site backup. JSON snapshots beside it contain the exportable Supabase project and Auth configuration. Fields whose names indicate credentials are intentionally redacted.

## Password-manager records required

Verify that the club password manager contains current entries for:

- Supabase account recovery and MFA recovery codes
- Supabase database password
- Supabase personal access token (replace periodically)
- Backup archive password
- Brevo SMTP password or API key
- OpenAI API key
- Vercel account recovery and MFA recovery codes
- Domain registrar and DNS account recovery
- Git repository account recovery and deploy key details

Never place plaintext credentials in this checklist.

## Supabase items captured automatically

- Project reference, name, region, status, and database version where returned by the Management API
- Auth Site URL and allowed redirect URLs
- Enabled Auth providers and non-secret provider settings
- Session, JWT, signup, CAPTCHA, and rate-limit settings returned by the API
- Email subjects, HTML templates, and security-notification settings
- SMTP host, port, username, and sender identity where returned
- API-key recovery instruction; secret values are intentionally not retrieved

The API may omit write-only or platform-managed settings. Compare the recovered project against screenshots or this checklist during a restore.

## Values that must be regenerated after creating a replacement project

- Project URL and project reference
- Publishable/anon key
- Secret/service-role key
- Database connection strings
- JWT signing keys when project-specific

Update every corresponding Vercel environment variable after regeneration, then redeploy Production.

## Supabase dashboard review after restore

- Authentication > URL Configuration
- Authentication > Providers
- Authentication > Email Templates
- Authentication > SMTP Settings
- Authentication > Rate Limits
- Authentication > Hooks and security notifications
- Storage > Buckets, policies, file limits, and MIME restrictions
- Database > Extensions
- Database > API/Data API exposed schemas
- Database > Network Restrictions and SSL enforcement
- Database > Backups
- Project Settings > API keys
- Edge Functions and their secrets

## Vercel recovery review

- Production, Preview, and Development environment-variable names and scope
- Supabase URL and newly generated keys
- OpenAI key and model configuration
- Brevo or other email configuration used by the application
- Production domain: league.lwrpickleballclub.com
- Build settings, Node version, framework preset, and deployment branch
- Cron jobs and security tokens used by scheduled endpoints

## Acceptance checks after recovery

1. Compare row counts for members, locations, teams, rosters, schedules, matches, standings, and AI tables.
2. Confirm Supabase Storage files are restored separately.
3. Test password reset and transactional email delivery through Brevo.
4. Test real Player, Captain, and Commissioner accounts.
5. Verify RLS denials and database grants, especially AI/Stage 7 and service-role restrictions.
6. Verify View-As cleanup scheduling and expiration behavior.
7. Review Supabase and Vercel logs after controlled testing.
8. Rotate temporary recovery credentials and record the completed drill.
