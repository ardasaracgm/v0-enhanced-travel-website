-- 013_car_inventory.sql
-- Documents car-inventory schema applied live via SQL editor before versioning.
-- Idempotent — safe no-op on the live DB. Data (fleet rows) excluded; seed separately.

-- 1. cars: multi-source/location + quantity
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS quantity int  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'kos',
  ADD COLUMN IF NOT EXISTS source   text NOT NULL DEFAULT 'owned';

-- 2. car_bookings: date-overlap availability authority
CREATE TABLE IF NOT EXISTS public.car_bookings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id     uuid NOT NULL REFERENCES public.cars(id),
  trip_id    uuid REFERENCES public.trips(id),
  start_date date NOT NULL,
  end_date   date NOT NULL,
  state      text NOT NULL DEFAULT 'held',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT car_bookings_date_chk CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS car_bookings_car_id_idx ON public.car_bookings (car_id);
CREATE INDEX IF NOT EXISTS car_bookings_range_idx
  ON public.car_bookings USING gist (daterange(start_date, end_date, '[]'));

-- 3. RLS
ALTER TABLE public.car_bookings ENABLE ROW LEVEL SECURITY;
-- car_bookings: no policy = service-role only (matches live)

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon can read cars" ON public.cars;
CREATE POLICY "anon can read cars" ON public.cars
  FOR SELECT USING (true);
