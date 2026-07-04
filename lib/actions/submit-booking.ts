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
import { sendPendingBookingEmail } from '@/lib/email/send-confirmation'
import { getFerryProvider } from '@/lib/ferry'
import { ferryPairPrices } from '@/lib/ferry/display'
import type { FerryTrip } from '@/lib/ferry/provider'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { dateDiffInDays } from '@/lib/normalize-car'
import { assignPlate, computeEndDate } from '@/lib/car-availability'
import { type LuggageCounts } from '@/lib/luggage-pricing'
import {
  resolveFerryItem,
  resolveCarRentalItem,
  resolveLuggageItem,
  resolveInsuranceItem,
  resolveTransferItem,
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
    | { type: 'car_rental'; modelKey: string; days: number; pickupAt: string; dropoffAt?: string }
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
    | {
        type: 'transfer'
        regionId: string
        outbound?: { routeId: string; vehicleId: string }
        return?: { routeId: string; vehicleId: string }
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
    /** Car-only driver's licence expiry (YYYY-MM-DD); written to car metadata */
    licenseExpiry?: string
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
  const carInput = input.items.find(
    (i): i is Extract<typeof i, { type: 'car_rental' }> => i.type === 'car_rental'
  )
  // Otoriter kiralama günü: tarih aralığından türer (inclusive: dropoff−pickup+1).
  // dropoffAt şemada opsiyonel (registry.ts) → yoksa eski item'lar için client days'e
  // düşülür (backward-compat). Taban 1, tavan 90 (absürt aralık abuse guard — Zod
  // .max(90) yalnız client days alanına uygulanıyordu, türetilmiş güne değil).
  // Ferry penceresi artık advisory: clamp YOK — uzun konaklama bilinçli, fiyatlanır.
  const authorizeCarDays = (it: { pickupAt: string; dropoffAt?: string; days: number }): number => {
    const derived = it.dropoffAt ? dateDiffInDays(it.pickupAt, it.dropoffAt) + 1 : it.days
    return Math.min(90, Math.max(1, derived))
  }
  // Authoritative drop-off from pickup + authorized days — feeds the driver licence
  // expiry floor (makeDriverSchema) and the car_bookings hold. computeEndDate =
  // pickup + (days-1), so a same-source dropoff for both metadata and hold.
  const carDropoff = carInput
    ? computeEndDate(carInput.pickupAt, authorizeCarDays(carInput))
    : undefined
  const passengersResult = hasFerry
    ? z.array(makePassengerSchema({ outboundDate, returnDate })).min(1).safeParse(input.passengers)
    : z.array(makeDriverSchema({ dropoffAt: carDropoff })).length(1).safeParse(input.passengers)
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

  // Round-trip ferry pairing: the OUTBOUND schedule's fare table prices the whole
  // round trip; keep it plus references to both leg items so §2b can re-price the
  // pair as ONE charge after the loop. (Stay null/empty for one-way & car-only.)
  let outboundFerryTrip: FerryTrip | null = null
  let returnFerryTrip: FerryTrip | null = null
  const ferryItemByLeg: Partial<Record<'outbound' | 'return', CreateTripInput['items'][number]>> = {}

  // Authoritative outbound travel date (sail-out) — drives BOTH per-type ferry
  // fares (here) and passenger-type derivation (§3 below). Car-only → today (Athens).
  const outboundTravelDate = outboundDate ?? todayAthensISO()
  // Per-passenger ferry types for the authoritative per-type fare sum. Same rule
  // as the passenger records (§3). Empty for car-only (no ferry item).
  const ferryPassengerTypes = hasFerry
    ? input.passengers.map((p) => derivePassengerType(p.birthDate, outboundTravelDate))
    : []

  for (const item of input.items) {
    if (item.type === 'ferry') {
      const ferry = await (await getFerryProvider()).getTrip(item.ferryId)
      if (!ferry) {
        return { ok: false, code: 'validation_failed', error: `Ferry not found: ${item.ferryId}` }
      }
      // I/O (getFerryById) stays here; pure assembly lives in the registry resolver.
      const ferryItem = resolveFerryItem({ item, ferry, passengerCount: input.passengerCount, passengerTypes: ferryPassengerTypes })
      // Keep the outbound schedule (round-trip fare authority) + both leg items
      // so §2b can re-price the pair as one round trip.
      if (item.leg === 'outbound') outboundFerryTrip = ferry
      if (item.leg === 'return') returnFerryTrip = ferry
      ferryItemByLeg[item.leg] = ferryItem
      items.push(ferryItem)
    } else if (item.type === 'car_rental') {
      try {
        // Gün + teslim tarihi TEK kaynaktan: pickup/dropoff tarih aralığından türer
        // (authorizeCarDays). Ferry penceresi advisory — clamp yok; uzun konaklama
        // izinli ve fiyatlanır. authorizedDropoff hem hold hem metadata için aynı.
        const authorizedDays = authorizeCarDays(item)
        const authorizedDropoff = computeEndDate(item.pickupAt, authorizedDays)

        // Müşteri model_key seçer; sunucu havuzdan somut plakayı ATAR: status='active',
        // tarih çakışması yok, en düşük priority. Boş plaka yok → HARD reject (havuz dolu/yok).
        const plateId = await assignPlate(item.modelKey, item.pickupAt, authorizedDays)
        if (!plateId) {
          return { ok: false, code: 'car_unavailable', error: `Car unavailable: ${item.modelKey}` }
        }
        const supabase = getSupabaseAdmin()
        const { data } = await supabase
          .from('cars')
          .select('id, brand, model, price_per_day, available')
          .eq('id', plateId)
          .maybeSingle()
        if (data) {
          // assignPlate zaten status + müsaitlik garanti etti → ekstra isAvailable gereksiz.
          carBookingDrafts.push({
            car_id: plateId,
            start_date: item.pickupAt,
            end_date: authorizedDropoff,
          })
          // I/O (cars fetch + authorizedDays) stays here; pure assembly in resolver.
          const carItem = resolveCarRentalItem({
            item,
            car: data,
            authorizedDays,
            authorizedDropoff,
            passengerCount: input.passengerCount,
          })
          // Young-driver flag → jsonb metadata. No schema change, no price effect.
          // Branch-gated: can only ever land on a car_rental item.
          if (youngDriver) {
            carItem.metadata = { ...carItem.metadata, young_driver: true }
          }
          // Driver's licence expiry → jsonb metadata (car-only; same pattern as
          // young_driver). passengers[0] IS the driver (array is length 1).
          const licenseExpiry = !hasFerry ? input.passengers[0]?.licenseExpiry : undefined
          if (licenseExpiry) {
            carItem.metadata = { ...carItem.metadata, driver_license_expiry: licenseExpiry }
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
    } else if (item.type === 'transfer') {
      // Server-side authoritative. resolveTransferItem (→ calculateTransferTotalCents)
      // throws RangeError on bad input (no leg, unknown region/route/vehicle) —
      // surfaced as 'invalid_transfer'. Client priceAmount ignored (luggage pattern).
      try {
        items.push(resolveTransferItem({ item }))
      } catch (err) {
        return {
          ok: false,
          code: 'invalid_transfer',
          error: err instanceof Error ? err.message : 'Invalid transfer selection',
        }
      }
    } else {
      // Exhaustiveness: a new item type without a branch fails here at compile
      // time (item: never) and at runtime. Replaces the old silent skip.
      return assertNever(item, 'submit booking item')
    }
  }

  // 2b. Round-trip re-pricing. Two ferry legs are ONE Dentur charge, not two
  //     one-ways: a round trip is a single per-pax fare (returnSameDay when both
  //     legs sail the same date, else returnDifferentDay — verified live: 1 adult
  //     = 35 same-day / 40 different-day, vs 50 as 2×25 one-way). We compute the
  //     pair total from the OUTBOUND schedule's fare table, then split it across
  //     the two legs in INTEGER CENTS (floor each half, odd cent → outbound) so
  //     the two priceAmounts sum EXACTLY to the round-trip total — no rounding
  //     leak before createPaymentOrder's Math.round(total*100) reaches Viva. The
  //     split is PROVISIONAL: reserveFerry overwrites each leg with the real
  //     voucherDetails amounts post-payment; round_trip_pair tags the return so
  //     that step finds the pair. One-way (no return leg) keeps its oneWay sum.
  const outboundFerryItem = ferryItemByLeg.outbound
  const returnFerryItem = ferryItemByLeg.return
  if (outboundFerryItem && returnFerryItem) {
    // A return leg means round-trip intent. Dates decide same- vs different-day
    // fare; ferrySchema makes date REQUIRED on every ferry item, but assert here
    // rather than let a missing date silently fall through to different-day (which
    // would overcharge ~5 EUR). Explicit error, never a silent mis-price.
    if (!outboundDate || !returnDate || !outboundFerryTrip || !returnFerryTrip) {
      return { ok: false, code: 'validation_failed', error: 'Round-trip ferry legs are missing travel dates' }
    }
    // Both dates are server-trusted YYYY-MM-DD (no Date/timezone coercion) → a
    // plain === is the correct same-day test. The per-leg split is the SAME
    // ferryPairPrices the client cart uses, so cart total == charged total.
    const sameDay = outboundDate === returnDate
    const prices = ferryPairPrices(outboundFerryTrip, returnFerryTrip, ferryPassengerTypes, sameDay)
    outboundFerryItem.priceAmount = prices.outbound
    returnFerryItem.priceAmount = prices.return ?? returnFerryItem.priceAmount
    // Tag only a genuine single-reservation round trip (same operator). The
    // forward-compat different-operator case (prices.pair=false) is two
    // independent one-ways, NOT one Dentur reservation — never tag it as a pair.
    if (prices.pair) {
      returnFerryItem.metadata = { ...returnFerryItem.metadata, round_trip_pair: true }
    }
  }

  // 3. Resolve passengers. Type is DERIVED server-side from age at the OUTBOUND
  //    date (sail-out, outboundTravelDate above) — never returnDate, never a
  //    client-sent type. Car-only bookings have no ferry date → today (Athens);
  //    a 21+ driver still classifies as 'adult', which is correct.
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

  // Pending+WhatsApp email — ONLY when Viva produced no redirect (graceful
  // degradation → WhatsApp is the payment path; covers both the ok:false branch
  // and a thrown createPaymentOrder) AND this is a freshly created trip (an
  // idempotent re-submit must not re-send). Successful Viva → no email here.
  if (!vivaRedirectUrl && !tripResult.alreadyExisted) {
    await sendPendingBookingEmail({
      reference: tripResult.reference,
      customerName: leadFullName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      totalAmount: tripResult.totalAmount,
      currency: tripResult.currency,
      locale: input.locale,
      items: items.map((i) => {
        // Ferry legs carry raw wall-clock times so the email prints them verbatim
        // (booking-confirmation formatFerryWhen — avoids the tz-shift on the instant).
        const fm =
          i.type === 'ferry'
            ? (i.metadata as { departure_time?: string; arrival_time?: string } | undefined)
            : undefined
        return {
          type: i.type,
          title: i.title,
          scheduledAt: i.scheduledAt ?? null,
          departureTime: fm?.departure_time ?? null,
          arrivalTime: fm?.arrival_time ?? null,
          price: i.priceAmount,
        }
      }),
      paymentWhatsAppUrl: tripResult.paymentWhatsAppUrl,
    })
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

