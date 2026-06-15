-- ============================================================
-- TravelBeez · Viva · trips.confirmation_email_sent_at
-- ============================================================
-- Race-safe, single-owner paid (confirmed) email. Two confirm paths can run
-- concurrently for one trip: the success-URL action (confirmFromReturn) and the
-- async Viva webhook. confirmTrip's state flip is read-then-write (NOT atomic),
-- so its alreadyConfirmed flag cannot reliably mark "I was the first confirmer"
-- — binding the email to it risks a double send (or, as today, none at all).
--
-- This nullable timestamp is claimed with ONE conditional UPDATE:
--   UPDATE public.trips SET confirmation_email_sent_at = now()
--   WHERE id = $1 AND confirmation_email_sent_at IS NULL
--   RETURNING id;
-- Postgres serialises the two concurrent claims via the row lock, so EXACTLY one
-- caller sees NULL and gets a row back (the email owner); the other gets 0 rows.
-- Email ownership is thus decoupled from the (non-atomic) state flip.
--
-- Enum YOK → normal transaction güvenli. Run: SQL Editor → New query → Run.
-- ============================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;

-- ============================================================
-- VERIFY (ayrı çalıştır):
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'trips'
--     and column_name = 'confirmation_email_sent_at';
-- ============================================================
