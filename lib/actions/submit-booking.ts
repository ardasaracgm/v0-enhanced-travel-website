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

  /** Booking line items — IDs only; server resolves prices */
  items: Array<
    | { type: 'ferry'; leg: 'outbound' | 'return'; ferryId: string; date: string }
    | { type: 'car_rental'; carId: string; days: number; pickupAt?: string; dropoffAt?: string }
  >

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
  // 1. Validate items present
  if (!input.items || input.items.length === 0) {
    return { ok: false, code: 'validation_failed', error: 'Booking must contain at least one item' }
  }

  // 2. Validate outbound ferry present
  if (!input.items.some(i => i.type === 'ferry' && i.leg === 'outbound')) {
    return { ok: false, code: 'validation_failed', error: 'Booking must include an outbound ferry leg' }
  }

  // 3. Resolve items and build createTrip list
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
        const supabase = getSupabaseAdmin()
        const { data } = await supabase
          .from('cars')
          .select('id, brand, model, price, price_per_day')
          .eq('id', item.carId)
          .maybeSingle()
        if (data) {
          const carName = [data.brand, data.model].filter(Boolean).join(' ') || 'Car rental'
          const pricePerDay = Number(data.price ?? data.price_per_day ?? 0)
          items.push({
            type: 'car_rental',
            title: `${carName} (${item.days} ${item.days === 1 ? 'day' : 'days'})`,
            scheduledAt: item.pickupAt ?? null,
            endsAt: item.dropoffAt ?? null,
            passengerCount: input.passengerCount,
            priceAmount: pricePerDay * item.days,
            priceCurrency: 'EUR',
            metadata: {
              car_id: data.id,
              model: carName,
              days: item.days,
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
    }
  }

  // 4. Find lead passenger (or fallback to first)
  const leadPassenger =
    input.passengers.find((p) => p.isLead) ?? input.passengers[0]
  if (!leadPassenger) {
    return { ok: false, code: 'validation_failed', error: 'At least one passenger is required' }
  }

  // 5. Companion passengers — everyone except the lead
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

  // 6. Hand off to createTrip
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
