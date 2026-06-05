import 'server-only'

import { LUGGAGE_RATES_EUR, type LuggageSize, type LuggageCounts } from '@/lib/luggage-rates'

// LuggageSize + LuggageCounts tek kaynaktan (luggage-rates) gelir; mevcut
// importlar '@/lib/luggage-pricing'ten almaya devam etsin diye re-export.
export type { LuggageSize, LuggageCounts }

// ============================================================
// TravelBeez · luggage · server-side fiyat hesabı (Katman 3)
// ============================================================
// "Günlük Valiz Bırakma" için saf, server-side fiyat helper'ı.
// Tüm para CENTS dünyasında (EUR). Asla client'tan fiyat alma —
// client sadece size/tarih/adet gönderir, hesabı burası yapar.
// ============================================================

// Günlük tarife (cents). TEK KAYNAK: lib/luggage-rates.ts (EUR).
// Burada ×100 ile cents'e türetilir — elle ikinci kez tanımlanmaz.
// (counts anahtarları LuggageSize ile tutarlı — guard aşağıda.)
export const LUGGAGE_DAILY_RATES_CENTS = Object.fromEntries(
  Object.entries(LUGGAGE_RATES_EUR).map(([size, eur]) => [size, eur * 100]),
) as Record<LuggageSize, number>

// LuggageCounts artık lib/luggage-rates.ts'te (client-safe tek-kaynak),
// yukarıda re-export edildi. Guard için anahtar tipi:
type LuggageCountSize = keyof LuggageCounts

// Derleme-zamanı guard: counts anahtarları (small/medium/large) tarife
// tablosunda (LuggageSize) olmalı. Tarifesi olmayan bir size counts'a
// kaçarsa burada tip hatası alırsın.
// (Metadata-tarafı kontrol K2'de kalktı: LuggageItemMetadata artık 'size'
//  taşımıyor, flat count_* alanlarına geçti.)
type _AssertCountSizeMatch = LuggageCountSize extends LuggageSize ? true : never
const _assertCountSizeMatch: _AssertCountSizeMatch = true
void _assertCountSizeMatch

// YYYY-MM-DD'yi UTC gün-sayısına (epoch days) çevir.
// Yerel TZ'ye göre DEĞİL — Date.UTC ile sabit, saat yok.
// Geçersiz/biçimsiz tarihte açık hata.
function utcEpochDay(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) {
    throw new RangeError(`luggage: invalid date "${dateStr}", expected YYYY-MM-DD`)
  }
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const ms = Date.UTC(year, month - 1, day)
  // Round-trip kontrolü: 2026-02-31 gibi taşan tarihleri yakala.
  const d = new Date(ms)
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    throw new RangeError(`luggage: invalid calendar date "${dateStr}"`)
  }
  return Math.floor(ms / 86_400_000)
}

/**
 * Günlük valiz bırakma toplam fiyatı (cents) — çok-boyut.
 *
 * Gün = başlangıç dahil: (pickup − dropOff) + 1. Aynı gün = 1 gün.
 * Toplam = gün × Σ(counts[size] × günlük tarife[size]).
 *
 * Saf hesap; hata durumunda RangeError fırlatır (createTrip gibi
 * çağıranlar try/catch ile { ok:false, error, code }'a çevirir).
 *
 * @param counts      boyut başına adet {small,medium,large}; her biri 0..5 tam sayı, Σ ≥ 1
 * @param dropOffDate bırakma tarihi, YYYY-MM-DD (UTC tarih)
 * @param pickupDate  alma tarihi,   YYYY-MM-DD (UTC tarih)
 * @returns toplam cents (number, tam sayı)
 */
export function calculateLuggageTotalCents(
  counts: LuggageCounts,
  dropOffDate: string,
  pickupDate: string,
): number {
  // Her boyut: 0..5 tam sayı. Günlük cents tarife tablosundan (server authoritative).
  let totalPieces = 0
  let perDayCents = 0
  for (const size of ['small', 'medium', 'large'] as const) {
    const count = counts[size]
    if (!Number.isInteger(count) || count < 0 || count > 5) {
      throw new RangeError(
        `luggage: count for "${size}" must be an integer in 0..5, got ${count}`,
      )
    }
    totalPieces += count
    perDayCents += count * LUGGAGE_DAILY_RATES_CENTS[size]
  }

  // En az 1 parça şart (boş sayaçla item oluşmaz).
  if (totalPieces < 1) {
    throw new RangeError('luggage: at least one piece required (Σcounts ≥ 1)')
  }

  const dropOffDay = utcEpochDay(dropOffDate)
  const pickupDay = utcEpochDay(pickupDate)

  // pickup ≥ dropOff şart; aksi halde açık hata.
  if (pickupDay < dropOffDay) {
    throw new RangeError(
      `luggage: pickupDate (${pickupDate}) is before dropOffDate (${dropOffDate})`,
    )
  }

  const days = pickupDay - dropOffDay + 1 // başlangıç dahil
  return days * perDayCents
}
