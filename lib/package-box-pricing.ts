import 'server-only'

import {
  PACKAGE_BOX_RATES_EUR,
  PACKAGE_BOX_MIN_MONTHS,
  PACKAGE_BOX_MAX_MONTHS,
  packageBoxFreeMonths,
  type PackageBoxSize,
} from '@/lib/package-box-rates'

// ============================================================
// TravelBeez · package-box · server-side fiyat hesabı
// ============================================================
// Kutu kirası flat AYLIK. Tüm para CENTS (EUR). Asla client'tan fiyat alma.
// ============================================================

// Aylık tarife (cents). TEK KAYNAK: lib/package-box-rates.ts (EUR) ×100.
export const PACKAGE_BOX_MONTHLY_RATES_CENTS = Object.fromEntries(
  Object.entries(PACKAGE_BOX_RATES_EUR).map(([size, eur]) => [size, eur * 100]),
) as Record<PackageBoxSize, number>

function assertValidSize(size: string): asserts size is PackageBoxSize {
  if (!(size in PACKAGE_BOX_MONTHLY_RATES_CENTS)) {
    throw new RangeError(`package-box: unknown size "${size}"`)
  }
}

/**
 * Kutu kirası toplam fiyatı (cents) — flat aylık, ÜCRETSİZ-AY indirimli:
 * billableMonths = months − hediye ay; total = billableMonths × aylık tarife.
 * months 1..12 tam sayı. İndirim tam ay olduğundan cents kayıpsız. Geçersizde
 * RangeError (çağıran try/catch ile { ok:false }'a çevirir — luggage deseni).
 */
export function calculatePackageBoxTotalCents(size: string, months: number): number {
  assertValidSize(size)
  if (
    !Number.isInteger(months) ||
    months < PACKAGE_BOX_MIN_MONTHS ||
    months > PACKAGE_BOX_MAX_MONTHS
  ) {
    throw new RangeError(
      `package-box: months must be an integer in ${PACKAGE_BOX_MIN_MONTHS}..${PACKAGE_BOX_MAX_MONTHS}, got ${months}`,
    )
  }
  const billableMonths = months - packageBoxFreeMonths(months)
  // Guard: en az 1 ödenen ay. months≥1 + eşik tablosu (minMonths hep
  // freeMonths'tan büyük) buna asla aykırı düşmez; yine de assert.
  if (billableMonths < 1) {
    throw new RangeError(
      `package-box: billableMonths must be >= 1, got ${billableMonths} (months=${months})`,
    )
  }
  return billableMonths * PACKAGE_BOX_MONTHLY_RATES_CENTS[size]
}

/**
 * Bitiş tarihi = başlangıç + N takvim ayı (ay-sonu clamp). Fiyatı ETKİLEMEZ
 * (flat aylık); yalnız görüntü/metadata. UTC tabanlı, saat yok.
 * Örn: 2026-01-31 + 1 ay → 2026-02-28.
 */
export function packageBoxEndDate(startDate: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate)
  if (!m) throw new RangeError(`package-box: invalid startDate "${startDate}", expected YYYY-MM-DD`)
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  // round-trip guard: 2026-02-31 gibi taşan tarihi yakala.
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new RangeError(`package-box: invalid calendar date "${startDate}"`)
  }
  const targetIndex = month - 1 + months
  const targetYear = year + Math.floor(targetIndex / 12)
  const targetMonth = ((targetIndex % 12) + 12) % 12 // 0..11
  const daysInTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const day2 = Math.min(day, daysInTarget) // ay-sonu clamp
  return new Date(Date.UTC(targetYear, targetMonth, day2)).toISOString().slice(0, 10)
}
