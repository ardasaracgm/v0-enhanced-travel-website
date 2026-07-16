-- 033_visa_vessel_tilos.sql
-- ============================================================================
-- TravelBeez · Vize · vessel_type CHECK'i 'ferry_tilos' icin GENISLET
--
-- Form artik yalniz "Feribot — Tilos" sunuyor (VESSEL_TYPES = ['ferry_tilos']).
-- Ama 005'teki CHECK yalniz ('ferry_san_nicolas','catamaran_seastar') kabul
-- ediyor -> kod deploy edilir edilmez her yeni vize submit'i 23514 check
-- violation ile PATLAR. Bu migration o kapiyi acar.
--
-- NEDEN DARALTMA DEGIL GENISLETME:
-- Prod'da 7 satir eski degeri tasiyor (5x ferry_san_nicolas, 2x catamaran_
-- seastar; 2026-06-07..2026-07-15, hepsi pending_payment). CHECK'i yalniz
-- ('ferry_tilos') yapmak IKI sekilde yanlis olurdu:
--   1) ALTER TABLE ADD CONSTRAINT mevcut satirlarda dogrulamadan gecmez ->
--      migration calismaz.
--   2) O satirlari 'ferry_tilos'a cevirmek, birinin GERCEKTE hangi gemiyle
--      geldigi bilgisini tahrif etmek olur. Tarihsel kayit dokunulmazdir.
-- Uc deger de kabul edilir: eskiler OKUNUR kalir, yenisi YAZILABILIR olur.
-- Hangisinin SUNULDUGUNU uygulama katmani (VESSEL_TYPES) belirler, DB degil.
--
-- SIRALAMA — KRITIK: bu migration KOD DEPLOY'UNDAN ONCE calistirilmali.
-- Tersi olursa deploy ile migration arasindaki pencerede her vize submit'i
-- patlar. Migration once kosarsa pencere zararsizdir (form eski degerleri
-- sunmaya devam eder, ucu de gecerlidir).
--
-- NOT NULL: 008 zaten DROP NOT NULL yapmisti (draft'lar icin) -> dokunulmuyor.
-- ============================================================================

-- ── 1) Mevcut CHECK'i bul ve dusur ──────────────────────────────────────────
-- 005'te kisit INLINE tanimli (CHECK (vessel_type IN (...))) -> adini Postgres
-- otomatik atadi. Ad TAHMIN EDILMEZ: pg_constraint'ten tanimina gore bulunur.
-- Bulunamazsa RAISE ile PATLAR — sessizce no-op olup 2. adimda "eski kisit hala
-- duruyor, yeni deger yine reddediliyor" durumuna dusmekten iyidir.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
    FROM pg_constraint
   WHERE conrelid = 'public.visa_applications'::regclass
     AND contype  = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%vessel_type%';

  IF cname IS NULL THEN
    RAISE EXCEPTION
      'vessel_type CHECK kisiti bulunamadi — 033 zaten uygulanmis olabilir ya da sema beklenenden farkli. Elle kontrol et: \d visa_applications';
  END IF;

  EXECUTE format('ALTER TABLE public.visa_applications DROP CONSTRAINT %I', cname);
  RAISE NOTICE 'Dusurulen kisit: %', cname;
END $$;

-- ── 2) Uc degerli yeni CHECK — bu kez ADLI ──────────────────────────────────
-- Adli tanimlaniyor ki bir sonraki gemi eklemesi tahmin etmek zorunda kalmasin.
ALTER TABLE public.visa_applications
  ADD CONSTRAINT visa_applications_vessel_type_check
  CHECK (vessel_type IN ('ferry_san_nicolas', 'catamaran_seastar', 'ferry_tilos'));

-- ── 3) Teyit ────────────────────────────────────────────────────────────────
-- Bunu calistir, ciktida ucu de gormelisin:
--   SELECT pg_get_constraintdef(oid)
--     FROM pg_constraint
--    WHERE conrelid = 'public.visa_applications'::regclass
--      AND conname  = 'visa_applications_vessel_type_check';
--
-- Mevcut dagilimi gormek icin:
--   SELECT vessel_type, count(*) FROM public.visa_applications GROUP BY 1;
