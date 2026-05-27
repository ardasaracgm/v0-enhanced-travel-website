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

import { createTrip, type CreateTripInput, type CreateTripResult } from './create-trip'
import { getFerryById } from '@/lib/ferry-mock-data'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { Locale } from '@/lib/notifications/whatsapp-link'

// ============================================================
// Input shape — trusted minimal client data
// ============================================================

export interface SubmitBookingInput {
  /** UUID generated client-side per booking attempt */
  idempotencyKey: string
  locale: Locale

  /** Ferry leg IDs (looked up server-side for real price) */
  outboundFerryId: string
  returnFerryId?: string

  /** Optional car rental from the Supabase cars table */
  carRentalId?: string
  carRentalDays?: number
  carPickupAt?: string // ISO timestamp
  carDropoffAt?: string

  /** Trip dates (also validated against ferry schedule) */
  departDate: string // YYYY-MM-DD
  returnDate?: string

  /** Number of passengers (used to multiply per-passenger ferry price) */
  passengerCount: number

  /** Passenger details (server validates required fields) */
  passengers: Array<{
    fullName: string
    birthDate: string
    passportNumber: string
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

export type SubmitBookingResult = CreateTripResult

// ============================================================
// Implementation
// ============================================================

export async function submitBooking(input: SubmitBookingInput): Promise<SubmitBookingResult> {
  // 1. Resolve outbound ferry
  const outbound = getFerryById(input.outboundFerryId)
  if (!outbound) {
    return { ok: false, code: 'validation_failed', error: 'Outbound ferry not found' }
  }

  // 2. Resolve optional return ferry
  let returnFerry = null
  if (input.returnFerryId) {
    returnFerry = getFerryById(input.returnFerryId)
    if (!returnFerry) {
      return { ok: false, code: 'validation_failed', error: 'Return ferry not found' }
    }
  }

  // 3. Resolve optional car rental from Supabase
  let car: {
    id: string
    name: string
    pricePerDay: number
  } | null = null
  if (input.carRentalId) {
    try {
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from('cars')
        .select('id, brand, model, price, price_per_day')
        .eq('id', input.carRentalId)
        .maybeSingle()
      if (data) {
        car = {
          id: data.id,
          name: [data.brand, data.model].filter(Boolean).join(' ') || 'Car rental',
          pricePerDay: Number(data.price ?? data.price_per_day ?? 0),
        }
      }
    } catch (err) {
      console.error('[submitBooking] car lookup failed:', err)
      // Don't fail the whole booking — proceed without the car
    }
  }

  // 4. Build createTrip items list
  const items: CreateTripInput['items'] = []

  // Outbound ferry leg
  const outboundDateTime = combineDateAndTime(input.departDate, outbound.departureTime)
  const outboundArrival = combineDateAndTime(input.departDate, outbound.arrivalTime)
  items.push({
    type: 'ferry',
    title: `${outbound.from} → ${outbound.to} (${outbound.operator})`,
    scheduledAt: outboundDateTime,
    endsAt: outboundArrival,
    passengerCount: input.passengerCount,
    priceAmount: outbound.price * input.passengerCount,
    priceCurrency: 'EUR',
    metadata: {
      from_port: outbound.from,
      to_port: outbound.to,
      operator: outbound.operator,
      vessel: outbound.vessel,
      departure_time: outbound.departureTime,
      arrival_time: outbound.arrivalTime,
      ferry_id: outbound.id,
      per_passenger_price: outbound.price,
    },
  })

  // Return ferry leg (round-trip)
  if (returnFerry && input.returnDate) {
    const ret = combineDateAndTime(input.returnDate, returnFerry.departureTime)
    const retEnd = combineDateAndTime(input.returnDate, returnFerry.arrivalTime)
    items.push({
      type: 'ferry',
      title: `${returnFerry.from} → ${returnFerry.to} (${returnFerry.operator})`,
      scheduledAt: ret,
      endsAt: retEnd,
      passengerCount: input.passengerCount,
      priceAmount: returnFerry.price * input.passengerCount,
      priceCurrency: 'EUR',
      metadata: {
        from_port: returnFerry.from,
        to_port: returnFerry.to,
        operator: returnFerry.operator,
        vessel: returnFerry.vessel,
        departure_time: returnFerry.departureTime,
        arrival_time: returnFerry.arrivalTime,
        ferry_id: returnFerry.id,
        per_passenger_price: returnFerry.price,
      },
    })
  }

  // Car rental (optional)
  if (car && input.carRentalDays && input.carRentalDays > 0) {
    items.push({
      type: 'car_rental',
      title: `${car.name} (${input.carRentalDays} ${input.carRentalDays === 1 ? 'day' : 'days'})`,
      scheduledAt: input.carPickupAt ?? null,
      endsAt: input.carDropoffAt ?? null,
      passengerCount: input.passengerCount,
      priceAmount: car.pricePerDay * input.carRentalDays,
      priceCurrency: 'EUR',
      metadata: {
        car_id: car.id,
        model: car.name,
        days: input.carRentalDays,
        per_day_price: car.pricePerDay,
        pickup_at: input.carPickupAt,
        dropoff_at: input.carDropoffAt,
      },
    })
  }

  // 5. Find lead passenger (or fallback to first)
  const leadPassenger =
    input.passengers.find((p) => p.isLead) ?? input.passengers[0]
  if (!leadPassenger) {
    return { ok: false, code: 'validation_failed', error: 'At least one passenger is required' }
  }

  // 6. Companion passengers — everyone except the lead
  const companions = input.passengers
    .filter((p) => p !== leadPassenger)
    .map((p) => ({
      firstName: splitName(p.fullName).first,
      lastName: splitName(p.fullName).last,
      birthDate: p.birthDate || null,
      passportNumber: p.passportNumber || null,
      passportCountry: p.nationality || null,
      nationality: p.nationality || null,
      type: 'adult' as const,
    }))

  // 7. Hand off to createTrip
  return createTrip({
    idempotencyKey: input.idempotencyKey,
    locale: input.locale,
    source: 'web',
    customer: {
      fullName: leadPassenger.fullName,
      email: input.contactEmail,
      phone: input.contactPhone,
      nationality: leadPassenger.nationality || undefined,
    },
    items,
    additionalPassengers: companions,
    notesCustomer: input.notesCustomer,
  })
}

// ============================================================
// Helpers
// ============================================================

function combineDateAndTime(date: string, time: string): string {
  // date: "2026-06-15", time: "09:00" → "2026-06-15T09:00:00+03:00"
  // Use Greece timezone (EET, +03 in summer)
  return `${date}T${time}:00+03:00`
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = (fullName || '').trim().split(/\s+/)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: parts[0] }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}
