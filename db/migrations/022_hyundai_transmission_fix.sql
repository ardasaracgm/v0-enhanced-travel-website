-- 022_hyundai_transmission_fix.sql
-- Data fix: the Hyundai Bayon Premium is an automatic; 019 seeded it as 'Manual'.
-- Manual run in Supabase SQL Editor. Idempotent (re-run safe).

UPDATE public.cars
   SET transmission = 'Automatic'
 WHERE model_key = 'hyundai-bayon';
