// Single-source contact details for the whole site.
//
// WhatsApp: TR travelers reach the Turkish-speaking line; EL/EN reach the
// Greek line. The landline is locale-independent. wa.me format = no '+', no
// spaces. The booking payment/support message templates were moved here
// VERBATIM from notifications/whatsapp-link.ts so numbers and copy share one
// home. Framework-free (no 'server-only') → usable in client and server.

export type Locale = 'tr' | 'el' | 'en'

const WHATSAPP: Record<Locale, string> = {
  tr: '905421450457', // +90 542 145 0457
  el: '306955154544', // +30 6955 154 544
  en: '306955154544',
}

const WHATSAPP_DISPLAY: Record<Locale, string> = {
  tr: '+90 542 145 0457',
  el: '+30 6955 154 544',
  en: '+30 6955 154 544',
}

const LANDLINE_DISPLAY = '+30 224 2220 224'
const LANDLINE_HREF = 'tel:+302242220224'

function normalize(locale: string): Locale {
  return locale === 'tr' || locale === 'el' ? locale : 'en'
}

// ── WhatsApp (locale-aware) ──
export function getWhatsAppNumber(locale: string): string {
  return WHATSAPP[normalize(locale)]
}

export function getWhatsAppDisplay(locale: string): string {
  return WHATSAPP_DISPLAY[normalize(locale)]
}

/** wa.me deep link for the locale, optionally pre-filled with a message. */
export function buildWhatsAppLink(locale: string, message?: string): string {
  const num = getWhatsAppNumber(locale)
  return message
    ? `https://wa.me/${num}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${num}`
}

// ── Landline (locale-independent) ──
export function getLandline() {
  return { display: LANDLINE_DISPLAY, href: LANDLINE_HREF }
}

// ── Call link (locale-aware) ──
// Arama butonu: TR → Türk hattı (WhatsApp ile AYNI fiziksel hat, tek kaynak
// WHATSAPP.tr'den türetilir → 'tel:+905421450457'). el/en → Yunan sabit hat
// (landline). WhatsApp'ın Yunan MOBİL no'sunu aynalamaz — arama için ayrı
// politika. { display, href } şekli getLandline() ile bire bir uyumlu.
export function getPhoneCall(locale: string): { display: string; href: string } {
  if (normalize(locale) === 'tr') {
    return { display: WHATSAPP_DISPLAY.tr, href: `tel:+${WHATSAPP.tr}` }
  }
  return { display: LANDLINE_DISPLAY, href: LANDLINE_HREF }
}

// ============================================================
// Localized message templates — moved VERBATIM from
// notifications/whatsapp-link.ts (payment/support copy word-for-word).
// ============================================================

const paymentMessage: Record<Locale, string> = {
  en: `Hello TravelBeez, I'd like to confirm payment for my booking.\n\nReference: {ref}\nAmount: {amount} {currency}\n\n⏳ Your reservation will be cancelled if payment is not made within 1 hour.\n\nThank you!`,
  tr: `Merhaba TravelBeez, rezervasyonum için ödeme onayı almak istiyorum.\n\nReferans: {ref}\nTutar: {amount} {currency}\n\n⏳ Rezervasyonunuz 1 saat içinde ödeme yapılmazsa iptal edilir.\n\nTeşekkürler!`,
  el: `Γεια σας TravelBeez, θα ήθελα να επιβεβαιώσω την πληρωμή για την κράτησή μου.\n\nΑναφορά: {ref}\nΠοσό: {amount} {currency}\n\n⏳ Your reservation will be cancelled if payment is not made within 1 hour.\n\nΕυχαριστώ!`,
}

const supportMessage: Record<Locale, string> = {
  en: `Hello TravelBeez, I have a question about my booking.`,
  tr: `Merhaba TravelBeez, rezervasyonumla ilgili bir sorum var.`,
  el: `Γεια σας TravelBeez, έχω μια ερώτηση σχετικά με την κράτησή μου.`,
}

export function buildPaymentMessage(
  locale: Locale,
  { reference, totalAmount, currency = 'EUR' }: { reference: string; totalAmount: number; currency?: string },
): string {
  return paymentMessage[locale]
    .replace('{ref}', reference)
    .replace('{amount}', String(totalAmount.toFixed(2)))
    .replace('{currency}', currency)
}

export function buildSupportMessage(locale: Locale, context?: string): string {
  const base = supportMessage[locale]
  return context ? `${base}\n\n${context}` : base
}
