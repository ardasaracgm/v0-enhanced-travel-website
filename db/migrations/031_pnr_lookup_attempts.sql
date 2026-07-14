-- 031_pnr_lookup_attempts.sql
-- ============================================================================
-- Misafir PNR sorgulama (public /ticket lookup) icin rate-limit deposu.
--
-- Login OLMAYAN misafir, ana sayfa Feribot formundan reference (TB-YY-XXXXXX) +
-- soyad girip bileti sorgular (lib/actions/lookup-pnr.ts). Vercel serverless
-- STATELESS -> in-memory sayac tutulamaz, bu yuzden deneme sayaci DB'de.
--
-- Her sorgu denemesi (basarili dahil) bir satir birakir; lookup action son 60
-- saniyedeki ayni IP satir sayisini sayar ve esik (8/dakika) asilinca engeller.
-- Basarili sorgu da sayilir -> saldirgan basarili bir sorguyla sayaci sifirlayamaz.
--
-- RLS: policy YOK -> anon/authenticated hicbir erisim alamaz (deny-all).
-- Yalniz SERVICE_ROLE (getSupabaseAdmin) RLS'i bypass ederek okur/yazar.
-- ============================================================================

create table if not exists public.pnr_lookup_attempts (
  id           bigint generated always as identity primary key,
  ip           text        not null,
  attempted_at timestamptz not null default now()
);

-- Son-60sn / ip bazli count sorgusu icin.
create index if not exists pnr_lookup_attempts_ip_time_idx
  on public.pnr_lookup_attempts (ip, attempted_at desc);

-- Deny-all: policy tanimlanmaz; service_role zaten RLS'i bypass eder.
alter table public.pnr_lookup_attempts enable row level security;

comment on table public.pnr_lookup_attempts is
  'Rate-limit deposu: misafir PNR sorgulama (lib/actions/lookup-pnr.ts). Sadece service_role erisir. 1 saatten eski satirlar lookup action tarafindan best-effort temizlenir.';
