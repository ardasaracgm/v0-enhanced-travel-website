'use server'

/**
 * Server action: submitBooking
 * ============================
 * The bridge between the client-side booking flow and createTrip.
 *
 * The client passes only IDENTIFIERS (ferry IDs, car ID) — never
 * raw prices. The server looks up real prices from trusted sources
 * (mock ferry data, Supabase cars table). This prevents a malicious
 * client from posting a $0 price.
 *
 * Returns the same shape as createTrip plus a couple of helpers.
 */

import { createTrip, type CreateTripInput, type CreateTripErrorCode } from './create-trip'
import { createPaymentOrder } from './create-payment-order'
import { getFerryById } from '@/lib/ferry-mock-data'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { dateDiffInDays } from '@/lib/normalize-car'
import {
  calculateLuggageTotalCents,
  type LuggageCounts,
} from '@/lib/luggage-pricing'
import type { Locale } from '@/lib/notifications/whatsapp-link'
import { makePassengerSchema, derivePassengerType } from '@/lib/validation/booking'
import { z } from 'zod'

// ============================================================
// Input shape — trusted minimal client data
// ============================================================
// passengers[] intentionally omits phone/email; contact fields live at
// contactEmail/contactPhone (lead-only contact model).

export interface SubmitBookingInput {
  /** UUID generated client-side per booking attempt */
  idempotencyKey: string
  locale: Locale

  /** Booking line items — IDs only; server resolves prices */
  items: Array<
    | { type: 'ferry'; leg: 'outbound' | 'return'; ferryId: string; date: string }
    | { type: 'car_rental'; carId: string; days: number; pickupAt?: string; dropoffAt?: string }
    | {
        type: 'luggage'
        counts: LuggageCounts
        dropOffDate: string   // YYYY-MM-DD
        pickupDate: string    // YYYY-MM-DD
        location: string
      }
  >

  /** Number of passengers (used to multiply per-passenger ferry price) */
  passengerCount: number

  /** Passenger details (server validates required fields) */
  passengers: Array<{
    firstName: string
    lastName: string
    // '' tolerated at the type boundary; the Zod gate rejects it (defense in depth).
    gender: '' | 'male' | 'female' | 'unspecified'
    birthDate: string
    passportNumber: string
    passportExpiryDate?: string
    nationality: string
    /** Lead passenger has the contact info; others may share the email/phone */
    isLead?: boolean
  }>

  /** Contact info (snapshot at booking time) */
  contactEmail: string
  contactPhone: string

  /** Optional customer-facing note */
  notesCustomer?: string
}

export type SubmitBookingResult =
  | {
      ok: true
      tripId: string
      reference: string
      paymentWhatsAppUrl: string
      emailSent: boolean
      alreadyExisted: boolean
      /** Viva Smart Checkout redirect URL. Present when Viva order creation succeeded.
       *  Absent on graceful degradation — WhatsApp fallback applies. */
      vivaRedirectUrl?: string
    }
  | { ok: false; error: string; code: CreateTripErrorCode }

// ============================================================
// Validation schemas (Zod)
// ============================================================

const FerryItemSchema = z.object({
  type:    z.literal('ferry'),
  leg:     z.enum(['outbound', 'return']),
  ferryId: z.string().min(1),
  date:    z.string().refine(isDateInFuture, { message: 'Ferry date must be in the future' }),
})

const CarItemSchema = z.object({
  type:      z.literal('car_rental'),
  carId:     z.string().min(1),
  days:      z.number().int().positive().max(90),
  pickupAt:  z.string().optional(),
  dropoffAt: z.string().optional(),
})

// Luggage drop-off. Client sends only the selection (per-size counts/dates/
// location); the price is computed server-side in the resolve loop below —
// never trusted from the client. Dates are shape-checked here; calendar/order
// validity is enforced by calculateLuggageTotalCents.
const luggageCountField = z.number().int().min(0).max(5)
const LuggageItemSchema = z.object({
  type:        z.literal('luggage'),
  counts: z
    .object({ small: luggageCountField, medium: luggageCountField, large: luggageCountField })
    .refine((c) => c.small + c.medium + c.large >= 1, {
      message: 'At least one luggage piece required',
    }),
  dropOffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dropOffDate must be YYYY-MM-DD'),
  pickupDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pickupDate must be YYYY-MM-DD'),
  location:    z.string().min(1).max(64),
})

// Structural schema — everything EXCEPT detailed passenger validation, which
// is run separately below because it needs the (now-trusted) travel dates.
const SubmitBookingStructureSchema = z.object({
  idempotencyKey: z.string().min(8),
  locale:         z.enum(['en', 'tr', 'el']),
  items:          z.array(z.discriminatedUnion('type', [FerryItemSchema, CarItemSchema, LuggageItemSchema])).min(1),
  passengerCount: z.number().int().min(1).max(9),
  contactEmail:   z.string().email(),
  contactPhone:   z.string().trim().min(7),
  notesCustomer:  z.string().max(500).optional(),
}).refine(
  data => data.items.some(i => i.type === 'ferry' && i.leg === 'outbound'),
  { message: 'Booking must include an outbound ferry leg', path: ['items'] }
).refine(
  data => {
    const ferryLegs = data.items.filter(i => i.type === 'ferry')
    const outbound = ferryLegs.find(i => i.leg === 'outbound')
    const ret = ferryLegs.find(i => i.leg === 'return')
    // One-way (no return leg) is exempt. Lexical YYYY-MM-DD compare; >= allows
    // same-day round trips (Dentur returnSameDaySalesAmount is a real product).
    if (!ret || !outbound) return true
    return ret.date >= outbound.date
  },
  { message: 'Return date cannot be before the outbound date', path: ['items'] }
)

// ============================================================
// Implementation
// ============================================================

export async function submitBooking(input: SubmitBookingInput): Promise<SubmitBookingResult> {
  // 1a. Validate structure + items + contact. Passenger detail is validated
  //     separately below because it needs the (now-trusted) travel dates.
  const structural = SubmitBookingStructureSchema.safeParse(input)
  if (!structural.success) {
    return { ok: false, code: 'validation_failed', error: formatZodError(structural.error) }
  }

  // 1b. Authoritative travel dates = the validated outbound/return ferry legs.
  //     item.date is already YYYY-MM-DD and Zod-checked as future-dated; ferry
  //     schedules are mocked, so there is no independent server source — the
  //     server validates the user-chosen date, then uses it.
  const ferryLegs = structural.data.items.filter(
    (i): i is Extract<(typeof structural.data.items)[number], { type: 'ferry' }> =>
      i.type === 'ferry'
  )
  const outboundDate = ferryLegs.find((i) => i.leg === 'outbound')?.date
  const returnDate = ferryLegs.find((i) => i.leg === 'return')?.date

  // 1c. Validate passengers with a travel-date-aware schema (passport-expiry
  //     floor = return ?? outbound). Zod rejects '' gender, bad passports, etc.
  const passengersResult = z
    .array(makePassengerSchema({ outboundDate, returnDate }))
    .min(1)
    .safeParse(input.passengers)
  if (!passengersResult.success) {
    return { ok: false, code: 'validation_failed', error: formatZodError(passengersResult.error) }
  }

  // 2. Resolve items and build createTrip list
  const items: CreateTripInput['items'] = []

  for (const item of input.items) {
    if (item.type === 'ferry') {
      const ferry = getFerryById(item.ferryId)
      if (!ferry) {
        return { ok: false, code: 'validation_failed', error: `Ferry not found: ${item.ferryId}` }
      }
      items.push({
        type: 'ferry',
        title: `${ferry.from} → ${ferry.to} (${ferry.operator})`,
        scheduledAt: combineDateAndTime(item.date, ferry.departureTime),
        endsAt: combineDateAndTime(item.date, ferry.arrivalTime),
        passengerCount: input.passengerCount,
        priceAmount: ferry.price * input.passengerCount,
        priceCurrency: 'EUR',
        metadata: {
          from_port: ferry.from,
          to_port: ferry.to,
          operator: ferry.operator,
          vessel: ferry.vessel,
          departure_time: ferry.departureTime,
          arrival_time: ferry.arrivalTime,
          ferry_id: ferry.id,
          per_passenger_price: ferry.price,
        },
      })
    } else if (item.type === 'car_rental') {
      try {
        // Recompute days server-side from ferry dates when both legs are present
        // (round-trip). For one-way, trust the Zod-validated client value.
        const ferryItems = input.items.filter(
          (i): i is Extract<typeof i, { type: 'ferry' }> => i.type === 'ferry'
        )
        const outboundFerryItem = ferryItems.find(i => i.leg === 'outbound')
        const returnFerryItem   = ferryItems.find(i => i.leg === 'return')
        const authorizedDays =
          outboundFerryItem && returnFerryItem
            ? Math.max(1, dateDiffInDays(outboundFerryItem.date, returnFerryItem.date))
            : Math.max(1, item.days)

        const supabase = getSupabaseAdmin()
        const { data } = await supabase
          .from('cars')
          .select('id, brand, model, price_per_day, available')
          .eq('id', item.carId)
          .maybeSingle()
        if (data) {
          const carName = [data.brand, data.model].filter(Boolean).join(' ') || 'Car rental'
          const pricePerDay = Number(data.price_per_day ?? 0)
          items.push({
            type: 'car_rental',
            title: `${carName} (${authorizedDays} ${authorizedDays === 1 ? 'day' : 'days'})`,
            scheduledAt: item.pickupAt ?? null,
            endsAt: item.dropoffAt ?? null,
            passengerCount: input.passengerCount,
            priceAmount: pricePerDay * authorizedDays,
            priceCurrency: 'EUR',
            metadata: {
              car_id: data.id,
              model: carName,
              days: authorizedDays,
              per_day_price: pricePerDay,
              pickup_at: item.pickupAt,
              dropoff_at: item.dropoffAt,
            },
          })
        }
      } catch (err) {
        console.error('[submitBooking] car lookup failed:', err)
        // Soft failure — proceed without the car item
      }
    } else if (item.type === 'luggage') {
      // Server-side price is authoritative. calculateLuggageTotalCents throws
      // (RangeError) on bad input — pickup<dropOff, bad date, count out of 0..5,
      // Σcounts<1 — which we surface as a typed 'invalid_luggage' error. The
      // client's display priceAmount is intentionally ignored.
      let totalCents: number
      try {
        totalCents = calculateLuggageTotalCents(
          item.counts,
          item.dropOffDate,
          item.pickupDate,
        )
      } catch (err) {
        return {
          ok: false,
          code: 'invalid_luggage',
          error: err instanceof Error ? err.message : 'Invalid luggage selection',
        }
      }

      const totalPieces = item.counts.small + item.counts.medium + item.counts.large
      items.push({
        type: 'luggage',
        title: `Luggage drop-off — ${totalPieces} ${totalPieces === 1 ? 'piece' : 'pieces'}`,
        scheduledAt: `${item.dropOffDate}T00:00:00+03:00`,
        endsAt: `${item.pickupDate}T00:00:00+03:00`,
        passengerCount: 1,
        // cents → EUR decimals (rest of the trip works in EUR; rates are whole
        // euros so this division is always exact).
        priceAmount: totalCents / 100,
        priceCurrency: 'EUR',
        metadata: {
          // —— camelCase (client) → snake_case (DB LuggageItemMetadata) ——
          // This is the single boundary where the mapping happens.
          count_small:  item.counts.small,
          count_medium: item.counts.medium,
          count_large:  item.counts.large,
          drop_off_date: item.dropOffDate,
          pickup_date: item.pickupDate,
          location: item.location,
        },
      })
    }
  }

  // 3. Resolve passengers. Type is DERIVED server-side from age at the OUTBOUND
  //    date (sail-out) — never returnDate, never a client-sent type. The
  //    structural schema guarantees an outbound leg, so outboundDate is set.
  const outboundTravelDate = outboundDate as string

  const leadPassenger =
    input.passengers.find((p) => p.isLead) ?? input.passengers[0]

  // 4. Companions — everyone except the lead. Names arrive pre-split (no splitName).
  const companions = input.passengers
    .filter((p) => p !== leadPassenger)
    .map((p) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      birthDate: p.birthDate || null,
      passportNumber: p.passportNumber || null,
      passportCountry: p.nationality || null,
      passportExpiryDate: p.passportExpiryDate || null,
      nationality: p.nationality || null,
      type: derivePassengerType(p.birthDate, outboundTravelDate),
    }))

  // 5. Create trip in DB (sets state = pending_payment). The lead carries its
  //    FULL identity now (birthDate/gender/passport no longer dropped here);
  //    fullName is synthesized for the customers table + email greeting.
  const leadFullName = `${leadPassenger.firstName} ${leadPassenger.lastName}`.trim()

  const tripResult = await createTrip({
    idempotencyKey: input.idempotencyKey,
    locale: input.locale,
    source: 'web',
    customer: {
      fullName: leadFullName,
      firstName: leadPassenger.firstName,
      lastName: leadPassenger.lastName,
      gender: leadPassenger.gender,
      birthDate: leadPassenger.birthDate || null,
      passportNumber: leadPassenger.passportNumber || null,
      passportExpiryDate: leadPassenger.passportExpiryDate || null,
      type: derivePassengerType(leadPassenger.birthDate, outboundTravelDate),
      email: input.contactEmail,
      phone: input.contactPhone,
      nationality: leadPassenger.nationality || undefined,
    },
    items,
    additionalPassengers: companions,
    notesCustomer: input.notesCustomer,
  })

  if (!tripResult.ok) return tripResult

  // 6. Attempt Viva payment order. Non-fatal — if Viva is unreachable or returns
  //    an error, the trip is already safely in pending_payment and the WhatsApp
  //    link from createTrip serves as the fallback payment path.
  let vivaRedirectUrl: string | undefined
  try {
    const vivaResult = await createPaymentOrder({
      tripId: tripResult.tripId,
      locale: input.locale,
    })
    if (vivaResult.ok) {
      vivaRedirectUrl = vivaResult.redirectUrl
    } else {
      console.warn('[submitBooking] Viva order failed, WhatsApp fallback active:', vivaResult.error)
    }
  } catch (err) {
    console.error('[submitBooking] createPaymentOrder threw unexpectedly:', err)
  }

  return { ...tripResult, vivaRedirectUrl }
}

// ============================================================
// Helpers
// ============================================================

function isDateInFuture(date: string): boolean {
  // date >= today in Greece timezone prevents bookings for past departures
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
  return date >= today
}

function formatZodError(err: z.ZodError): string {
  const flat = err.flatten()
  const fieldLines = Object.entries(flat.fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
  return [...fieldLines, ...flat.formErrors].join(' | ') || err.message
}

function combineDateAndTime(date: string, time: string): string {
  // date: "2026-06-15", time: "09:00" → "2026-06-15T09:00:00+03:00"
  // Use Greece timezone (EET, +03 in summer)
  return `${date}T${time}:00+03:00`
}

