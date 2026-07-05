-- 026_companion_self.sql
-- Owner-as-companion ("Kendim"): a single self-row per owner in travel_companions,
-- managed on the hub profile page and prefilled into bookings. The self-row is
-- inserted with status='active' (consent bypassed — it's the owner's own data)
-- and contact_email NULL (sidesteps the adult double-add index and avoids a
-- self-invite email). Distinguished from invited companions by is_self.

alter table public.travel_companions add column is_self boolean not null default false;

-- At most one self-row per owner (upsert target for the profile page).
create unique index travel_companions_one_self
  on public.travel_companions (owner_id) where is_self;
