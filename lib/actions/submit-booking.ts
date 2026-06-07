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
import { isAvailable, computeEndDate } from '@/lib/car-availability'
import { type LuggageCounts } from '@/lib/luggage-pricing'
import {
  resolveFerryItem,
  resolveCarRentalItem,
  resolveLuggageItem,
} from '@/lib/trip-items/resolvers'
import { submitItemSchema } from '@/lib/trip-items/registry'
import { assertNever } from '@/lib/trip-items/types'
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
    | { type: 'car_rental'; carId: string; days: number; pickupAt: string; dropoffAt?: string }
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
// Per-item variants live on the registry descriptors (single source);
// submitItemSchema is the discriminatedUnion built from them. See
// lib/trip-items/registry.ts.

// Structural schema — everything EXCEPT detailed passenger validation, which
// is run separately below because it needs the (now-trusted) travel dates.
const SubmitBookingStructureSchema = z.object({
  idempotencyKey: z.string().min(8),
  locale:         z.enum(['en', 'tr', 'el']),
  items:          z.array(submitItemSchema).min(1),
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
  // car_bookings hold kayıtları: trip_id Faz 5'te doğduğu için burada
  // biriktirilir, trip insert'ten SONRA yazılır.
  const carBookingDrafts: { car_id: string; start_date: string; end_date: string }[] = []

  for (const item of input.items) {
    if (item.type === 'ferry') {
      const ferry = getFerryById(item.ferryId)
      if (!ferry) {
        return { ok: false, code: 'validation_failed', error: `Ferry not found: ${item.ferryId}` }
      }
      // I/O (getFerryById) stays here; pure assembly lives in the registry resolver.
      items.push(resolveFerryItem({ item, ferry, passengerCount: input.passengerCount }))
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
            ? Math.max(1, dateDiffInDays(outboundFerryItem.date, returnFerryItem.date) + 1)
            : Math.max(1, item.days)

        const supabase = getSupabaseAdmin()
        const { data } = await supabase
          .from('cars')
          .select('id, brand, model, price_per_day, available')
          .eq('id', item.carId)
          .maybeSingle()
        if (data) {
          // Müsaitlik + hold. "Araç var ama tarih aralığı DOLU" → HARD reject.
          // ("Araç bulunamadı" = data yok → aşağıdaki soft-skip korunur; ikisi ayrı.)
          // pickupAt artık şemada zorunlu (YYYY-MM-DD) → guard gerekmez.
          const free = await isAvailable(item.carId, item.pickupAt, authorizedDays)
          if (!free) {
            return { ok: false, code: 'car_unavailable', error: `Car unavailable: ${item.carId}` }
          }
          carBookingDrafts.push({
            car_id: item.carId,
            start_date: item.pickupAt,
            end_date: computeEndDate(item.pickupAt, authorizedDays),
          })
          // I/O (cars fetch + authorizedDays) stays here; pure assembly in resolver.
          items.push(
            resolveCarRentalItem({
              item,
              car: data,
              authorizedDays,
              passengerCount: input.passengerCount,
            }),
          )
        }
      } catch (err) {
        console.error('[submitBooking] car lookup failed:', err)
        // Soft failure — proceed without the car item
      }
    } else if (item.type === 'luggage') {
      // Server-side price is authoritative. resolveLuggageItem (via
      // calculateLuggageTotalCents) throws RangeError on bad input —
      // pickup<dropOff, bad date, count out of 0..5, Σcounts<1 — which we
      // surface as a typed 'invalid_luggage' error. The client's display
      // priceAmount is intentionally ignored.
      try {
        items.push(resolveLuggageItem({ item }))
      } catch (err) {
        return {
          ok: false,
          code: 'invalid_luggage',
          error: err instanceof Error ? err.message : 'Invalid luggage selection',
        }
      }
    } else {
      // Exhaustiveness: a new item type without a branch fails here at compile
      // time (item: never) and at runtime. Replaces the old silent skip.
      return assertNever(item, 'submit booking item')
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

  // 5b. car_rental hold kayıtları (trip_id artık var). NON-FATAL: insert
  //     hatası booking'i bozmaz — Viva fallback kalıbı gibi sadece loglanır.
  if (carBookingDrafts.length > 0) {
    try {
      const admin = getSupabaseAdmin()
      const { error } = await admin.from('car_bookings').insert(
        carBookingDrafts.map((d) => ({
          trip_id: tripResult.tripId,
          car_id: d.car_id,
          start_date: d.start_date,
          end_date: d.end_date,
          state: 'held',
        })),
      )
      if (error) console.error('[submitBooking] car_bookings insert failed:', error)
    } catch (err) {
      console.error('[submitBooking] car_bookings insert threw:', err)
    }
  }

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

function formatZodError(err: z.ZodError): string {
  const flat = err.flatten()
  const fieldLines = Object.entries(flat.fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
  return [...fieldLines, ...flat.formErrors].join(' | ') || err.message
}

