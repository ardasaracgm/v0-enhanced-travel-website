-- ============================================================
-- TravelBeez · Admin · profiles.admin_role (kapı-içi kısıt)
-- ============================================================
-- 016 is_admin = "admin kapısı" (bu kullanıcı admin mi). admin_role =
-- "kapı içinde ne görebilir": 'full' tüm admin sayfaları, 'cars_only'
-- yalnız /admin/cars. is_admin AYNEN korunur; admin_role onun altında
-- ikinci bir kısıt katmanıdır (is_admin false ise admin_role anlamsız).
--
-- Mevcut tüm satırlar DEFAULT 'full' alır → mevcut adminler
-- (ardasaracgm, moralilar, yavuz, info@ferrybee.com = Dimitri) tam
-- erişimde kalır, hiçbir manuel işlem gerekmez.
--
-- cars_only ATAMA SQL'i AYRI ve K2 SONRASINA ertelendi: guard'lar
-- (sayfa negatif-gate + action sıkılaştırma) canlı olmadan atama
-- yapılırsa kullanıcı kısıtlanmadan admin görür. Bu migration yalnız
-- kolonu ekler, kimseyi cars_only yapmaz.
--
-- CHECK var ama enum YOK → normal transaction güvenli.
-- Run: SQL Editor → New query → Run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_role text NOT NULL DEFAULT 'full'
  CHECK (admin_role IN ('full', 'cars_only'));

-- ============================================================
-- VERIFY (ayrı çalıştır):
--   select id, email, is_admin, admin_role from public.profiles where is_admin;
-- Beklenen: mevcut adminlerin hepsi admin_role = 'full'.
-- ============================================================
