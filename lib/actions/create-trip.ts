'use server'

/**
 * Server action: createTrip
 * =========================
 * Atomically creates a Trip, its TripItems, and Passengers in
 * Supabase, then triggers post-booking notifications (email,
 * WhatsApp link generation).
 *
 * Idempotency
 * -----------
 * The form passes a client-generated UUID as `idempotencyKey`.
 * If a trip with this key already exists, we return it instead
 * of creating a duplicate. This protects against:
 *   - User double-clicking the submit button
 *   - Network retries (browser auto-retry on flaky connection)
 *   - Accidental page refresh during submit
 *
 * Atomicity
 * ---------
 * Supabase doesn't expose a transaction API to JS clients, so we
 * do best-effort cleanup if a downstream step fails. Each table
 * insert is wrapped — if passengers fail, we delete the trip.
 *
 * Notifications
 * -------------
 * Email (Resend) and WhatsApp link generation are fire-and-forget
 * AFTER the booking is committed. If they fail, the booking still
 * exists; the customer sees the confirmation page and can WhatsApp
 * us manually. We log failures for admin follow-up.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendBookingConfirmation } from '@/lib/email/send-confirmation'
import { buildPaymentWhatsAppLink, type Locale } from '@/lib/notifications/whatsapp-link'
import type {
  TripItemType,
  TripItemMetadata,
  PassengerType,
} from '@/lib/supabase'

// ============================================================
// Input shape — what the form/UI passes to this action
// ============================================================

export interface CreateTripInput {
  /** UUID generated client-side, prevents duplicate submissions */
  idempotencyKey: string

  /** Locale at the moment of booking (snapshot) */
  locale: Locale

  /** Where did this booking originate (web, admin, whatsapp_quote, etc.) */
  source?: string

  /** Customer / lead passenger */
  customer: {
    fullName: string
    firstName?: string
    lastName?: string
    gender?: '' | 'male' | 'female' | 'unspecified'
    birthDate?: string | null
    passportNumber?: string | null
    passportExpiryDate?: string | null
    type?: PassengerType
    email: string
    phone: string
    nationality?: string
    marketingConsent?: boolean
  }

  /** Itinerary — at least one item required */
  items: Array<{
    type: TripItemType
    title: string
    scheduledAt?: string | null
    endsAt?: string | null
    passengerCount: number
    priceAmount: number
    priceCurrency?: string
    metadata?: TripItemMetadata | Record<string, unknown>
    supplierId?: string | null
    cancellationPolicy?: Record<string, unknown>
  }>

  /** Optional travel companions beyond the lead passenger */
  additionalPassengers?: Array<{
    firstName: string
    lastName: string
    gender?: '' | 'male' | 'female' | 'unspecified'
    birthDate?: string | null
    passportNumber?: string | null
    passportCountry?: string | null
    passportExpiryDate?: string | null
    nationality?: string | null
    type?: PassengerType
  }>

  /** Optional customer-facing note */
  notesCustomer?: string
}

// ============================================================
// Output shape
// ============================================================

export type CreateTripResult =
  | {
      ok: true
      tripId: string
      reference: string
      paymentWhatsAppUrl: string
      emailSent: boolean
      alreadyExisted: boolean
    }
  | { ok: false; error: string; code: CreateTripErrorCode }

export type CreateTripErrorCode =
  | 'validation_failed'
  | 'database_error'
  | 'invalid_luggage'
  | 'unexpected'

// ============================================================
// Implementation
// ============================================================

export async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
  // ----- 1. Validate input -----
  const validation = validateInput(input)
  if (validation) {
    return { ok: false, error: validation, code: 'validation_failed' }
  }

  const supabase = getSupabaseAdmin()

  try {
    // ----- 2. Idempotency lookup -----
    const { data: existing, error: lookupErr } = await supabase
      .from('trips')
      .select('id, reference, currency, total_amount, locale, contact_email, contact_phone, state')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle()

    if (lookupErr) {
      console.error('[createTrip] idempotency lookup failed:', lookupErr)
      // Don't fail the whole thing — try to create anyway, the unique
      // index will catch a true duplicate at write time
    }

    if (existing) {
      // Same form submitted before. Return the existing trip — DO NOT
      // re-send the email (customer already got it).
      const waUrl = buildPaymentWhatsAppLink({
        reference: existing.reference,
        locale: existing.locale as Locale,
        totalAmount: Number(existing.total_amount),
        currency: existing.currency,
      })
      return {
        ok: true,
        tripId: existing.id,
        reference: existing.reference,
        paymentWhatsAppUrl: waUrl,
        emailSent: false,
        alreadyExisted: true,
      }
    }

    // ----- 3. Upsert customer (by email) -----
    const customerRow = await upsertCustomer(supabase, input)
    if (!customerRow.ok) {
      return {
        ok: false,
        error: customerRow.error,
        code: 'database_error',
      }
    }

    // ----- 4. Compute total + temporal bounds -----
    const totalAmount = input.items.reduce((sum, i) => sum + i.priceAmount, 0)
    const currency = input.items[0]?.priceCurrency || 'EUR'
    const dates = input.items
      .map((i) => i.scheduledAt)
      .filter((d): d is string => Boolean(d))
      .sort()
    const startDate = dates[0] ? dates[0].slice(0, 10) : null
    const endDate = dates[dates.length - 1]
      ? dates[dates.length - 1].slice(0, 10)
      : startDate

    // ----- 5. Generate trip reference -----
    const reference = await generateReference(supabase)

    // ----- 6. Insert trip -----
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .insert({
        customer_id: customerRow.id,
        reference,
        idempotency_key: input.idempotencyKey,
        state: 'pending_payment',
        start_date: startDate,
        end_date: endDate,
        party_size:
          1 + (input.additionalPassengers?.length ?? 0),
        contact_email: input.customer.email,
        contact_phone: input.customer.phone,
        currency,
        total_amount: totalAmount,
        locale: input.locale,
        source: input.source ?? 'web',
        notes_customer: input.notesCustomer ?? null,
      })
      .select('id, reference')
      .single()

    if (tripErr || !trip) {
      // Possibly a race on idempotency_key — re-check
      if (tripErr?.code === '23505') {
        const { data: raced } = await supabase
          .from('trips')
          .select('id, reference, currency, total_amount, locale')
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle()
        if (raced) {
          const waUrl = buildPaymentWhatsAppLink({
            reference: raced.reference,
            locale: raced.locale as Locale,
            totalAmount: Number(raced.total_amount),
            currency: raced.currency,
          })
          return {
            ok: true,
            tripId: raced.id,
            reference: raced.reference,
            paymentWhatsAppUrl: waUrl,
            emailSent: false,
            alreadyExisted: true,
          }
        }
      }
      console.error('[createTrip] trip insert failed:', tripErr)
      return {
        ok: false,
        error: 'Could not create trip',
        code: 'database_error',
      }
    }

    // ----- 7. Insert trip items -----
    const itemsToInsert = input.items.map((item, idx) => ({
      trip_id: trip.id,
      item_type: item.type,
      sequence: idx + 1,
      title: item.title,
      scheduled_at: item.scheduledAt ?? null,
      ends_at: item.endsAt ?? null,
      passenger_count: item.passengerCount,
      price_amount: item.priceAmount,
      price_currency: item.priceCurrency ?? currency,
      metadata: item.metadata ?? {},
      cancellation_policy: item.cancellationPolicy ?? {},
      supplier_id: item.supplierId ?? null,
      state: 'draft',
    }))

    const { error: itemsErr } = await supabase
      .from('trip_items')
      .insert(itemsToInsert)

    if (itemsErr) {
      console.error('[createTrip] trip_items insert failed:', itemsErr)
      await rollbackTrip(supabase, trip.id)
      return {
        ok: false,
        error: 'Could not save trip items',
        code: 'database_error',
      }
    }

    // ----- 8. Insert passengers (lead + companions) -----
    const passengers = buildPassengerRows(trip.id, input)
    const { error: passengersErr } = await supabase
      .from('passengers')
      .insert(passengers)

    if (passengersErr) {
      console.error('[createTrip] passengers insert failed:', passengersErr)
      await rollbackTrip(supabase, trip.id)
      return {
        ok: false,
        error: 'Could not save passenger details',
        code: 'database_error',
      }
    }

    // ----- 9. Build payment WhatsApp link -----
    const paymentWhatsAppUrl = buildPaymentWhatsAppLink({
      reference: trip.reference,
      locale: input.locale,
      totalAmount,
      currency,
    })

    // ----- 10. Send confirmation email (fire-and-forget, non-blocking) -----
    let emailSent = false
    try {
      const emailResult = await sendBookingConfirmation(input.customer.email, {
        reference: trip.reference,
        customerName: input.customer.fullName,
        contactPhone: input.customer.phone,
        contactEmail: input.customer.email,
        totalAmount,
        currency,
        locale: input.locale,
        items: input.items.map((i) => ({
          type: i.type,
          title: i.title,
          scheduledAt: i.scheduledAt ?? null,
          price: i.priceAmount,
        })),
        paymentWhatsAppUrl,
      })
      emailSent = emailResult.sent
    } catch (emailErr) {
      // Never let email failures fail the booking
      console.error('[createTrip] email send failed:', emailErr)
    }

    return {
      ok: true,
      tripId: trip.id,
      reference: trip.reference,
      paymentWhatsAppUrl,
      emailSent,
      alreadyExisted: false,
    }
  } catch (err) {
    console.error('[createTrip] unexpected error:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
      code: 'unexpected',
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function validateInput(input: CreateTripInput): string | null {
  if (!input.idempotencyKey || input.idempotencyKey.length < 16) {
    return 'Missing or invalid idempotency key'
  }
  if (!input.customer.email || !/.+@.+\..+/.test(input.customer.email)) {
    return 'Invalid email address'
  }
  if (!input.customer.phone || input.customer.phone.length < 6) {
    return 'Invalid phone number'
  }
  if (!input.customer.fullName || input.customer.fullName.trim().length < 2) {
    return 'Full name is required'
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return 'Trip must contain at least one item'
  }
  for (const item of input.items) {
    if (!item.title || !item.type) return 'Trip item is missing required fields'
    if (item.priceAmount < 0) return 'Item price cannot be negative'
    if (item.passengerCount < 1) return 'Item passenger count must be at least 1'
  }
  return null
}

async function upsertCustomer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  input: CreateTripInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // Try lookup by email first
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', input.customer.email)
    .maybeSingle()

  if (existing) {
    // Update name/phone in case they changed
    await supabase
      .from('customers')
      .update({
        full_name: input.customer.fullName,
        phone: input.customer.phone,
        nationality: input.customer.nationality ?? null,
        preferred_language: input.locale,
        marketing_consent:
          input.customer.marketingConsent ?? false,
      })
      .eq('id', existing.id)
    return { ok: true, id: existing.id }
  }

  const { data: created, error } = await supabase
    .from('customers')
    .insert({
      email: input.customer.email,
      phone: input.customer.phone,
      full_name: input.customer.fullName,
      nationality: input.customer.nationality ?? null,
      preferred_language: input.locale,
      marketing_consent: input.customer.marketingConsent ?? false,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      ok: false,
      error: error?.message ?? 'Could not create customer',
    }
  }
  return { ok: true, id: created.id }
}

async function generateReference(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<string> {
  const { data, error } = await supabase.rpc('generate_trip_reference')
  if (error || !data) {
    // Fallback: client-side reference
    return `TB-${new Date().getFullYear().toString().slice(-2)}-${cryptoRandom(6)}`
  }
  return data as string
}

function cryptoRandom(len: number): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

function buildPassengerRows(
  tripId: string,
  input: CreateTripInput
): Array<Record<string, unknown>> {
  // Lead passenger from the customer fields. Prefer the structured split-name
  // fields (passed by submitBooking); fall back to splitting the synthesized
  // fullName for any caller that only provides it (firstName/lastName optional).
  // validateInput guarantees fullName is non-empty, so first_name (NOT NULL) is
  // always populated.
  const fallbackParts = input.customer.fullName.trim().split(/\s+/)
  const leadFirst = input.customer.firstName?.trim() || fallbackParts[0] || ''
  const leadLast =
    input.customer.lastName?.trim() || fallbackParts.slice(1).join(' ') || leadFirst
  const lead = {
    trip_id: tripId,
    first_name: leadFirst,
    last_name: leadLast,
    gender: input.customer.gender || null,            // '' / undefined → null (CHECK allows only the 3 values or NULL)
    birth_date: input.customer.birthDate ?? null,
    passport_number: input.customer.passportNumber ?? null,
    passport_country: input.customer.nationality ?? null,
    passport_expiry: input.customer.passportExpiryDate || null,  // '' → null (date column)
    nationality: input.customer.nationality ?? null,
    type: input.customer.type ?? ('adult' as PassengerType),     // server-derived; no re-derive here
    is_lead: true,
    email: input.customer.email,
    phone: input.customer.phone,
  }

  const companions =
    input.additionalPassengers?.map((p) => ({
      trip_id: tripId,
      first_name: p.firstName,
      last_name: p.lastName,
      gender: p.gender || null,
      birth_date: p.birthDate ?? null,
      passport_number: p.passportNumber ?? null,
      passport_country: p.passportCountry ?? null,
      passport_expiry: p.passportExpiryDate || null,
      nationality: p.nationality ?? null,
      type: p.type ?? ('adult' as PassengerType),
      is_lead: false,
    })) ?? []

  return [lead, ...companions]
}

async function rollbackTrip(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tripId: string
): Promise<void> {
  try {
    // CASCADE delete handles trip_items + passengers automatically
    await supabase.from('trips').delete().eq('id', tripId)
  } catch (err) {
    console.error('[createTrip] rollback failed for trip', tripId, err)
    // At this point we have an orphan trip. Admin must clean up manually.
    // This is rare — only happens if both the items AND the rollback fail.
  }
}
