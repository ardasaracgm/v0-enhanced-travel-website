-- ============================================================
-- TravelBeez · Kademe 4 · Viva Wallet order code
-- ============================================================
-- Adds viva_order_code to trips so createPaymentOrder can:
--   (a) persist the Viva order reference for webhook lookup
--   (b) skip creating a duplicate order on retry (idempotency)
--
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS viva_order_code text;

-- Partial unique index: one Viva order per trip; NULLs are fine
-- (most trips start as draft/pending with no order yet).
CREATE UNIQUE INDEX IF NOT EXISTS trips_viva_order_code_idx
  ON public.trips(viva_order_code)
  WHERE viva_order_code IS NOT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'trips'
  AND column_name  = 'viva_order_code';
