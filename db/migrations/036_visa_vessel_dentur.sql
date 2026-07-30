-- 036_visa_vessel_dentur.sql
-- ============================================================================
-- TravelBeez · Vize · vessel_type CHECK'ine 'ferry_dentur' EKLE
--
-- Form artik Tilos'un yani sira Dentur'u da sunuyor
-- (VESSEL_TYPES = ['ferry_tilos', 'ferry_dentur']). 033'teki CHECK yalniz
-- ('ferry_san_nicolas','catamaran_seastar','ferry_tilos') kabul ediyor -> kod
-- deploy edilir edilmez her 'ferry_dentur' submit'i 23514 check violation ile
-- PATLAR. Bu migration o kapiyi acar.
--
-- GENISLETME, daraltma DEGIL: dort eski deger de OKUNUR kalir, yenisi
-- YAZILABILIR olur. Hangisinin SUNULDUGUNU uygulama katmani (VESSEL_TYPES)
-- belirler, DB degil.
--
-- SIRALAMA — KRITIK: bu migration KOD DEPLOY'UNDAN ONCE calistirilmali.
-- Tersi olursa deploy ile migration arasindaki pencerede her Dentur submit'i
-- patlar. Migration once kosarsa pencere zararsizdir (form eski Tilos'u sunmaya
-- devam eder, o gecerlidir).
--
-- KISIT ADI: 033 kisiti ADLI tanimlamisti (visa_applications_vessel_type_check)
-- ki bir sonraki ekleme tahmin etmek zorunda kalmasin -> dogrudan adiyla dusuruyoruz.
-- ============================================================================

-- ── 1) Mevcut adli CHECK'i dusur ─────────────────────────────────────────────
ALTER TABLE public.visa_applications
  DROP CONSTRAINT visa_applications_vessel_type_check;

-- ── 2) Dort degerli yeni CHECK — yine ADLI ───────────────────────────────────
ALTER TABLE public.visa_applications
  ADD CONSTRAINT visa_applications_vessel_type_check
  CHECK (vessel_type IN (
    'ferry_san_nicolas', 'catamaran_seastar', 'ferry_tilos', 'ferry_dentur'
  ));

-- ── 3) Teyit ────────────────────────────────────────────────────────────────
-- Ciktida dordunu de gormelisin:
--   SELECT pg_get_constraintdef(oid)
--     FROM pg_constraint
--    WHERE conrelid = 'public.visa_applications'::regclass
--      AND conname  = 'visa_applications_vessel_type_check';
