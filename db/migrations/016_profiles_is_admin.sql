-- ============================================================
-- TravelBeez · Admin · profiles.is_admin bayrağı
-- ============================================================
-- 012 profiles tablosuna admin yetki bayrağı. Admin route'u (RSC gate)
-- önce giriş yapmış kullanıcıyı doğrular, sonra KENDİ profiles satırından
-- bu kolonu okur (profiles_select_own RLS own-row izni yeter — service-role
-- gerekmez). Veri okuma/yazma ise service-role ile yapılır; bu kolon yalnız
-- "bu kullanıcı admin mi" gate'i içindir.
--
-- Yetkilendirme manuel: ilgili kullanıcı için Supabase SQL Editor'da
--   update public.profiles set is_admin = true where email = '<admin email>';
--
-- Enum YOK → normal transaction güvenli. Run: SQL Editor → New query → Run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ============================================================
-- VERIFY (ayrı çalıştır):
--   select id, email, is_admin from public.profiles where is_admin;
-- ============================================================
