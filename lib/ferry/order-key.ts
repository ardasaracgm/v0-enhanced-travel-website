'use client'

// Standalone feribot siparişi için oturum-başına idempotency key (insurance/
// transfer order-key deseni). Mount'ta üretilir + sessionStorage'da cache'lenir
// → retry/çift-tık aynı key → createTrip mevcut trip'i döner. Başarıda temizlenir.
// Bu key Dentur reservation'a poNumber olarak geçer (provider.ts) → PNR'ımızla
// trip referansımız hizalı, Viva flow'uyla tutarlı.
const KEY = 'ferry_order_idempotency_key'

function newKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'idk-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getOrCreateFerryOrderKey(): string {
  if (typeof window === 'undefined') return newKey() // SSR guard (kullanılmaz)
  const existing = sessionStorage.getItem(KEY)
  if (existing) return existing
  const k = newKey()
  sessionStorage.setItem(KEY, k)
  return k
}

export function clearFerryOrderKey(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY)
}
