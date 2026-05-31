-- ============================================================
-- TravelBeez · Kademe 7 prep · Dentur/Mira passenger fields
-- ============================================================
-- Adds the per-passenger fields the Dentur/Mira Ticket reservation
-- API (PassengerInfo) requires, so the Kademe 7 integration only MAPS
-- data instead of re-collecting it from the customer:
--   (a) gender          — passports carry M/F/X; we store a canonical
--                         value now ('male'|'female'|'unspecified').
--                         The Dentur wire-value mapping is deferred to K7.
--   (b) passport_expiry  — optional on our side; Dentur optional field.
--
-- first_name / last_name ALREADY exist on passengers — no change needed.
-- No Dentur/Mira API calls are wired yet (Kademe 7).
--
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

ALTER TABLE public.passengers
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IN ('male', 'female', 'unspecified')),
  ADD COLUMN IF NOT EXISTS passport_expiry date;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'passengers'
  AND column_name  IN ('gender', 'passport_expiry')
ORDER BY column_name;
