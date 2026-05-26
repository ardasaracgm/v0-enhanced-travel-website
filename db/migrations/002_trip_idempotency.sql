-- ============================================================
-- TravelBeez · Kademe 3.1 · Trip Idempotency Migration
-- ============================================================
-- Adds an idempotency key to the trips table so the same form
-- submission cannot accidentally create duplicate trips
-- (network retries, double-clicks, accidental refreshes).
--
-- The key is generated client-side as a UUID per form session
-- and sent with the submission. The create_trip server action
-- looks it up first; if a trip already exists with this key,
-- it returns the existing trip instead of creating a duplicate.
--
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Unique index, but allow NULL (manually created trips from admin
-- panel don't need a key — only web-submitted ones do).
CREATE UNIQUE INDEX IF NOT EXISTS trips_idempotency_key_idx
  ON public.trips(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'trips'
  AND column_name = 'idempotency_key';
