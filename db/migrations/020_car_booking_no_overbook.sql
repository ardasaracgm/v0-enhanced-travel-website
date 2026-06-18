-- 020_car_booking_no_overbook.sql
-- assign→insert yarışına karşı DB-seviyesi overbooking guard'ı (Parça 4 sonrası ZORUNLU).
-- Aynı plakada (car_id) tarih aralıkları çakışan İKİ 'confirmed' booking'i ENGELLER.
-- Held yarışı bilinçli kapsam dışı: held'in 10-dk expiry'si DİNAMİK → statik EXCLUDE
-- predicate'ine giremez (now() immutable değil). Held provisional kalır; asıl
-- overbooking invariant'ı confirm anında DB tarafından dayatılır.

-- gist EXCLUDE içinde "car_id WITH =" için btree_gist şart.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ÖN-KONTROL geçildi (2026-06-18): tek çakışan çift orphan test verisiydi (silinen
-- bir car_id'ye bağlı iki 'confirmed' booking, TB-26-Q9WMDM + TB-26-R25MSZ) — silindi,
-- yeniden kontrol 0 döndü. EXCLUDE constraint NOT VALID desteklemediği için mevcut
-- satırlar da denetlenir; bu yüzden ekleme öncesi temizlik şarttı.

ALTER TABLE public.car_bookings DROP CONSTRAINT IF EXISTS car_bookings_no_overbook;
ALTER TABLE public.car_bookings
  ADD CONSTRAINT car_bookings_no_overbook
  EXCLUDE USING gist (
    car_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (state = 'confirmed');
