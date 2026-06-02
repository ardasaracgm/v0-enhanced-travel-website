/**
 * Schengen door-visa application validation (Vize-1, Phase 1).
 *
 * Single source of truth for both the client wizard (per-step safeParse)
 * and the submitVisaApplication server action (full safeParse). Mirrors
 * lib/validation/booking.ts conventions:
 *   - error messages are i18n KEY FRAGMENTS (e.g. 'birthDate.past'),
 *     resolved on the page under `visaPage.form.errors`, never English.
 *   - lexical YYYY-MM-DD comparison (safe for date strings).
 *   - option arrays are the single source for the Zod enums; the DB CHECK
 *     constraints and i18n option keys must stay in lockstep with these.
 *
 * Phase 1 only: NO file upload, NO signature, NO payment.
 */

import { z } from 'zod'
import { parseISODate, todayAthensISO } from './dates'

// ============================================================
// Canonical option sets (keep in lockstep with the DB CHECKs + i18n)
// ============================================================
export const ENTRY_POINTS     = ['kos', 'kalymnos', 'rhodos'] as const
export const VESSEL_TYPES      = ['ferry_san_nicolas', 'catamaran_seastar'] as const
export const GENDERS           = ['male', 'female'] as const
export const MARITAL_STATUSES  = ['single', 'married', 'separated', 'divorced', 'widowed'] as const
export const DOC_TYPES         = ['normal', 'diplomatic', 'service', 'official', 'special'] as const
export const TRAVEL_PURPOSES   = ['tourism', 'business'] as const
export const FUNDING_SOURCES   = ['self', 'sponsor'] as const   // jotform item 33 — who pays

// 35 jotform occupation slugs, stored verbatim in the DB.
export const OCCUPATIONS = [
  'architect', 'artisan', 'legal', 'artist', 'farmer',
  'banker', 'tradesman', 'manager', 'clergy', 'driver',
  'researcher', 'teacher', 'whiteCollar', 'civilServant', 'politician',
  'computerExpert', 'electronicsExpert', 'chemicalEngineer', 'technician', 'journalist',
  'medicalPharma', 'seaman', 'blueCollar', 'selfEmployed', 'fashionCosmetics',
  'policeMilitary', 'pensioner', 'sportsman', 'noOccupation', 'student',
  'diplomat', 'magistrate', 'companyExecutive', 'housewife', 'househusband',
] as const

// ============================================================
// Reusable field builders
// ============================================================
const requiredText = (key: string) => z.string().trim().min(1, key)

/** Strict YYYY-MM-DD with a "must be a real date" fragment. */
const isoDate = (invalidKey: string) =>
  z.string().refine((v) => parseISODate(v) !== null, { message: invalidKey })

/** Generic z.enum wrapper that preserves the literal union AND attaches an
 *  i18n key-fragment errorMap. */
const enumField = <T extends readonly [string, ...string[]]>(values: T, key: string) =>
  z.enum(values, { errorMap: () => ({ message: key }) })

// ============================================================
// Cross-field refines — defined ONCE, reused by both the per-step schema
// and the full schema so the two cannot desync. The param types are the
// minimal field subsets each rule reads; the full-schema output is a
// structural superset, so these callbacks attach to either without casts.
// ============================================================
function refineDocDates(
  data: { docIssueDate: string; docExpiryDate: string },
  ctx: z.RefinementCtx,
) {
  // Expiry cannot precede issue (DB has the same backstop constraint).
  if (data.docExpiryDate < data.docIssueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['docExpiryDate'],
      message: 'docExpiryDate.beforeIssue',
    })
  }
}

function refineSchengenDates(
  data: { schengenEntryDate: string; schengenExitDate: string },
  ctx: z.RefinementCtx,
) {
  const entry = parseISODate(data.schengenEntryDate)
  const exit = parseISODate(data.schengenExitDate)
  // Invalid/empty dates are already flagged by the per-field isoDate refine.
  if (!entry || !exit) return
  const diffDays = Math.round((exit.getTime() - entry.getTime()) / 86_400_000)
  if (diffDays < 1) {
    // Exit must be strictly after entry (same-day = 0 nights is invalid).
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['schengenExitDate'],
      message: 'schengenExitDate.beforeEntry',
    })
  } else if (diffDays > 7) {
    // Door visa: max 7 nights (entry + 7).
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['schengenExitDate'],
      message: 'schengenExitDate.maxStay',
    })
  }
}

// ============================================================
// Raw per-step object shapes (no refine). The full schema composes these
// via `.shape`; the exported step schemas below attach the refines.
// ============================================================
const step1Object = z.object({
  entryPoint: enumField(ENTRY_POINTS, 'entryPoint.required'),
  vesselType: enumField(VESSEL_TYPES, 'vesselType.required'),
})

const step2Object = z.object({
  lastName:      requiredText('lastName.required'),
  firstName:     requiredText('firstName.required'),
  fatherName:    requiredText('fatherName.required'),
  motherName:    requiredText('motherName.required'),
  birthDate:     isoDate('birthDate.invalid').refine(
                   (v) => v < todayAthensISO(),
                   { message: 'birthDate.past' },          // strictly before today
                 ),
  birthPlace:    requiredText('birthPlace.required'),
  birthCountry:  requiredText('birthCountry.required'),
  gender:        enumField(GENDERS, 'gender.required'),
  maritalStatus: enumField(MARITAL_STATUSES, 'maritalStatus.required'),
})

const step3Object = z.object({
  idNumber:         requiredText('idNumber.required'),
  docType:          enumField(DOC_TYPES, 'docType.required'),
  docNumber:        requiredText('docNumber.required'),
  docIssueDate:     isoDate('docIssueDate.invalid').refine(
                      (v) => v <= todayAthensISO(),
                      { message: 'docIssueDate.afterToday' },  // issue cannot be in the future
                    ),
  docExpiryDate:    isoDate('docExpiryDate.invalid').refine(
                      (v) => v >= todayAthensISO(),
                      { message: 'docExpiryDate.beforeToday' },
                    ),
  issuingAuthority: requiredText('issuingAuthority.required'),
})

const step4Object = z.object({
  residenceAddress:    requiredText('residenceAddress.required'),
  email:               z.string().trim().min(1, 'email.required').email('email.invalid'),
  phone:               z.string().trim().min(7, 'phone.invalid'),   // REQUIRED, format-only
  livesInOtherCountry: z.boolean({ errorMap: () => ({ message: 'livesInOtherCountry.required' }) }),
  occupation:          enumField(OCCUPATIONS, 'occupation.required'),
})

const step5Object = z.object({
  travelPurpose:      enumField(TRAVEL_PURPOSES, 'travelPurpose.required'),
  fundingSource:      enumField(FUNDING_SOURCES, 'fundingSource.required'),  // → metadata.funding_source
  // Removed from the form (Faz 1): the stay length is now derived from the
  // entry/exit dates (see refineSchengenDates) and written server-side on submit.
  // Kept optional so a stray client value still validates and the column survives.
  stayDuration:       z.coerce.number({ errorMap: () => ({ message: 'stayDuration.range' }) })
                        .int('stayDuration.range').min(1, 'stayDuration.range').max(7, 'stayDuration.range')
                        .optional(),
  schengenLast3Years: z.boolean({ errorMap: () => ({ message: 'schengenLast3Years.required' }) }),
  fingerprintsTaken:  z.boolean({ errorMap: () => ({ message: 'fingerprintsTaken.required' }) }),
  schengenEntryDate:  isoDate('schengenEntryDate.invalid'),
  schengenExitDate:   isoDate('schengenExitDate.invalid'),
})

// ============================================================
// Per-step schemas (the wizard validates one step at a time)
// ============================================================
export const visaStep1Schema = step1Object
export const visaStep2Schema = step2Object
export const visaStep3Schema = step3Object.superRefine(refineDocDates)
export const visaStep4Schema = step4Object
export const visaStep5Schema = step5Object.superRefine(refineSchengenDates)

// The per-step schema array the wizard iterates for next/back validation.
export const VISA_STEP_SCHEMAS = [
  visaStep1Schema, visaStep2Schema, visaStep3Schema, visaStep4Schema, visaStep5Schema,
] as const

// ============================================================
// Full application schema (server action validates the whole thing).
// Composes the raw object shapes and re-applies the SAME refine callbacks
// once — no duplicated refine logic, no .innerType() unwrapping.
// ============================================================
export const visaApplicationSchema = z
  .object({ locale: z.enum(['tr', 'en']) })
  .extend(step1Object.shape)
  .extend(step2Object.shape)
  .extend(step3Object.shape)
  .extend(step4Object.shape)
  .extend(step5Object.shape)
  .superRefine(refineDocDates)
  .superRefine(refineSchengenDates)

export type VisaApplicationInput = z.infer<typeof visaApplicationSchema>
