'use server'

import { headers } from 'next/headers'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { upperName } from '@/lib/text/uppercase'

/**
 * 🔐 lookupPnr — misafir (auth'suz) PNR sorgulama: reference + soyad → public_token.
 * ---------------------------------------------------------------------------
 * Ana sayfa Feribot formundaki accordion'dan cagrilir. Basarili eslesme, mevcut
 * K1 public bilet sayfasina (/[locale]/ticket/[public_token]) redirect icin token
 * dondurur. Hub'a YONLENDIRME YOK (misafir). Kapsam: yalniz feribot PNR'lari.
 *
 * GUVENLIK:
 *  - Generic hata: reference yok / soyad yanlis / iptal / ferry degil -> HEPSI
 *    'not_found'. Hangi alanin yanlis oldugu SIZDIRILMAZ (enumeration engeli).
 *  - Rate-limit ('rate_limited') AYRI kod: mesru misafire net UX, ama basarisiz
 *    eslesmeden bilgi cikarimi yine engelli.
 *  - Soyad eslesme kaynagi = passengers.last_name (trip olusunca dolu, reserve'e
 *    bagimsiz). Herhangi bir yolcunun soyadi kabul (grup/aile rezervasyonu).
 *  - Turkce normalize: upperName (tr-TR) -> İ/ı dogru.
 *  - Service-role okur (RLS bypass), get-public-ticket ile ayni desen. Client'a
 *    YALNIZCA public_token doner; baska hicbir alan (email/fiyat/passport) donmez.
 */

export type LookupPnrResult =
  | { ok: true; token: string }
  | { ok: false; error: 'not_found' | 'rate_limited' }

// TB-YY-XXXXXX. Gevsek: server RPC'nin urettigi kesin alfabe repo disi oldugu icin
// ambiguous-char (I/L/O/0/1) DAYATILMAZ -> gecerli bir referans reddedilmez.
const REFERENCE_RE = /^TB-\d{2}-[A-Z0-9]{6}$/

const RATE_WINDOW_MS = 60_000 // 60 sn
const RATE_MAX = 8 // pencere basina izinli deneme

const NOT_FOUND: LookupPnrResult = { ok: false, error: 'not_found' }

/**
 * Vercel'de client IP. x-real-ip'i Vercel yazar ve client EZEMEZ (authoritative);
 * Vercel'de HER ZAMAN gelir.
 *
 * x-forwarded-for fallback'i BILEREK yok: onun split[0]'i client-kontrollu olur
 * (attacker her istekte farkli IP uydurup rate-limit'i asabilirdi). x-real-ip
 * yoksa (non-Vercel / dev) 'unknown' -> tek bucket, hepsi birlikte rate-limited
 * (fail-closed). Prod=Vercel'de 'unknown'a asla dusulmez.
 */
function clientIp(h: Headers): string {
  return h.get('x-real-ip')?.trim() || 'unknown'
}

export async function lookupPnr(input: {
  reference: string
  lastName: string
}): Promise<LookupPnrResult> {
  // --- 1) Format gate (DB'ye gitmeden, bedava) ---
  const reference = (input.reference ?? '').trim().toUpperCase()
  const lastName = (input.lastName ?? '').trim()
  if (!REFERENCE_RE.test(reference) || lastName.length === 0) return NOT_FOUND

  const supabase = getSupabaseAdmin()

  // --- 2) Rate-limit gate (trip lookup'tan ONCE -> DB'yi brute-force'tan korur) ---
  // FAIL-CLOSED: rate-limit altyapisi (insert/count) hata verirse lookup'a GECME
  // -> aksi halde bir DB hatasi tum rate-limit'i bypass ederdi.
  const ip = clientIp(await headers())
  // Her denemeyi (basarili dahil) say -> saldirgan basarili sorguyla sayaci sifirlayamaz.
  const { error: insErr } = await supabase.from('pnr_lookup_attempts').insert({ ip })
  if (insErr) return { ok: false, error: 'rate_limited' }
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const { count, error: cntErr } = await supabase
    .from('pnr_lookup_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('attempted_at', windowStart)
  if (cntErr) return { ok: false, error: 'rate_limited' }
  if ((count ?? 0) > RATE_MAX) return { ok: false, error: 'rate_limited' }
  // Best-effort temizlik: 1 saatten eski satirlari at (cron yok). Hata YUTULUR
  // (supabase-js throw etmez, {error} doner) -> lookup'i bloklamaz.
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()
  await supabase.from('pnr_lookup_attempts').delete().lt('attempted_at', oneHourAgo)

  // --- 3) Trip lookup + iptal gate (get-public-ticket ile ayni negatif-gate) ---
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, public_token, state, cancelled_at') // email/fiyat/passport YOK
    .eq('reference', reference)
    .maybeSingle()
  if (error || !trip) return NOT_FOUND
  if (trip.state === 'cancelled' || trip.cancelled_at) return NOT_FOUND

  // --- 4) Ferry-only gate (kapsam: yalniz feribot PNR) ---
  const { count: ferryCount } = await supabase
    .from('trip_items')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', trip.id)
    .eq('item_type', 'ferry')
  if ((ferryCount ?? 0) === 0) return NOT_FOUND

  // --- 5) Soyad eslesme (herhangi bir yolcu, Turkce-normalize) ---
  const { data: passengers } = await supabase
    .from('passengers')
    .select('last_name')
    .eq('trip_id', trip.id)
  const target = upperName(lastName)
  const matched = (passengers ?? []).some((p) => upperName(p.last_name ?? '') === target)
  if (!matched) return NOT_FOUND

  // --- 6) Basari -> yalnizca token ---
  return { ok: true, token: trip.public_token }
}
