// ============================================================
// TravelBeez · luggage · günlük tarifeler (EUR) — TEK KAYNAK
// ============================================================
// server-only DEĞİL: hem server (lib/luggage-pricing.ts cents'e türetir)
// hem client (valiz kartı display) buradan okur. Sunucu yine
// authoritative kalır — client'ın gösterdiği fiyat sadece görüntüdür.
// ============================================================

export const LUGGAGE_RATES_EUR = {
  small: 5,   // €5/gün (Küçük / Çanta)
  medium: 7,  // €7/gün (Orta)
  large: 9,   // €9/gün (Büyük)
  bag: 5,     // €5/gün (enum; UI'da gösterilmez, small'a eşit)
} as const

export type LuggageSize = keyof typeof LUGGAGE_RATES_EUR

// Çok-boyut sayacı — client + server ORTAK şekil. server-only DEĞİL:
// booking-context (client) buradan import eder, luggage-pricing (server)
// re-export eder. 'bag' burada YOK (UI sayacında gösterilmez; small'a eşit).
export interface LuggageCounts {
  small: number
  medium: number
  large: number
}
