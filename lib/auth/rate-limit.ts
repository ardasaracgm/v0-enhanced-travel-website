import 'server-only'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Vercel'de client IP. x-real-ip'i Vercel yazar ve client EZEMEZ (authoritative);
 * Vercel'de HER ZAMAN gelir.
 *
 * x-forwarded-for fallback'i BILEREK yok: onun split[0]'i client-kontrollu olur
 * (attacker her istekte farkli IP uydurup rate-limit'i asabilirdi). x-real-ip
 * yoksa (non-Vercel / dev) 'unknown' -> tek bucket, hepsi birlikte rate-limited
 * (fail-closed). Prod=Vercel'de 'unknown'a asla dusulmez.
 */
export function clientIp(h: Headers): string {
  return h.get('x-real-ip')?.trim() || 'unknown'
}

type RateLimitArgs = {
  /**
   * Rate-limit deposu tablosu. SABIT literal olmali (kullanici girdisi DEGIL) —
   * cagiranlar 'admin_login_attempts' gibi literal verir. Tablo `(ip, attempted_at)`
   * kolonlarina ve deny-all RLS'e sahip olmali (bkz. 031 / 032 migration).
   */
  table: string
  ip: string
  windowMs: number
  max: number
}

/**
 * DB-backed, per-IP rate-limit (031 pnr_lookup_attempts deseninin generic hali).
 *
 * Serverless STATELESS -> in-memory sayac tutulamaz, deneme sayaci DB'de. Her
 * cagri (basarili islem dahil) bir satir birakir -> saldirgan basarili bir
 * istekle sayaci sifirlayamaz.
 *
 * FAIL-CLOSED: insert/count altyapisi hata verirse { limited: true }. Aksi halde
 * bir DB hatasi tum rate-limit'i sessizce bypass ederdi.
 *
 * Esik: count > max (>, >= DEGIL) -> ilk `max` deneme gecer, `max`+1'inci engellenir.
 * Cagiran kendi denemesini de sayar (once insert, sonra count).
 */
export async function checkRateLimit({
  table,
  ip,
  windowMs,
  max,
}: RateLimitArgs): Promise<{ limited: boolean }> {
  const supabase = getSupabaseAdmin()

  // Her denemeyi (basarili dahil) say.
  const { error: insErr } = await supabase.from(table).insert({ ip })
  if (insErr) return { limited: true } // fail-closed

  const windowStart = new Date(Date.now() - windowMs).toISOString()
  const { count, error: cntErr } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('attempted_at', windowStart)
  if (cntErr) return { limited: true } // fail-closed
  if ((count ?? 0) > max) return { limited: true }

  // Best-effort temizlik: 1 saatten eski satirlari at (cron yok). Hata YUTULUR
  // (supabase-js throw etmez, {error} doner) -> cagiran akisi bloklamaz.
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()
  await supabase.from(table).delete().lt('attempted_at', oneHourAgo)

  return { limited: false }
}
