import 'server-only'

// Vize başvuru ücreti — tek yetkili kaynak. Promo (Commit B) buna binecek.
// Canonical birim = cents (promo indirim matematiği cents'te yapılacak).
export const VISA_FEE_CENTS = 9000 // €90

// createTrip kontratı priceAmount'ı EUR DECIMAL ister (create-payment-order
// tekrar ×100 yapar). Bu yüzden trip item'ına cents değil bunu veriyoruz.
export const VISA_FEE_EUR = VISA_FEE_CENTS / 100 // 90

// Geçerli kupon kodları — env'den (server-only). Virgüllü liste → Set.
const PROMO_CODES = new Set(
  (process.env.VISA_PROMO_CODES ?? '').split(',').map((c) => c.trim()).filter(Boolean),
)

export function isValidPromoCode(code: string | null | undefined): boolean {
  return Boolean(code && PROMO_CODES.has(code.trim()))
}
