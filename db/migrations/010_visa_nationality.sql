-- ============================================================
-- TravelBeez · Vize · Faz 1.5 · current nationality (Jotform item 7)
-- ============================================================
-- The visa form had birth_country but NO nationality/citizenship column —
-- distinct fields on a Schengen application (place of birth ≠ citizenship; a
-- person born in Germany can be a Turkish citizen). This adds the canonical
-- current-nationality field; previous_nationality (009) is its optional pair.
--
-- Nullable for the draft architecture (migration 008). Required-ness is enforced
-- in Zod on final submit, not by the DB — same pattern as every other form column.
--
-- Run in Supabase SQL Editor → New query → paste → Run (idempotent).
-- ============================================================

ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS nationality text;   -- Jotform 7 · nationality / citizenship

-- ============================================================
-- Verify
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'visa_applications'
  AND column_name  = 'nationality';
