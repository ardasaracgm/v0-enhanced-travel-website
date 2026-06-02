-- ============================================================
-- TravelBeez · Vize · Faz 1.5 · conditional / extra fields (Grup B + C)
-- ============================================================
-- HISTORY RECORD ONLY. These 4 columns were already applied manually in the
-- Supabase SQL Editor; this file exists so the schema change is versioned in
-- the repo alongside 005–008. `ADD COLUMN IF NOT EXISTS` makes a re-run a
-- harmless no-op — you do NOT need to run this again.
--
-- All nullable (draft architecture, migration 008): a brand-new draft has no
-- answers yet, so the authoritative required-ness gate is Zod in the submit
-- action, NOT the DB. Same typed-column-for-the-Greek-PDF rationale as 005.
--
-- Field map (Jotform item → column):
--   2   previous surname        → previous_last_name      (optional)
--   7A  previous nationality    → previous_nationality    (optional)
--   18  residence permit no     → residence_permit_number (conditional: lives abroad)
--   18  residence permit expiry → residence_permit_expiry (conditional: lives abroad)
--
-- Run in Supabase SQL Editor → New query → paste → Run (idempotent).
-- ============================================================

ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS previous_last_name       text;
ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS previous_nationality     text;
ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS residence_permit_number  text;
ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS residence_permit_expiry  date;

-- ============================================================
-- Verify
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'visa_applications'
  AND column_name IN (
    'previous_last_name',
    'previous_nationality',
    'residence_permit_number',
    'residence_permit_expiry'
  )
ORDER BY column_name;
