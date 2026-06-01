-- ============================================================
-- TravelBeez · Vize-2 · add 'documents_submitted' application state
-- ============================================================
-- Migration 005 defined visa_applications.state as a TEXT column with an
-- inline CHECK constraint (not a Postgres enum type). Postgres auto-named that
-- inline constraint `visa_applications_state_check`.
--
-- This adds a new state between 'pending_payment' and 'reviewed', set when the
-- applicant finishes uploading their required documents (Vize-2 submit route).
-- Order: new → in_progress → pending_payment → documents_submitted → reviewed
--        → approved/rejected.
--
-- Idempotent: DROP IF EXISTS then re-ADD, so re-running is safe.
--
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

ALTER TABLE public.visa_applications
  DROP CONSTRAINT IF EXISTS visa_applications_state_check;

ALTER TABLE public.visa_applications
  ADD CONSTRAINT visa_applications_state_check
  CHECK (state IN (
    'new',
    'in_progress',
    'pending_payment',
    'documents_submitted',
    'reviewed',
    'approved',
    'rejected'
  ));

-- Verify
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.visa_applications'::regclass
  AND conname = 'visa_applications_state_check';
