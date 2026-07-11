-- 028_activate_grande_panda.sql
-- Activate the Fiat Grande Panda (seeded coming-soon in 023) as a real, bookable
-- plate. Manual run in Supabase SQL Editor — APPLIED IN PROD 2026-07-11 (this file
-- records the change already made; re-running is safe/idempotent).
--
-- Seed 023 left it: plate=NULL, status='maintenance', coming_soon=true → listed but
-- not bookable. All other fields (price_per_day=65, category='compact', seats=5,
-- transmission='Automatic', location='kos', source='owned') confirmed correct and
-- unchanged. Activation flips exactly the three gates assignPlate() checks
-- (car-availability.ts:200-205): status='active' AND coming_soon=false AND a plate.
--
-- Single plate for this model (quantity=1). plate has a UNIQUE constraint (019);
-- XPY3835 is new so no conflict.

BEGIN;

UPDATE public.cars
SET coming_soon = false,
    status      = 'active',
    plate       = 'XPY3835'
WHERE model_key = 'grande-panda';

COMMIT;
