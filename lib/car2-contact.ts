// Car2 (rebuilt car-rental) contact surface.
//
// Now a thin alias over lib/contact (the single source). The car2 numbers were
// already identical to lib/contact, so behaviour is byte-identical; kept as a
// named shim so the car2 call sites (buildCar2WhatsAppLink / getCar2WhatsAppDisplay
// et al.) don't have to change.
import {
  getWhatsAppNumber,
  getWhatsAppDisplay,
  buildWhatsAppLink,
  getLandline,
  type Locale,
} from '@/lib/contact'

export type Car2Locale = Locale

export function getCar2WhatsAppNumber(locale: string): string {
  return getWhatsAppNumber(locale)
}

export function getCar2WhatsAppDisplay(locale: string): string {
  return getWhatsAppDisplay(locale)
}

export function buildCar2WhatsAppLink(locale: string, message?: string): string {
  return buildWhatsAppLink(locale, message)
}

export function getCar2Landline() {
  return getLandline()
}
