-- ============================================================
-- TravelBeez · luggage · trip_item_type enum value
-- ============================================================
-- "Günlük Valiz Bırakma" (day luggage drop-off) bir first-class trip
-- line item oluyor. Bu migration, trip_items.item_type'ın kullandığı
-- MEVCUT native Postgres enum'una (public.trip_item_type) yeni bir
-- değer ekler.
--
-- NEDEN ALTER TYPE (DROP/ADD CONSTRAINT DEĞİL) — trip_items.item_type
-- bir NATIVE POSTGRES ENUM'dur (public.trip_item_type), Kademe 1'de
-- oluşturuldu; text+CHECK kolonu DEĞİL. text+CHECK konvansiyonu yalnızca
-- daha yeni (migration 004+) tablolar içindir (visa_*, passengers).
-- trip_items'a dokunuyorsan ENUM dünyasındasın.
--   • Kolon adı: item_type  (type DEĞİL)
--   • Enum tipi: public.trip_item_type
--   • Doğrulama: 2026-06-04, PostgREST OpenAPI introspection
--
-- ⚠️ NEDEN AYRI / TRANSACTION'SIZ — PG < 12'de `ALTER TYPE ... ADD VALUE`
-- bir transaction bloğunun İÇİNDE hiç çalışmaz. Supabase'in PG 15'inde
-- txn içinde çalışır AMA eklenen değer AYNI transaction içinde
-- KULLANILAMAZ (insert/karşılaştırma 22P02 invalid enum verir). Bu yüzden:
--   1) Aşağıdaki ALTER satırını SQL Editor'de TEK BAŞINA çalıştır.
--      BEGIN/COMMIT ile sarma, başka DDL ile aynı batch'e koyma.
--   2) Commit olduktan SONRA, verify SELECT'i AYRI bir sorgu olarak çalıştır.
--   3) item_type='luggage' yazan UYGULAMA KODU ancak bu commit'ten
--      SONRA deploy edilmeli (DB önce, kod sonra).
--
-- IF NOT EXISTS → idempotent / tekrar çalıştırılabilir (PG 10+).
--
-- Çalıştırma: Supabase SQL Editor → New query → SADECE bu satır → Run.
-- ============================================================

ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'luggage';


-- ============================================================
-- VERIFY — yukarıdaki sorgu COMMIT olduktan sonra, AYRI çalıştır.
-- 'luggage' enum değer listesinde görünmeli.
-- ============================================================
-- SELECT enum_range(NULL::public.trip_item_type);
