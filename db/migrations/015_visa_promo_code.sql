-- ============================================================
-- TravelBeez · Vize kuponu · promo_code kolonu
-- ============================================================
-- Geçerli kupon kodu girilen başvuru ÜCRETSİZ ilerler: createTrip/Viva
-- atlanır, state doğrudan 'documents_submitted' olur, kod buraya yazılır.
-- Kodların KENDİSİ env'de (VISA_PROMO_CODES), tabloda değil — burada yalnız
-- kullanılan kod saklanır (admin filtre/rapor için). ON kolon nullable.
-- Run in Supabase SQL Editor → New query → paste → Run.
-- ============================================================

ALTER TABLE public.visa_applications
  ADD COLUMN IF NOT EXISTS promo_code text;

CREATE INDEX IF NOT EXISTS visa_applications_promo_code_idx
  ON public.visa_applications(promo_code) WHERE promo_code IS NOT NULL;
