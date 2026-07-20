'use server'

import 'server-only'
import type { Locale } from '@/lib/notifications/whatsapp-link'
import { resolvePackageBoxItem } from '@/lib/trip-items/resolvers'
import { createTrip } from '@/lib/actions/create-trip'
import { createPaymentOrder } from '@/lib/actions/create-payment-order'
import { sendPendingBookingEmail } from '@/lib/email/send-confirmation'
import {
  PACKAGE_BOX_SIZES,
  PACKAGE_BOX_MIN_MONTHS,
  PACKAGE_BOX_MAX_MONTHS,
  type PackageBoxSize,
} from '@/lib/package-box-rates'
import { todayAthensISO } from '@/lib/validation/dates'

const PACKAGE_BOX_LOCATION = 'kos' as const

export interface SubmitPackageBoxOrderInput {
  idempotencyKey: string
  locale: Locale
  size: string
  months: number
  startDate: string // YYYY-MM-DD
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export type SubmitPackageBoxOrderResult =
  | { ok: true; tripId: string; reference: string; redirectUrl?: string; paymentWhatsAppUrl: string }
  | { ok: false; code: string; error: string }

function validate(input: SubmitPackageBoxOrderInput): string | null {
  const { size, months, startDate, customer } = input
  if (!input.idempotencyKey || input.idempotencyKey.length < 16) return 'idempotency_key'
  if (!PACKAGE_BOX_SIZES.includes(size as PackageBoxSize)) return 'invalid_size'
  if (!Number.isInteger(months) || months < PACKAGE_BOX_MIN_MONTHS || months > PACKAGE_BOX_MAX_MONTHS)
    return 'invalid_months'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return 'invalid_date'
  // Server-authoritative geçmiş-tarih guard (client'taki bayat `today`e güvenme).
  if (startDate < todayAthensISO()) return 'past_date'
  if (!customer.firstName?.trim() || !customer.lastName?.trim()) return 'missing_name'
  if (!customer.email?.trim() || !customer.phone?.trim()) return 'missing_contact'
  return null
}

export async function submitPackageBoxOrder(
  input: SubmitPackageBoxOrderInput,
): Promise<SubmitPackageBoxOrderResult> {
  const validationError = validate(input)
  if (validationError) {
    return { ok: false, code: 'validation_failed', error: validationError }
  }

  // Sunucuda re-price via resolver (client fiyatı yok sayılır)
  let resolved
  try {
    resolved = resolvePackageBoxItem({
      item: {
        type: 'package_pickup',
        size: input.size,
        months: input.months,
        startDate: input.startDate,
        location: PACKAGE_BOX_LOCATION,
      },
    })
  } catch {
    return { ok: false, code: 'invalid_package_box', error: 'Package box pricing failed' }
  }

  const fullName = `${input.customer.firstName.trim()} ${input.customer.lastName.trim()}`.trim()

  const trip = await createTrip({
    idempotencyKey: input.idempotencyKey,
    locale: input.locale,
    source: 'package_pickup',
    customer: {
      fullName,
      firstName: input.customer.firstName.trim(),
      lastName: input.customer.lastName.trim(),
      email: input.customer.email.trim(),
      phone: input.customer.phone.trim(),
    },
    items: [resolved],
  })

  if (!trip.ok) {
    return { ok: false, code: trip.code, error: trip.error }
  }

  // Ödeme (non-fatal → WhatsApp fallback)
  let redirectUrl: string | undefined
  const payment = await createPaymentOrder({ tripId: trip.tripId, locale: input.locale })
  if (payment.ok) {
    redirectUrl = payment.redirectUrl
  } else {
    // Viva düşerse iz kalsın (luggage'da log YOK; burada bilinçli eklendi).
    // Akış yine WhatsApp fallback'e düşer — non-fatal.
    console.error('[package-box] createPaymentOrder failed', {
      tripId: trip.tripId,
      code: payment.code,
      error: payment.error,
    })
  }

  // Pending email yalnız Viva-fallback + yeni trip
  if (!redirectUrl && !trip.alreadyExisted) {
    await sendPendingBookingEmail({
      reference: trip.reference,
      customerName: fullName,
      contactPhone: input.customer.phone.trim(),
      contactEmail: input.customer.email.trim(),
      totalAmount: trip.totalAmount,
      currency: trip.currency,
      locale: input.locale,
      items: [
        {
          type: resolved.type,
          title: resolved.title,
          scheduledAt: resolved.scheduledAt,
          price: resolved.priceAmount,
        },
      ],
      paymentWhatsAppUrl: trip.paymentWhatsAppUrl,
    })
  }

  return {
    ok: true,
    tripId: trip.tripId,
    reference: trip.reference,
    redirectUrl,
    paymentWhatsAppUrl: trip.paymentWhatsAppUrl,
  }
}
