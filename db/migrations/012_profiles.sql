-- ============================================================
-- TravelBeez · Hub · profiles tablosu (auth.users 1:1 uzantısı)
-- ============================================================
-- auth.users Supabase Auth şemasında; profiles onun public-şema
-- uzantısı (1:1, id = auth.users.id).
--
-- LAZY-REG: kayıt CHECKOUT'ta DEĞİL. Misafir feribot booking üyeliksiz
-- çalışmaya devam eder. Profil yalnızca confirmation'daki "Hub'a eriş"
-- CTA → signInWithOtp(email) sonrası OTP doğrulanınca trigger ile
-- otomatik oluşur. Email auth.users'da UNIQUE olduğundan AYNI email ile
-- ikinci booking MEVCUT auth.users satırına bağlanır → yeni hesap YOK;
-- trigger'daki ON CONFLICT DO NOTHING tekrar-tetiklemeyi de güvene alır.
--
-- RLS: kullanıcı yalnızca KENDİ satırını görür/günceller. INSERT'i
-- security-definer trigger yapar; anon/authenticated doğrudan insert
-- edemez (insert policy yok).
--
-- Enum YOK → normal transaction güvenli (011'in transaction'sız kuralı
-- BURAYA uygulanmaz). Çalıştırma: SQL Editor → New query → tümünü Run.
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  phone       text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- own-row SELECT
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- own-row UPDATE
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- auth.users INSERT → profiles otomatik (lazy-reg, idempotent)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone)
  values (new.id, new.email, new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VERIFY (ayrı çalıştır):
--   select * from pg_policies where tablename = 'profiles';
--   select tgname from pg_trigger where tgname = 'on_auth_user_created';
-- ============================================================
