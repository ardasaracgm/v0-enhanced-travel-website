-- 035 · package box kutu numarası: boyut-başına sequence + claim fonksiyonu
-- Kutu no formatı KOS-{BOYUT}-{SAYI}, padding YOK. Her boyut kendi sayacı, 5370'ten.

CREATE SEQUENCE IF NOT EXISTS public.package_box_number_seq_xs START 5370;
CREATE SEQUENCE IF NOT EXISTS public.package_box_number_seq_s  START 5370;
CREATE SEQUENCE IF NOT EXISTS public.package_box_number_seq_m  START 5370;
CREATE SEQUENCE IF NOT EXISTS public.package_box_number_seq_l  START 5370;
CREATE SEQUENCE IF NOT EXISTS public.package_box_number_seq_xl START 5370;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS package_box_number text;

-- Uniqueness sequence+claim ile zaten garanti; güvenlik için kısmi unique index
-- (NULL'lar hariç → yalnız atanmış numaralar tekil).
CREATE UNIQUE INDEX IF NOT EXISTS trips_package_box_number_uniq
  ON public.trips (package_box_number)
  WHERE package_box_number IS NOT NULL;

-- Atomik claim: tek UPDATE, tek kazanan (WHERE package_box_number IS NULL).
-- nextval'in yalnız gerçek claim'de değerlenmesi BEKLENİR; iki eşzamanlı çağrıda
-- kaybeden taraf bir numara atlayabilir — zararsız (gap kabul edilebilir).
-- Uniqueness ise claim UPDATE + kısmi unique index ile garanti (numara-atlama
-- güvenliği bozmaz). Boyuta göre sequence dinamik seçilir; boyut zaten
-- PACKAGE_BOX_SIZES'tan doğrulanmış gelir, yine de fonksiyonda guard var
-- (regclass hatası yerine temiz exception).
CREATE OR REPLACE FUNCTION public.assign_package_box_number(
  p_trip_id uuid,
  p_box_size text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_number text;
BEGIN
  IF lower(p_box_size) NOT IN ('xs', 's', 'm', 'l', 'xl') THEN
    RAISE EXCEPTION 'assign_package_box_number: invalid box size %', p_box_size;
  END IF;

  UPDATE public.trips
  SET package_box_number =
    'KOS-' || upper(p_box_size) || '-' ||
    nextval(('public.package_box_number_seq_' || lower(p_box_size))::regclass)
  WHERE id = p_trip_id AND package_box_number IS NULL
  RETURNING package_box_number INTO v_number;

  -- Zaten atanmışsa (claim kaybedildi / tekrar çağrı) mevcut numarayı döndür.
  IF v_number IS NULL THEN
    SELECT package_box_number INTO v_number FROM public.trips WHERE id = p_trip_id;
  END IF;

  RETURN v_number;
END;
$$;

-- Yetkiyi DB'de kilitle: yalnız service_role çağırabilsin. "service-role çağırır"
-- kod-seviyesi varsayım değil, DB zorlaması olsun → yanlışlıkla client'tan (anon/
-- authenticated) çağrılamaz. service_role bu REVOKE'tan etkilenmez.
REVOKE EXECUTE ON FUNCTION public.assign_package_box_number(uuid, text)
  FROM public, anon, authenticated;
