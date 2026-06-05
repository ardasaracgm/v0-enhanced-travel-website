-- ============================================================
-- TravelBeez · baseline · trip_item_type enum (L1 ↔ L2 single source)
-- ============================================================
-- The Kademe 1 base schema (11 tables, enums) was applied directly in the
-- Supabase SQL editor and never checked into the repo. That left the native
-- Postgres enum `public.trip_item_type` undocumented here, so it could drift
-- silently from the TypeScript mirror `TripItemType` in lib/supabase.ts.
--
-- This migration DOCUMENTS that enum in the repo, idempotently. It changes
-- NOTHING on the current production DB — verified 2026-06-05 the live enum
-- already holds exactly these 11 values, identical (and in the same order) to
-- lib/supabase.ts `TripItemType`. Running it again is a safe no-op.
--
-- Ordering note: numbered 000 because it predates 002_* (the original 001 base
-- schema lives only in Supabase history). On a fresh DB the DO block bootstraps
-- the type; on the existing DB the ADD VALUE statements are no-ops.
--
-- ⚠️ `ALTER TYPE ... ADD VALUE` cannot run inside a surrounding transaction in
-- older Postgres — run these as standalone statements (Supabase SQL editor
-- executes each separately). `IF NOT EXISTS` requires PG 12+.
--
--   • Enum type: public.trip_item_type
--   • TS mirror: lib/supabase.ts → TripItemType
--   • Adding a new service type? Add the value here AND to TripItemType, then
--     add a registry descriptor (lib/trip-items/registry.ts). See the
--     "new type checklist".
-- ============================================================

-- Fresh-DB bootstrap: create the type with all values only if it is absent.
-- (No-op on the existing DB, where Kademe 1 already created it.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'trip_item_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.trip_item_type AS ENUM (
      'ferry', 'transfer', 'car_rental', 'tour', 'hotel', 'package_pickup',
      'insurance', 'esim', 'visa', 'custom', 'luggage'
    );
  END IF;
END$$;

-- Idempotent value guarantee (no-op for values that already exist).
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'ferry';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'transfer';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'car_rental';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'tour';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'hotel';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'package_pickup';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'insurance';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'esim';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'visa';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'custom';
ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'luggage';

-- Verify (manual):
-- SELECT enum_range(NULL::public.trip_item_type);
--   → must list all 11 values above; must match lib/supabase.ts TripItemType.
