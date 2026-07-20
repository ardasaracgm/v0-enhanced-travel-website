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
