'use server'

import 'server-only'
import type { Locale } from '@/lib/notifications/whatsapp-link'
import type { LuggageCounts } from '@/lib/luggage-rates'
import { resolveLuggageItem } from '@/lib/trip-items/resolvers'
import { createTrip } from '@/lib/actions/create-trip'
import { createPaymentOrder } from '@/lib/actions/create-payment-order'
import { sendPendingBookingEmail } from '@/lib/email/send-confirmation'

const LUGGAGE_LOCATION = 'kos_port' as const

export interface SubmitLuggageOrderInput {
  idempotencyKey: string
  locale: Locale
  counts: LuggageCounts
  dropOffDate: string   // YYYY-MM-DD
  pickupDate: string    // YYYY-MM-DD
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export type SubmitLuggageOrderResult =
  | { ok: true; tripId: string; reference: string; redirectUrl?: string; paymentWhatsAppUrl: string }
  | { ok: false; code: string; error: string }

function validate(input: SubmitLuggageOrderInput): string | null {
  const { counts, dropOffDate, pickupDate, customer } = input
  if (!input.idempotencyKey || input.idempotencyKey.length < 16) return 'idempotency_key'
  const total = counts.small + counts.medium + counts.large
  if (total < 1) return 'no_pieces'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dropOffDate) || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return 'invalid_dates'
  if (pickupDate < dropOffDate) return 'invalid_date_range'
  if (!customer.firstName?.trim() || !customer.lastName?.trim()) return 'missing_name'
  if (!customer.email?.trim() || !customer.phone?.trim()) return 'missing_contact'
  return null
}

export async function submitLuggageOrder(
  input: SubmitLuggageOrderInput,
): Promise<SubmitLuggageOrderResult> {
  const validationError = validate(input)
  if (validationError) {
    return { ok: false, code: 'validation_failed', error: validationError }
  }

  // Server-side re-price via resolver (client price ignored)
  let resolved
  try {
    resolved = resolveLuggageItem({
      item: {
        type: 'luggage',
        counts: input.counts,
        dropOffDate: input.dropOffDate,
        pickupDate: input.pickupDate,
        location: LUGGAGE_LOCATION,
      },
    })
  } catch {
    return { ok: false, code: 'invalid_luggage', error: 'Luggage pricing failed' }
  }

  const fullName = `${input.customer.firstName.trim()} ${input.customer.lastName.trim()}`.trim()

  const trip = await createTrip({
    idempotencyKey: input.idempotencyKey,
    locale: input.locale,
    source: 'luggage',
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

  // Payment order (non-fatal → WhatsApp fallback)
  let redirectUrl: string | undefined
  const payment = await createPaymentOrder({ tripId: trip.tripId, locale: input.locale })
  if (payment.ok) {
    redirectUrl = payment.redirectUrl
  }

  // Pending email only on Viva-fallback + new trip
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
