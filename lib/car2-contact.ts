// Locale-aware contact details for the car2 (rebuilt car-rental) surface.
//
// TR travelers reach the Turkish-speaking sales line; EL/EN reach the Greek
// office line. The single landline is locale-independent. wa.me format = no
// '+', no spaces. Kept separate from lib/notifications/whatsapp-link.ts (which
// is the booking-confirmation number) so car2's contact policy can evolve on
// its own without touching the islandbee shared components.

export type Car2Locale = 'tr' | 'el' | 'en'

const WHATSAPP: Record<Car2Locale, string> = {
  tr: '905421450457', // +90 542 145 0457
  el: '306955154544', // +30 6955 154 544
  en: '306955154544',
}

const WHATSAPP_DISPLAY: Record<Car2Locale, string> = {
  tr: '+90 542 145 0457',
  el: '+30 6955 154 544',
  en: '+30 6955 154 544',
}

const LANDLINE_DISPLAY = '+30 224 2220 224'
const LANDLINE_HREF = 'tel:+302242220224'

function normalize(locale: string): Car2Locale {
  return locale === 'tr' || locale === 'el' ? locale : 'en'
}

export function getCar2WhatsAppNumber(locale: string): string {
  return WHATSAPP[normalize(locale)]
}

export function getCar2WhatsAppDisplay(locale: string): string {
  return WHATSAPP_DISPLAY[normalize(locale)]
}

/** wa.me deep link for the given locale, optionally pre-filled with a message. */
export function buildCar2WhatsAppLink(locale: string, message?: string): string {
  const num = getCar2WhatsAppNumber(locale)
  return message
    ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${num}`
}

export function getCar2Landline() {
  return { display: LANDLINE_DISPLAY, href: LANDLINE_HREF }
}
