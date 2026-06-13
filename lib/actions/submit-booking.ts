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
  resolveInsuranceItem,
} from '@/lib/trip-items/resolvers'
import { getInsuranceQuote } from '@/lib/insurs'
import { submitItemSchema } from '@/lib/trip-items/registry'
import { assertNever } from '@/lib/trip-items/types'
import type { Locale } from '@/lib/notifications/whatsapp-link'
import { makePassengerSchema, makeDriverSchema, derivePassengerType, isYoungDriver, todayAthensISO } from '@/lib/validation/booking'
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
    | {
        type: 'insurance'
        tariffId: number
        tariffName: string
        touristCount: number
        priceAmount: number   // A0: mock/0; sunucu yok sayar
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

// ============================================================
// Ferry-flow signal — single source of truth
// ============================================================
// A booking rides the FERRY flow iff it has an outbound ferry leg. This one
// predicate drives the structural guard, the passenger-vs-driver schema choice,
// and the downstream travel-date logic — never re-derived ad hoc elsewhere.
function hasOutboundFerry(items: SubmitBookingInput['items']): boolean {
  return items.some(i => i.type === 'ferry' && i.leg === 'outbound')
}

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
  // A ferry booking MUST include an outbound leg. A booking with NO ferry at all
  // (car-only standalone) is allowed — items.min(1) still blocks empty orders,
  // and a lone return leg without an outbound is still rejected here.
  data => {
    const ferries = data.items.filter(i => i.type === 'ferry')
    return ferries.length === 0 || hasOutboundFerry(data.items)
  },
  { message: 'A ferry booking must include an outbound leg', path: ['items'] }
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

  // Ferry flow vs. car-only standalone — one signal, drives schema + dates below.
  const hasFerry = hasOutboundFerry(structural.data.items)

  // 1c. Validate passengers (ferry) OR driver (car-only) with the right schema.
  //     Ferry: full passport identity, travel-date-aware (expiry floor =
  //     return ?? outbound), 1+ passengers. Car-only: exactly ONE driver —
  //     name + DOB (>=21); email/phone come from the structural contact fields.
  const passengersResult = hasFerry
    ? z.array(makePassengerSchema({ outboundDate, returnDate })).min(1).safeParse(input.passengers)
    : z.array(makeDriverSchema()).length(1).safeParse(input.passengers)
  if (!passengersResult.success) {
    return { ok: false, code: 'validation_failed', error: formatZodError(passengersResult.error) }
  }

  // Young-driver flag (21–24): car-only only, no price effect — surfaced on the
  // car_rental item metadata for ops. The ferry flow has no standalone driver.
  // Safe because the driver array is length(1): passengers[0] IS the driver.
  const youngDriver = !hasFerry && isYoungDriver(input.passengers[0]?.birthDate ?? '')

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
        // Round-trip: the island stay (outbound→return, inclusive) is the CEILING,
        // not a fixed value — the customer may rent for fewer days than they're on
        // the island. Clamp the client-chosen days to [1, ferryWindow]. One-way has
        // no return leg, so trust the Zod-validated client value (Math.max floor).
        const ferryItems = input.items.filter(
          (i): i is Extract<typeof i, { type: 'ferry' }> => i.type === 'ferry'
        )
        const outboundFerryItem = ferryItems.find(i => i.leg === 'outbound')
        const returnFerryItem   = ferryItems.find(i => i.leg === 'return')
        const ferryWindow =
          outboundFerryItem && returnFerryItem
            ? Math.max(1, dateDiffInDays(outboundFerryItem.date, returnFerryItem.date) + 1)
            : null
        const authorizedDays =
          ferryWindow != null
            ? Math.min(Math.max(1, item.days), ferryWindow)
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
          const carItem = resolveCarRentalItem({
            item,
            car: data,
            authorizedDays,
            passengerCount: input.passengerCount,
          })
          // Young-driver flag → jsonb metadata. No schema change, no price effect.
          // Branch-gated: can only ever land on a car_rental item.
          if (youngDriver) {
            carItem.metadata = { ...carItem.metadata, young_driver: true }
          }
          items.push(carItem)
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
    } else if (item.type === 'insurance') {
      // Server-side authoritative re-price (luggage deseni). Client priceAmount
      // YOK SAYILIR; get_price'tan gerçek DOB'larla teyit edilir. Poliçe
      // OLUŞTURULMAZ (add_contract Kademe B) — yalnız quote + ödemeye dahil.
      try {
        // Insurance requires real travel dates → only reachable in the ferry
        // flow. Defensive: never reached in car-only (no insurance item there),
        // but guard the latent crash instead of casting undefined to string.
        if (!outboundDate) {
          return { ok: false, code: 'invalid_insurance', error: 'Insurance requires ferry travel dates' }
        }
        const dateFrom = outboundDate
        const dateTo = returnDate ?? outboundDate
        const tourists = input.passengers.map((p) => ({ dateBirth: p.birthDate }))
        const tariffs = await getInsuranceQuote({
          dateFrom, dateTo, touristCount: item.touristCount, tourists,
        })
        const match = tariffs.find((tf) => tf.tariffId === item.tariffId)
        if (!match) {
          return { ok: false, code: 'invalid_insurance', error: `Insurance tariff not found: ${item.tariffId}` }
        }
        items.push(resolveInsuranceItem({
          item, quoteAmount: match.priceAmount, quoteCurrency: match.sourceCurrency,
          coverageId: match.coverageId, coverageValue: match.coverageValue, dateFrom, dateTo,
        }))
      } catch (err) {
        return {
          ok: false,
          code: 'invalid_insurance',
          error: err instanceof Error ? err.message : 'Insurance quote failed',
        }
      }
    } else {
      // Exhaustiveness: a new item type without a branch fails here at compile
      // time (item: never) and at runtime. Replaces the old silent skip.
      return assertNever(item, 'submit booking item')
    }
  }

  // 3. Resolve passengers. Type is DERIVED server-side from age at the OUTBOUND
  //    date (sail-out) — never returnDate, never a client-sent type. Car-only
  //    bookings have no ferry date → fall back to today (Athens); a 21+ driver
  //    still classifies as 'adult', which is correct.
  const outboundTravelDate = outboundDate ?? todayAthensISO()

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

