-- ============================================================
-- TravelBeez · Vize €90 · visa_applications ↔ trips bağı
-- ============================================================
-- Vize başvurusu ödemeye trip'e bindirilerek gidiyor (Commit A).
-- Bir vize → bir trip (createTrip, idempotencyKey = application_id).
-- ON DELETE SET NULL: trip silinse de başvuru kaybolmaz.
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS visa_applications_trip_id_idx
  ON public.visa_applications(trip_id);
