-- 023_cars_coming_soon.sql
-- Adds a coming_soon marker + seeds two upcoming models (KIA Picanto, Fiat Grande
-- Panda): shown in the listing but never bookable. Manual run in Supabase SQL
-- Editor. Idempotent (column IF NOT EXISTS; inserts guarded by NOT EXISTS).

BEGIN;

-- coming_soon: listed in the public grid but flagged not-yet-bookable. A separate
-- axis from `available` (listing visibility) and `status` (bookability).
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS coming_soon boolean NOT NULL DEFAULT false;

-- Upcoming models: available=true (shown), coming_soon=true, status='maintenance'
-- (so getModelAvailability/assignPlate never count them → naturally "unavailable"),
-- plate=NULL. Keyed by model_key for the image convention (/cars/<model_key>.webp).
-- plate NULL means ON CONFLICT(plate) can't dedupe, so each insert is guarded by a
-- NOT EXISTS on model_key → re-run safe.
INSERT INTO public.cars
  (brand, model,                  model_key,     category,   plate, priority, status,        available, coming_soon, quantity, location, source,  price_per_day, seats, transmission)
SELECT
   'Kia', 'Picanto Optimum Auto', 'kia-picanto', '5-seater', NULL,  1,        'maintenance', true,      true,        1,        'kos',    'owned', 60,            5,     'Automatic'
WHERE NOT EXISTS (SELECT 1 FROM public.cars WHERE model_key = 'kia-picanto');

INSERT INTO public.cars
  (brand,  model,          model_key,      category,  plate, priority, status,        available, coming_soon, quantity, location, source,  price_per_day, seats, transmission)
SELECT
   'Fiat', 'Grande Panda', 'grande-panda', 'compact', NULL,  1,        'maintenance', true,      true,        1,        'kos',    'owned', 65,            5,     'Automatic'
WHERE NOT EXISTS (SELECT 1 FROM public.cars WHERE model_key = 'grande-panda');

COMMIT;
