-- 025_companion_owner_name.sql
-- Denormalised owner display name for the consent surface. Set at invite time
-- (Parça 3b) so the invite email and the token-gated consent page can show
-- "X added you" without joining auth.users/profiles from an anon context.
-- Nullable — consent page falls back to 'TravelBeez'.

alter table public.travel_companions add column owner_name text;
