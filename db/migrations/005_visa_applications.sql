-- ============================================================
-- TravelBeez · Vize-1 · Schengen door-visa applications
-- ============================================================
-- In-house replacement for the external jotform. Phase 1:
-- form + validation + submission only. NO file upload, NO
-- signature, NO payment (later phases).
--
-- DESIGN NOTE — every field is a first-class typed column (NOT
-- jsonb). A later phase generates a Greek/bilingual PDF printout
-- for the Greek port authorities by reading these columns under
-- fixed Greek labels. `metadata` jsonb is for true overflow only.
--
-- Enum-like fields use CHECK constraints with canonical slugs,
-- matching passengers.gender (migration 004). Human labels live
-- in i18n (visaPage.form.options.*), not in the DB. Occupation
-- slugs are the 35 jotform values, stored verbatim.
--
-- STATE — web submits land in 'pending_payment' (payment is wired in
-- Vize-3); the column DEFAULT matches. 'new'/'in_progress' are kept for
-- manually-created/admin rows, plus the review terminals.
--
-- Today-relative rules (birthDate < today, docIssueDate <= today,
-- docExpiryDate >= today) are enforced in Zod + the server action,
-- NOT as DB CHECKs — Postgres disallows non-immutable now() in
-- CHECK. Column-vs-column rules ARE enforced here as backstops.
--
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visa_applications (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workflow / housekeeping --------------------------------------------
  state                    text NOT NULL DEFAULT 'pending_payment'
                             CHECK (state IN ('new','in_progress','pending_payment','reviewed','approved','rejected')),
  locale                   text NOT NULL DEFAULT 'tr'
                             CHECK (locale IN ('tr','en')),          -- form is TR+EN only
  source                   text DEFAULT 'web',
  idempotency_key          text,                                    -- optional; mirrors trips (nullable)

  -- Step 1 · Travel ----------------------------------------------------
  entry_point              text NOT NULL
                             CHECK (entry_point IN ('kos','kalymnos','rhodos')),
  vessel_type              text NOT NULL
                             CHECK (vessel_type IN ('ferry_san_nicolas','catamaran_seastar')),

  -- Step 2 · Personal --------------------------------------------------
  last_name                text NOT NULL,
  first_name               text NOT NULL,
  father_name              text NOT NULL,
  mother_name              text NOT NULL,
  birth_date               date NOT NULL,
  birth_place              text NOT NULL,
  birth_country            text NOT NULL,
  gender                   text NOT NULL
                             CHECK (gender IN ('male','female')),   -- visa form: Male|Female only
  marital_status           text NOT NULL
                             CHECK (marital_status IN ('single','married','separated','divorced','widowed')),

  -- Step 3 · Document --------------------------------------------------
  id_number                text NOT NULL,                          -- TR kimlik / national ID
  doc_type                 text NOT NULL
                             CHECK (doc_type IN ('normal','diplomatic','service','official','special')),
  doc_number               text NOT NULL,
  doc_issue_date           date NOT NULL,
  doc_expiry_date          date NOT NULL,
  issuing_authority        text NOT NULL,

  -- Step 4 · Contact ---------------------------------------------------
  residence_address        text NOT NULL,
  email                    text NOT NULL,
  phone                    text NOT NULL,                          -- REQUIRED (scope change)
  lives_in_other_country   boolean NOT NULL,                       -- Yes|No → bool
  occupation               text NOT NULL
                             CHECK (occupation IN (
                               'architect','artisan','legal','artist','farmer',
                               'banker','tradesman','manager','clergy','driver',
                               'researcher','teacher','whiteCollar','civilServant','politician',
                               'computerExpert','electronicsExpert','chemicalEngineer','technician','journalist',
                               'medicalPharma','seaman','blueCollar','selfEmployed','fashionCosmetics',
                               'policeMilitary','pensioner','sportsman','noOccupation','student',
                               'diplomat','magistrate','companyExecutive','housewife','househusband'
                             )),

  -- Step 5 · Trip ------------------------------------------------------
  travel_purpose           text NOT NULL
                             CHECK (travel_purpose IN ('tourism','business')),
  stay_duration            integer NOT NULL
                             CHECK (stay_duration BETWEEN 1 AND 7),
  schengen_last_3_years    boolean NOT NULL,                       -- Yes|No → bool
  fingerprints_taken       boolean NOT NULL,                       -- Yes|No → bool
  schengen_entry_date      date NOT NULL,
  schengen_exit_date       date NOT NULL,

  -- Overflow only (NOT for any field above) ----------------------------
  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Cross-field integrity (column-vs-column backstops for the Zod refines).
  -- now()-relative rules live in Zod + the server action, not here.
  CONSTRAINT visa_doc_dates_ck    CHECK (doc_expiry_date >= doc_issue_date),
  CONSTRAINT visa_schengen_ck     CHECK (schengen_exit_date >= schengen_entry_date),

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index for optional idempotency (mirrors trips 002/003).
CREATE UNIQUE INDEX IF NOT EXISTS visa_applications_idempotency_key_idx
  ON public.visa_applications(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Admin funnel lookups
CREATE INDEX IF NOT EXISTS visa_applications_state_idx
  ON public.visa_applications(state);
CREATE INDEX IF NOT EXISTS visa_applications_created_at_idx
  ON public.visa_applications(created_at DESC);

-- ============================================================
-- RLS — mirrors the inquiries/leads convention:
--   • anon may INSERT (public form submit)
--   • NO anon SELECT/UPDATE/DELETE (PII-heavy lead data)
--   • the service-role key (server actions) bypasses RLS entirely
-- ============================================================
ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visa_applications_anon_insert" ON public.visa_applications;
CREATE POLICY "visa_applications_anon_insert"
  ON public.visa_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'visa_applications'
ORDER BY ordinal_position;
