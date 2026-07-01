/**
 * Booking-flow WhatsApp / sales-phone builders.
 *
 * Numbers and the payment/support message templates now live in lib/contact.ts
 * (single source). These thin wrappers keep the original signatures so existing
 * callers (create-trip, visa-wizard) and the widely-imported `Locale` type are
 * untouched. NOTE: the WhatsApp number is now locale-aware (TR vs EL/EN) and the
 * sales line is the Greek landline — both sourced from lib/contact.
 */
import {
  buildWhatsAppLink,
  buildPaymentMessage,
  buildSupportMessage,
  getLandline,
  type Locale,
} from '@/lib/contact'

export type { Locale }

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
  return buildWhatsAppLink(locale, buildPaymentMessage(locale, { reference, totalAmount, currency }))
}

export function buildSupportWhatsAppLink({
  locale = 'en',
  context,
}: {
  locale?: Locale
  context?: string
} = {}): string {
  return buildWhatsAppLink(locale, buildSupportMessage(locale, context))
}

export function getSalesPhoneLink() {
  return getLandline()
}
