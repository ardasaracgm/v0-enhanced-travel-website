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

const PassengerSchema = z.object({
  fullName:       z.string().trim().min(2),
  birthDate:      z.string().refine(isReasonableDOB, { message: 'Invalid date of birth' }),
  passportNumber: z.string().trim().regex(/^[A-Z0-9]{5,20}$/i, 'Invalid passport number'),
  nationality:    z.string().trim().min(2),
  isLead:         z.boolean().optional(),
})

const SubmitBookingSchema = z.object({
  idempotencyKey: z.string().min(8),
  locale:         z.enum(['en', 'tr', 'el']),
  items:          z.array(z.discriminatedUnion('type', [FerryItemSchema, CarItemSchema])).min(1),
  passengerCount: z.number().int().min(1).max(9),
  passengers:     z.array(PassengerSchema).min(1),
  contactEmail:   z.string().email(),
  contactPhone:   z.string().trim().min(7),
  notesCustomer:  z.string().max(500).optional(),
}).refine(
  data => data.items.some(i => i.type === 'ferry' && i.leg === 'outbound'),
  { message: 'Booking must include an outbound ferry leg', path: ['items'] }
)

// ============================================================
// Implementation
// ============================================================

export async function submitBooking(input: SubmitBookingInput): Promise<SubmitBookingResult> {
  // 1. Schema validation
  const parsed = SubmitBookingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, code: 'validation_failed', error: formatZodError(parsed.error) }
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

  // 3. Find lead passenger (or fallback to first — Zod guarantees min 1)
  const leadPassenger =
    input.passengers.find((p) => p.isLead) ?? input.passengers[0]

  // 4. Companion passengers — everyone except the lead
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

  // 5. Hand off to createTrip
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

function isDateInFuture(date: string): boolean {
  // date >= today in Greece timezone prevents bookings for past departures
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
  return date >= today
}

function isReasonableDOB(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  const age = (new Date().getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
  return age >= 0 && age <= 120
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

function splitName(fullName: string): { first: string; last: string } {
  const parts = (fullName || '').trim().split(/\s+/)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: parts[0] }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}
