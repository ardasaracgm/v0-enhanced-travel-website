-- ============================================================
-- TravelBeez · Vize-2 · Visa document uploads
-- ============================================================
-- One row per uploaded document file for a visa_applications row.
-- Files themselves live in Cloudflare R2 (private bucket); this table
-- holds only the metadata + the R2 object key.
--
-- RE-UPLOAD MODEL — the upload flow keeps history rather than overwriting:
-- on a fresh upload for the same (application_id, doc_type), the previous
-- status='uploaded' row is flipped to status='replaced' and a NEW row is
-- inserted. The current file for a doc_type is therefore the single
-- status='uploaded' row. The old R2 object is left in place (cheap; admin /
-- lifecycle cleanup can prune 'replaced' keys later).
--
-- doc_type is intentionally free text (NO CHECK): the catalogue of required
-- documents is config-driven (lib/visa-documents.ts, Vize-2 step 4), not a
-- fixed DB enum.
--
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visa_documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  application_id     uuid NOT NULL
                       REFERENCES public.visa_applications(id) ON DELETE CASCADE,

  doc_type           text NOT NULL,                 -- config slug (lib/visa-documents.ts)

  -- R2 storage --------------------------------------------------------
  r2_key             text NOT NULL,                 -- visa/{app}/{doc_type}/{uuid}-{file}
  original_filename  text NOT NULL,
  mime_type          text NOT NULL,
  size_bytes         integer NOT NULL CHECK (size_bytes > 0),

  -- Lifecycle ---------------------------------------------------------
  status             text NOT NULL DEFAULT 'uploaded'
                       CHECK (status IN ('uploaded','replaced','deleted')),

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- One *active* file per (application, doc_type). Partial unique index lets
-- 'replaced'/'deleted' history rows accumulate while guarding the live row.
-- This is the index the confirm route's replace logic relies on.
CREATE UNIQUE INDEX IF NOT EXISTS idx_visa_documents_active_unique
  ON visa_documents (application_id, doc_type)
  WHERE status = 'uploaded';

-- Admin lookups: all docs for an application, newest first.
CREATE INDEX IF NOT EXISTS visa_documents_application_idx
  ON public.visa_documents(application_id, created_at DESC);

-- ============================================================
-- RLS — mirrors visa_applications (migration 005):
--   • NO anon access at all (uploads/reads go through service-role routes)
--   • the service-role key (route handlers) bypasses RLS entirely
-- The presign + confirm routes use the service-role client, so we add NO
-- anon policy here — RLS-on with no policy = anon denied by default.
-- ============================================================
ALTER TABLE public.visa_documents ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'visa_documents'
ORDER BY ordinal_position;
