-- 024_travel_companions.sql
-- travel_companions: user-linked saved passengers with two-sided consent.
-- updated_at is maintained app-side (no trigger — matches project convention).

create table public.travel_companions (
  id       uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  first_name text not null,
  last_name  text not null,

  birth_date    date,
  contact_email text,
  contact_phone text,

  passport_number  text,
  passport_country text,
  passport_expiry  date,

  gender      text check (gender in ('male','female','unspecified')),
  nationality text,

  license_expiry date,

  is_minor             boolean not null default false,
  guardian_declaration boolean not null default false,

  status text not null default 'pending'
         check (status in ('pending','active','revoked')),
  consent_token uuid not null unique default gen_random_uuid(),
  consent_at    timestamptz,
  revoked_at    timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adult double-add guard (minors exempt — they share the guardian's master mail).
create unique index travel_companions_owner_email_adult
  on public.travel_companions (owner_id, lower(contact_email))
  where is_minor = false and contact_email is not null;

alter table public.travel_companions enable row level security;

-- Owner-only: full control over own rows. Token-gated consent/revoke bypasses
-- RLS via service-role server action (Parça 3), so no anon policy here.
create policy travel_companions_owner_all
  on public.travel_companions
  for all
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());
