'use client'

// package box standalone siparişi — oturum-başına idempotency key (luggage
// order-key deseni birebir). Mount'ta üret + sessionStorage cache → retry/çift-tık
// aynı key → createTrip mevcut trip'i döner. Başarıda temizle.
const KEY = 'package_box_order_idempotency_key'

function newKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'idk-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getOrCreatePackageBoxOrderKey(): string {
  if (typeof window === 'undefined') return newKey() // SSR guard (kullanılmaz)
  const existing = sessionStorage.getItem(KEY)
  if (existing) return existing
  const k = newKey()
  sessionStorage.setItem(KEY, k)
  return k
}

export function clearPackageBoxOrderKey(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY)
}
