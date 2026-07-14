-- 032_admin_audit.sql
-- ============================================================================
-- Admin denetim (audit) altyapisi + sifreli admin girisi rate-limit deposu.
--
-- Bu migration IKI tablo kurar, IKI AYRI amac:
--
--   1) admin_audit_log      -> DENETIM IZI ("kim ne yapti"). Login/logout (K1)
--                              ve tum admin yazma islemleri (K2) buraya yazilir.
--                              TAMPER-PROOF: append-only, service_role bile
--                              satir silemez/degistiremez.
--
--   2) admin_login_attempts -> THROTTLE sayaci. /admin-login brute-force'u IP
--                              bazli sinirlar (031 pnr_lookup_attempts deseni).
--
-- Basarisiz bir giris HER IKISINE de yazilir: admin_login_attempts'e (sayac)
-- ve admin_audit_log'a (iz). Farkli amaclar, farkli tablolar.
--
-- RLS: her iki tabloda da policy TANIMLANMAZ -> anon/authenticated deny-all.
-- Yalniz SERVICE_ROLE (getSupabaseAdmin) RLS'i bypass ederek erisir.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) admin_audit_log  (denetim izi, tamper-proof / append-only)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id           bigint generated always as identity primary key,

  -- Aktor: FK YOK (bilerek). Kullanici hard-delete edilse bile iz yasar; ayrica
  -- basarisiz login'de gecerli bir user olmayabilir -> actor_id null olabilir.
  actor_id     uuid,
  -- Denormalize snapshot: email degisse/silinse de "kim" oldugu kalir.
  actor_email  text,

  -- 'admin.login.success' | 'admin.login.failure' | 'admin.logout' (K1)
  -- 'payment.confirm' | 'reservation.create' | 'visa.state' ... (K2)
  action       text        not null,

  -- Hedef nesne (login'de null; K2'de 'trip'/'car'/'visa' + id).
  target_type  text,
  target_id    text,

  -- Serbest baglam: {negotiated_rate:0, original_rate:...}, {reason:'...'} vb.
  details      jsonb       not null default '{}'::jsonb,

  ip           text,
  created_at   timestamptz not null default now()
);

-- Goruntuleme/filtre (K2 /admin/audit) icin.
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists admin_audit_log_action_idx
  on public.admin_audit_log (action, created_at desc);

-- TAMPER-PROOF katman 1/3: deny-all RLS (policy tanimlanmaz).
-- anon/authenticated hicbir erisim alamaz; service_role RLS'i bypass eder.
alter table public.admin_audit_log enable row level security;

-- TAMPER-PROOF katman 2/3: append-only trigger.
-- RLS service_role'u DURDURMAZ (bypassrls). Bu trigger UPDATE/DELETE'i service_role
-- icin de bloklar -> log yazildiktan sonra hicbir uygulama yolu satiri
-- degistiremez/silemez. (Yalniz DB-owner/superuser trigger'i dusurebilir; bu
-- ayri ve daha yuksek bir tehdit seviyesi.)
create or replace function public.admin_audit_log_no_mutate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_audit_log is append-only (% is not allowed)', tg_op;
end;
$$;

drop trigger if exists admin_audit_log_append_only on public.admin_audit_log;
create trigger admin_audit_log_append_only
  before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_no_mutate();

-- TAMPER-PROOF katman 3/3: grant seviyesinde de UPDATE/DELETE kaldir.
-- (Supabase yeni public tablolara default olarak service_role'e ALL verir.)
revoke update, delete on public.admin_audit_log from anon, authenticated, service_role;

comment on table public.admin_audit_log is
  'Admin denetim izi (kim ne yapti). Append-only/tamper-proof: RLS deny-all + trigger + revoke -> service_role bile satir silemez/degistiremez. Sadece INSERT (service_role). Login/logout (K1) + yazma islemleri (K2).';


-- ----------------------------------------------------------------------------
-- 2) admin_login_attempts  (rate-limit sayaci, 031 pnr deseni)
-- ----------------------------------------------------------------------------
-- Serverless STATELESS -> in-memory sayac tutulamaz, deneme sayaci DB'de.
-- Her /admin-login denemesi (basarili dahil) bir satir birakir; admin-login
-- action son 60 sn'deki ayni IP satir sayisini sayar, esik (8/dk) asilinca
-- engeller. Basarili deneme de sayilir -> saldirgan sayaci sifirlayamaz.
create table if not exists public.admin_login_attempts (
  id           bigint generated always as identity primary key,
  ip           text        not null,
  attempted_at timestamptz not null default now()
);

-- Son-60sn / ip bazli count sorgusu icin.
create index if not exists admin_login_attempts_ip_time_idx
  on public.admin_login_attempts (ip, attempted_at desc);

-- Deny-all: policy tanimlanmaz; service_role zaten RLS'i bypass eder.
alter table public.admin_login_attempts enable row level security;

comment on table public.admin_login_attempts is
  'Rate-limit deposu: /admin-login brute-force sinirlama (IP bazli). Sadece service_role erisir. 1 saatten eski satirlar admin-login action tarafindan best-effort temizlenir.';
