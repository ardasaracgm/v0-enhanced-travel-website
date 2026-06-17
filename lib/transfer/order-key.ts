'use client'

// Standalone transfer siparişi için oturum-başına idempotency key (insurance
// order-key deseni). Mount'ta üretilir + sessionStorage'da cache'lenir →
// retry/çift-tık aynı key → createTrip mevcut trip'i döner. Başarıda temizlenir.
const KEY = 'transfer_order_idempotency_key'

function newKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'idk-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getOrCreateTransferOrderKey(): string {
  if (typeof window === 'undefined') return newKey() // SSR guard (kullanılmaz)
  const existing = sessionStorage.getItem(KEY)
  if (existing) return existing
  const k = newKey()
  sessionStorage.setItem(KEY, k)
  return k
}

export function clearTransferOrderKey(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY)
}
