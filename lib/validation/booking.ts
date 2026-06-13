/**
 * Shared booking validation — single source of truth for both the
 * client passenger form (imperative safeParse) and the server action
 * (submitBooking). Extracted out of submit-booking.ts so a 'use client'
 * page can import the schema without pulling in a server action.
 *
 * Travel-date dependency
 * ----------------------
 * Two rules need the OUTBOUND DEPARTURE date:
 *   - passportExpiryDate must be valid AND after travel (passport can't
 *     expire before you sail).
 *   - age banding (derivePassengerType) is computed at the travel date,
 *     not "now" — a child turning 12 before sailing pays adult.
 * So the schema is produced by a factory, makePassengerSchema({ outboundDate,
 * returnDate }) — see that function's doc for why two dates.
 * derivePassengerType is a separate, server-only function (the client
 * never sends a passenger type — it's derived and persisted server-side).
 *
 * Error messages are i18n KEY FRAGMENTS (e.g. 'birthDate.future'), resolved
 * by the page under the `passengerDetails.errors` namespace, not English.
 */

import { z } from 'zod'
import type { PassengerType } from '@/lib/supabase'

// ============================================================
// Date helpers (calendar-correct — no 365.25 float approximation)
// ============================================================

/** Strict YYYY-MM-DD parse. Rejects rollovers like 2026-02-30. UTC-based. */
function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const year = +m[1], month = +m[2], day = +m[3]
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null
  }
  return dt
}

/** Today as YYYY-MM-DD in the operator's timezone (Greece), matching submit-booking. */
export function todayAthensISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
}

/**
 * Calendar-correct age in whole years on `refDate`.
 * Year difference, minus 1 if the birthday hasn't occurred by refDate.
 * Both args are YYYY-MM-DD. Returns NaN if either is unparseable.
 */
export function ageOn(birthDate: string, refDate: string): number {
  const b = parseISODate(birthDate)
  const r = parseISODate(refDate)
  if (!b || !r) return NaN
  let age = r.getUTCFullYear() - b.getUTCFullYear()
  const birthdayNotYetReached =
    r.getUTCMonth() < b.getUTCMonth() ||
    (r.getUTCMonth() === b.getUTCMonth() && r.getUTCDate() < b.getUTCDate())
  if (birthdayNotYetReached) age -= 1
  return age
}

// ============================================================
// Age banding → PassengerType
// ============================================================
// Operator's real bands: age < 3 = infant, < 12 = child, >= 12 = adult.
// Exclusive upper bounds. If a future operator uses different cut-offs,
// override here (or per-operator in Kademe 7) — passenger data is unaffected.
export const AGE_BANDS = {
  infantMaxExclusive: 3,
  childMaxExclusive: 12,
} as const

/**
 * Derive our canonical PassengerType ('adult'|'child'|'infant') from birthDate,
 * measured at the TRAVEL date. Server-only — the client never sends a type.
 * Falls back to 'adult' if birthDate is unparseable (the schema validates it
 * upstream, so this is just a safe default).
 */
export function derivePassengerType(birthDate: string, travelDate: string): PassengerType {
  const age = ageOn(birthDate, travelDate)
  if (Number.isNaN(age)) return 'adult'
  if (age < AGE_BANDS.infantMaxExclusive) return 'infant'
  if (age < AGE_BANDS.childMaxExclusive) return 'child'
  return 'adult'
}

/**
 * UNCONFIRMED · UNUSED until Kademe 7.
 * Dentur/Mira's PassengerInfo appears to use a numeric type id; this is our
 * best guess at the mapping. Do NOT store this in the DB (we persist the
 * string PassengerType). Wire + verify against the real API in Kademe 7.
 */
export const DENTUR_TYPE_ID: Record<PassengerType, number> = {
  adult: 1,
  child: 2,
  infant: 3,
}

// ============================================================
// Passenger schema (factory — needs the outbound travel date)
// ============================================================

/**
 * Two travel dates, on purpose:
 *   - Age banding is judged at the OUTBOUND date (the day you sail out) — that
 *     lives in derivePassengerType (server-side), NOT in this schema.
 *   - Passport validity must cover the WHOLE trip, so the expiry floor is the
 *     LAST travel day: returnDate for a round-trip, else outboundDate.
 * outboundDate is therefore used here only as the one-way fallback for the
 * expiry floor. Both args optional; omit to fall back to "today (Athens)".
 */
export function makePassengerSchema(
  { outboundDate, returnDate }: { outboundDate?: string; returnDate?: string } = {}
) {
  // Passport must be valid through the last day of travel (see note above).
  const expiryFloor = returnDate ?? outboundDate ?? todayAthensISO()

  return z.object({
    firstName: z.string().trim().min(1, 'firstName.required'),
    lastName: z.string().trim().min(1, 'lastName.required'),

    // Canonical value set; Dentur wire mapping (incl. 'unspecified') deferred to K7.
    gender: z.enum(['male', 'female', 'unspecified'], {
      errorMap: () => ({ message: 'gender.required' }),
    }),

    birthDate: z.string().superRefine((val, ctx) => {
      const d = parseISODate(val)
      if (!d) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'birthDate.invalid' })
        return
      }
      const age = ageOn(val, todayAthensISO())
      if (age < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'birthDate.future' })
      } else if (age > 120) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'birthDate.tooOld' })
      }
    }),

    // NOTE (Kademe 7): may also need to accept a TR national ID (kimlik).
    // UNCONFIRMED — ask the operator. For now treat strictly as a passport string.
    passportNumber: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{5,20}$/i, 'passport.invalid'),

    // Optional: empty allowed. If provided, must be a real date AFTER travel.
    passportExpiryDate: z
      .string()
      .optional()
      .superRefine((val, ctx) => {
        if (!val || val.trim() === '') return // empty is allowed
        if (!parseISODate(val)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'passportExpiry.invalid' })
          return
        }
        if (val <= expiryFloor) {
          // lexical compare is safe for YYYY-MM-DD
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'passportExpiry.beforeTravel' })
        }
      }),

    nationality: z.string().trim().min(2, 'nationality.required'),
  })
}

// ============================================================
// Driver schema (car-rental standalone — lightweight, no passport)
// ============================================================
// Car-only bookings collect a DRIVER, not a ferry passenger: name + DOB only.
// Email/phone live at the contact level (contactEmail/contactPhone), validated
// structurally in submitBooking — not per-row here. Passport/nationality/gender
// are intentionally absent (those passengers columns are nullable; createTrip
// writes ?? null). Age floor is a business rule: drivers must be >= 21.
export const DRIVER_MIN_AGE = 21

export function makeDriverSchema() {
  return z.object({
    firstName: z.string().trim().min(1, 'firstName.required'),
    lastName: z.string().trim().min(1, 'lastName.required'),
    birthDate: z.string().superRefine((val, ctx) => {
      const d = parseISODate(val)
      if (!d) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'birthDate.invalid' })
        return
      }
      const age = ageOn(val, todayAthensISO())
      if (age < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'birthDate.future' })
      } else if (age > 120) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'birthDate.tooOld' })
      } else if (age < DRIVER_MIN_AGE) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'birthDate.driverMinAge' })
      }
    }),
  })
}

/** Qualifying driver (>=21) who falls in the 21–24 young-driver band. No price
 *  effect — just an ops flag surfaced on the car_rental item metadata. */
export function isYoungDriver(birthDate: string): boolean {
  const age = ageOn(birthDate, todayAthensISO())
  return age >= DRIVER_MIN_AGE && age < 25
}

export type DriverInput = z.infer<ReturnType<typeof makeDriverSchema>>

// ============================================================
// Contact schema
// ============================================================

export const contactSchema = z.object({
  contactEmail: z.string().trim().min(1, 'email.required').email('email.invalid'),
  contactPhone: z.string().trim().min(7, 'phone.invalid'),
})

// ============================================================
// Combined form schema (page validates passengers + contact together)
// ============================================================

export function makePassengerFormSchema(
  dates: { outboundDate?: string; returnDate?: string } = {}
) {
  return z.object({
    passengers: z.array(makePassengerSchema(dates)).min(1),
    contactEmail: z.string().trim().min(1, 'email.required').email('email.invalid'),
    contactPhone: z.string().trim().min(7, 'phone.invalid'),
  })
}

// Inferred input types for consumers (page state + server action).
export type PassengerInput = z.infer<ReturnType<typeof makePassengerSchema>>
export type PassengerFormInput = z.infer<ReturnType<typeof makePassengerFormSchema>>
