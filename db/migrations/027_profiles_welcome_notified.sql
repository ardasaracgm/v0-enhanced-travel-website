-- 027_profiles_welcome_notified.sql
-- Signup notification flag. The auth callback fires exactly ONE internal
-- "new member" notice per user (to NOTIFY_ADDRESS) via an atomic claim
-- (UPDATE ... WHERE welcome_notified_at IS NULL) — idempotent across the
-- every-login callback (magic-link + Google OAuth).
--
-- Apply the ADD + the backfill TOGETHER: without the backfill, every EXISTING
-- member would fire a false "new member" notice on their next login. The
-- backfill marks them already-notified, so only sign-ups AFTER this migration
-- (welcome_notified_at left NULL by the on_auth_user_created insert) get flagged.

alter table public.profiles add column welcome_notified_at timestamptz;

update public.profiles set welcome_notified_at = now() where welcome_notified_at is null;
