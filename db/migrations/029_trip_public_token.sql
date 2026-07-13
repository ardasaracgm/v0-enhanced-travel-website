-- 029_trip_public_token.sql
-- trips.public_token: unguessable, permanent public capability for the /ticket/[token]
-- page (QR target, Kademe 2). Service-role reads it (getSupabaseAdmin) — no anon RLS
-- policy needed, same as travel_companions.consent_token (024).
--
-- Safe 4-step sequence (nullable → backfill → default → not-null) so existing rows
-- never violate NOT NULL. gen_random_uuid() is already used across the DB (024/013/006).
-- Enum YOK → normal transaction. Run: SQL Editor → New query → Run.

-- 1) add nullable (no default yet)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS public_token uuid;

-- 2) backfill every existing row
UPDATE public.trips
  SET public_token = gen_random_uuid()
  WHERE public_token IS NULL;

-- 3) default for future inserts (createTrip needs no code change)
ALTER TABLE public.trips
  ALTER COLUMN public_token SET DEFAULT gen_random_uuid();

-- 4) lock it down: not-null + unique
ALTER TABLE public.trips
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trips_public_token_key
  ON public.trips (public_token);

-- ============================================================
-- VERIFY (ayrı çalıştır):
--   select count(*) as total, count(public_token) as with_token,
--          count(distinct public_token) as distinct_token
--   from public.trips;
--   -- total == with_token == distinct_token bekleriz
-- ============================================================
