-- 019_car_plate_inventory.sql
-- Plate-based car inventory (Mimari B). Manual run in Supabase SQL Editor.
-- Idempotent + NON-DESTRUCTIVE: pre-existing cars rows are RETIRED (kept so their
-- car_bookings FKs — incl. the ZZ_TEST webhook probe — stay valid), never deleted.
-- One row = one plate. quantity is pinned to 1 and no longer read by the engine
-- (Parça 2 switches to plate-level conflict + status). available is set false on
-- retired rows so they drop from the public listing immediately, before Parça 2.

BEGIN;

-- 1. New columns (all additive; category likely already exists in base schema) -----
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS plate     text,
  ADD COLUMN IF NOT EXISTS model_key text,
  ADD COLUMN IF NOT EXISTS category  text,
  ADD COLUMN IF NOT EXISTS priority  int  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status    text NOT NULL DEFAULT 'active';

-- status domain: active = listed + bookable, maintenance = listed + temporarily not
-- bookable, retired = hidden from listing/assignment, retained only for old FKs.
-- NOT VALID: skip scanning existing rows at ADD time (they default to 'active',
-- which is in-set anyway; the retire UPDATE below sets them to 'retired').
ALTER TABLE public.cars DROP CONSTRAINT IF EXISTS cars_status_chk;
ALTER TABLE public.cars
  ADD CONSTRAINT cars_status_chk
  CHECK (status IN ('active','maintenance','retired')) NOT VALID;

-- Plate uniqueness. Postgres UNIQUE permits many NULLs, so legacy rows (plate NULL)
-- are unaffected; only real plates are enforced. Enables ON CONFLICT (plate) below.
ALTER TABLE public.cars DROP CONSTRAINT IF EXISTS cars_plate_uniq;
ALTER TABLE public.cars ADD CONSTRAINT cars_plate_uniq UNIQUE (plate);

-- 2. Retire every pre-existing row (those without a model_key). Runs BEFORE the
--    category CHECK is added, so legacy free-text categories are never re-validated
--    by this UPDATE. Re-run safe: new plate rows have model_key and are excluded.
UPDATE public.cars
   SET status = 'retired', available = false, quantity = 1
 WHERE model_key IS NULL;

-- 3. category domain — added AFTER the retire UPDATE so legacy rows aren't scanned.
--    NULL allowed for any legacy row that later gets touched.
ALTER TABLE public.cars DROP CONSTRAINT IF EXISTS cars_category_chk;
ALTER TABLE public.cars
  ADD CONSTRAINT cars_category_chk
  CHECK (category IS NULL OR category IN ('microcar','compact','5-seater','suv')) NOT VALID;

-- 4. Seed the new fleet (7 plates / 6 model_key pools), all active.
--    price_per_day is the base daily rate (date-based overrides are a later layer).
--    Only the Celerio pool has >1 plate, so priority is meaningful there; the two
--    Pandas are SEPARATE cards (own slug + own price). Both Celerio plates = €60.
--    specs (seats/fuel/transmission) are best-effort; flag for ops review.
INSERT INTO public.cars
  (brand,     model,               model_key,          category,   plate,      priority, status,   available, quantity, location, source,  price_per_day, seats, fuel_type,  transmission)
VALUES
  ('Fiat',    'Topolino Microcar', 'fiat-topolino',    'microcar', 'ΑΗΕ0435',  1,        'active', true,      1,        'kos',    'owned', 45,            2,     'Electric', 'Automatic'),
  ('Fiat',    'Panda Cross',       'fiat-panda-cross', 'compact',  'ΧΗΟ4041',  1,        'active', true,      1,        'kos',    'owned', 50,            5,     'Petrol',   'Manual'),
  ('Fiat',    'Panda City Life',   'fiat-panda-city',  'compact',  'ΧΖΡ1233',  1,        'active', true,      1,        'kos',    'owned', 55,            5,     'Petrol',   'Manual'),
  ('Opel',    'Corsa Edition Pack','opel-corsa',       '5-seater', 'ΧΡΙ5837',  1,        'active', true,      1,        'kos',    'owned', 60,            5,     'Petrol',   'Manual'),
  ('Suzuki',  'Celerio',           'suzuki-celerio',   '5-seater', 'KXZ3211',  1,        'active', true,      1,        'kos',    'owned', 60,            5,     'Petrol',   'Manual'),
  ('Suzuki',  'Celerio',           'suzuki-celerio',   '5-seater', 'KXZ3212',  2,        'active', true,      1,        'kos',    'owned', 60,            5,     'Petrol',   'Manual'),
  ('Hyundai', 'Bayon Premium',     'hyundai-bayon',    'suv',      'ΧΡΕ2076',  1,        'active', true,      1,        'kos',    'owned', 70,            5,     'Petrol',   'Manual')
ON CONFLICT (plate) DO NOTHING;

-- 5. Assignment index — lowest active priority within a model_key pool (Parça 2).
CREATE INDEX IF NOT EXISTS cars_model_key_priority_idx
  ON public.cars (model_key, priority) WHERE status = 'active';

COMMIT;
