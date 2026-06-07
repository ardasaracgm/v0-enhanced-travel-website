'use server'

// server-only isValidPromoCode'u client'a açan ince köprü (checkCarAvailability
// kalıbı). Erken-UX kontrolü; submit'teki yetkili kontrol ayrıca kalır.
import { isValidPromoCode } from '@/lib/visa-pricing'

export async function checkPromoCode(code: string): Promise<{ valid: boolean }> {
  return { valid: isValidPromoCode(code) }
}
