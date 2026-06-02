-- ============================================================
-- TravelBeez · Vize (redesign) · draft applications
-- ============================================================
-- Vize akışı yeniden tasarımı, Faz 1 / Adım 1.
--
-- The form now creates a row UP FRONT (on form open) in state 'draft',
-- then keeps it as the single application record through the whole flow:
--   draft  → (final submit) → pending_payment → documents_submitted → …
-- This lets us attach uploaded documents to a real application_id while the
-- applicant is still filling the form, instead of inserting only at the end.
--
-- Two changes are needed on the migration-005 table:
--   (A) every form-step column must become NULLABLE — a brand-new draft has
--       no answers yet. The authoritative "all required fields present" gate
--       moves to Zod in the final-submit server action (NOT the DB), exactly
--       like the today-relative date rules already do.
--   (B) the state CHECK constraint must accept 'draft'.
--
-- NOTHING about the typed-column design (005) changes: each field is still a
-- first-class column for the Greek PDF printout. We are only relaxing NOT NULL.
--
-- NOTE on the existing CHECK constraints: the enum/range/cross-field CHECKs
-- (entry_point IN …, stay_duration BETWEEN 1 AND 7, visa_doc_dates_ck,
-- visa_schengen_ck) all evaluate to NULL — i.e. PASS — when their column is
-- NULL, so a half-empty draft does not trip them. No CHECK edits required for (A).
--
-- Idempotent throughout: ALTER COLUMN … DROP NOT NULL is a no-op if already
-- nullable; the state CHECK uses the 007 drop-then-recreate pattern.
--
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

-- ------------------------------------------------------------
-- (A) Relax NOT NULL on the 28 form-step columns
--     (housekeeping columns — state, locale, metadata, created_at,
--      updated_at — intentionally stay NOT NULL; source & idempotency_key
--      were already nullable.)
-- ------------------------------------------------------------

-- Step 1 · Travel
ALTER TABLE public.visa_applications ALTER COLUMN entry_point            DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN vessel_type            DROP NOT NULL;

-- Step 2 · Personal
ALTER TABLE public.visa_applications ALTER COLUMN last_name              DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN first_name             DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN father_name            DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN mother_name            DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN birth_date             DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN birth_place            DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN birth_country          DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN gender                 DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN marital_status         DROP NOT NULL;

-- Step 3 · Document
ALTER TABLE public.visa_applications ALTER COLUMN id_number              DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN doc_type               DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN doc_number             DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN doc_issue_date         DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN doc_expiry_date        DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN issuing_authority      DROP NOT NULL;

-- Step 4 · Contact
ALTER TABLE public.visa_applications ALTER COLUMN residence_address      DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN email                  DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN phone                  DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN lives_in_other_country DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN occupation             DROP NOT NULL;

-- Step 5 · Trip
ALTER TABLE public.visa_applications ALTER COLUMN travel_purpose         DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN stay_duration          DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN schengen_last_3_years  DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN fingerprints_taken     DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN schengen_entry_date    DROP NOT NULL;
ALTER TABLE public.visa_applications ALTER COLUMN schengen_exit_date     DROP NOT NULL;

-- ------------------------------------------------------------
-- (B) Add 'draft' to the state CHECK (007 drop-then-recreate pattern).
--     New canonical order:
--       draft → new → in_progress → pending_payment
--             → documents_submitted → reviewed → approved → rejected
-- ------------------------------------------------------------
ALTER TABLE public.visa_applications
  DROP CONSTRAINT IF EXISTS visa_applications_state_check;

ALTER TABLE public.visa_applications
  ADD CONSTRAINT visa_applications_state_check
  CHECK (state IN (
    'draft',
    'new',
    'in_progress',
    'pending_payment',
    'documents_submitted',
    'reviewed',
    'approved',
    'rejected'
  ));

-- ============================================================
-- Verify
-- ============================================================
-- Nullability of every column (form-step columns should now read 'YES').
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'visa_applications'
ORDER BY ordinal_position;

-- The refreshed state CHECK.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.visa_applications'::regclass
  AND conname = 'visa_applications_state_check';
