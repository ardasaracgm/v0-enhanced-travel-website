// ============================================================
// TravelBeez · package-box · aylık tarifeler (EUR) — TEK KAYNAK
// ============================================================
// server-only DEĞİL: hem server (lib/package-box-pricing.ts cents'e türetir)
// hem client (fiyat kartı + wizard display) buradan okur. Sunucu yine
// authoritative kalır — client'ın gösterdiği fiyat sadece görüntüdür.
// ============================================================

export const PACKAGE_BOX_RATES_EUR = {
  xs: 50,
  s: 65,
  m: 75,
  l: 90,
  xl: 100,
} as const

export type PackageBoxSize = keyof typeof PACKAGE_BOX_RATES_EUR

// UI + server ORTAK sıralı boyut listesi (kart/stepper render sırası).
export const PACKAGE_BOX_SIZES: readonly PackageBoxSize[] = ['xs', 's', 'm', 'l', 'xl']

// Ay sayısı sınırları — min 1, üst sınır 12 (makul kira ufku).
export const PACKAGE_BOX_MIN_MONTHS = 1
export const PACKAGE_BOX_MAX_MONTHS = 12

// Ücretsiz-ay indirimi — eşik tablosu (büyükten küçüğe taranır). Yüzde DEĞİL,
// tam ay hediye → cents kayıpsız. client-safe + framework-free: hem pricing
// (server) hem rozet (client) buradan türer, tek kaynak.
export const PACKAGE_BOX_FREE_MONTHS: readonly { minMonths: number; freeMonths: number }[] = [
  { minMonths: 12, freeMonths: 2 },
  { minMonths: 6, freeMonths: 1 },
]

// Verilen ay sayısı için hediye ay adedi. İlk eşleşen eşik kazanır (tablo
// büyükten küçüğe sıralı); eşik altı → 0. Örn: 12→2, 11→1, 6→1, 5→0.
export function packageBoxFreeMonths(months: number): number {
  for (const tier of PACKAGE_BOX_FREE_MONTHS) {
    if (months >= tier.minMonths) return tier.freeMonths
  }
  return 0
}
