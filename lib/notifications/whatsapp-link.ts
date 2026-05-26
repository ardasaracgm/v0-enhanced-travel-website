/**
 * WhatsApp deep link generator.
 *
 * Builds wa.me URLs with pre-filled messages, for the booking
 * confirmation page's "Confirm Payment via WhatsApp" CTA and
 * for support links elsewhere in the app.
 *
 * The TravelBeez WhatsApp number is +30 22420 5008.
 */

const WA_NUMBER = '302242050008' // No spaces, no '+', wa.me format
const SALES_PHONE = '+30 22420 5009'

export type Locale = 'tr' | 'el' | 'en'

/**
 * Build a WhatsApp link for a booking payment confirmation.
 * Pre-fills a localized message that includes the booking reference.
 */
export function buildPaymentWhatsAppLink({
  reference,
  locale = 'en',
  totalAmount,
  currency = 'EUR',
}: {
  reference: string
  locale?: Locale
  totalAmount: number
  currency?: string
}): string {
  const message = paymentMessage[locale]
    .replace('{ref}', reference)
    .replace('{amount}', String(totalAmount.toFixed(2)))
    .replace('{currency}', currency)

  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}

/**
 * Build a WhatsApp link for general support.
 * Used in error states and "contact support" CTAs.
 */
export function buildSupportWhatsAppLink({
  locale = 'en',
  context,
}: {
  locale?: Locale
  context?: string
} = {}): string {
  const base = supportMessage[locale]
  const message = context ? `${base}\n\n${context}` : base
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}

/**
 * Build a tel: link for the sales line.
 * Format consistent across the site.
 */
export function getSalesPhoneLink() {
  return {
    display: SALES_PHONE,
    href: `tel:${SALES_PHONE.replace(/\s/g, '')}`,
  }
}

// ============================================================
// Localized message templates
// ============================================================

const paymentMessage: Record<Locale, string> = {
  en: `Hello TravelBeez, I'd like to confirm payment for my booking.\n\nReference: {ref}\nAmount: {amount} {currency}\n\nThank you!`,
  tr: `Merhaba TravelBeez, rezervasyonum için ödeme onayı almak istiyorum.\n\nReferans: {ref}\nTutar: {amount} {currency}\n\nTeşekkürler!`,
  el: `Γεια σας TravelBeez, θα ήθελα να επιβεβαιώσω την πληρωμή για την κράτησή μου.\n\nΑναφορά: {ref}\nΠοσό: {amount} {currency}\n\nΕυχαριστώ!`,
}

const supportMessage: Record<Locale, string> = {
  en: `Hello TravelBeez, I have a question about my booking.`,
  tr: `Merhaba TravelBeez, rezervasyonumla ilgili bir sorum var.`,
  el: `Γεια σας TravelBeez, έχω μια ερώτηση σχετικά με την κράτησή μου.`,
}
