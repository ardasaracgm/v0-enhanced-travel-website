-- ============================================================
-- TravelBeez · transfer · trips.transfer_operator_notified_at
-- ============================================================
-- Race-safe, single-owner "yeni transfer rezervasyonu" notice to the operator
-- (Sena Grup / Milas Transfer). confirmTrip runs EVERY confirmed-side-effect on
-- EVERY call — deliberately, as the resumable backstop for a prior confirm whose
-- side-effect failed (see lib/trips/confirm.ts). So a duplicate Viva webhook
-- delivery, the success-URL action and the 23505 heal path can each invoke the
-- operator notice for one trip. Without a persistent claim the firm would get the
-- same booking two or three times.
--
-- Claimed with ONE conditional UPDATE (the 017 confirmation_email_sent_at pattern
-- verbatim):
--   UPDATE public.trips SET transfer_operator_notified_at = now()
--   WHERE id = $1 AND transfer_operator_notified_at IS NULL
--   RETURNING id;
-- Postgres serialises the concurrent claims via the row lock, so EXACTLY one
-- caller sees NULL and gets a row back (the notice owner); the others get 0 rows
-- and send nothing.
--
-- A send failure does NOT roll back the claim: a duplicate operator mail is worse
-- than a rare missed one (the office BCC + admin panel recover it).
--
-- NULL = "not notified" → the column is also the admin backstop signal: a paid
-- transfer trip with a NULL stamp was never announced to the firm.
--
-- Enum YOK → normal transaction güvenli. Run: SQL Editor → New query → Run.
-- ============================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS transfer_operator_notified_at timestamptz;

-- ============================================================
-- VERIFY (ayrı çalıştır):
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'trips'
--     and column_name = 'transfer_operator_notified_at';
-- ============================================================
