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
import { ageOn, parseISODate, todayAthensISO } from './dates'

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

// Jotform item 33A — means of subsistence (multi-select, at least one required).
export const FINANCING_MEANS = [
  'cash', 'travellers_cheque', 'credit_card',
  'prepaid_accommodation', 'prepaid_transport',
] as const

// Occupations for which the employer/school block (jotform item 20) is HIDDEN
// entirely — the applicant has no employer/school to name. ('noOccupation' is
// the jotform "no occupation / unemployed" slug; there is no separate
// "unemployed" option.) For every other occupation the block is SHOWN but
// fully OPTIONAL (no field is required); students get school-oriented labels.
export const EMPLOYER_HIDDEN_OCCUPATIONS: ReadonlySet<string> = new Set([
  'pensioner', 'housewife', 'househusband', 'noOccupation',
])

// Age (on the Athens "today") below which a legal guardian's details are
// required (jotform item 10).
export const GUARDIAN_AGE_THRESHOLD = 18

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
  if (diffDays < 0) {
    // Exit may equal entry (same-day day-trip = 0 nights, valid); it just
    // cannot precede entry.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['schengenExitDate'],
      message: 'schengenExitDate.beforeEntry',
    })
  } else if (diffDays > 6) {
    // Door visa: max 6 nights / 7 days (entry day inclusive).
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['schengenExitDate'],
      message: 'schengenExitDate.maxStay',
    })
  }
}

/** Push a `<field>.required` issue when a conditionally-required value is blank. */
function requireWhen(
  ctx: z.RefinementCtx,
  value: string | undefined,
  field: string,
  message: string,
) {
  if (!value || value.trim() === '') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
  }
}

// Jotform 10 — legal guardian. Required only when the applicant is a minor
// (age < 18 on the Athens "today"); every guardian field is then mandatory.
function refineGuardian(
  data: {
    birthDate: string
    guardianName?: string
    guardianAddress?: string
    guardianCity?: string
    guardianProvince?: string
    guardianPostalCode?: string
    guardianNationality?: string
  },
  ctx: z.RefinementCtx,
) {
  const age = ageOn(data.birthDate, todayAthensISO())
  if (!Number.isFinite(age) || age >= GUARDIAN_AGE_THRESHOLD) return
  requireWhen(ctx, data.guardianName, 'guardianName', 'guardianName.required')
  requireWhen(ctx, data.guardianAddress, 'guardianAddress', 'guardianAddress.required')
  requireWhen(ctx, data.guardianCity, 'guardianCity', 'guardianCity.required')
  requireWhen(ctx, data.guardianProvince, 'guardianProvince', 'guardianProvince.required')
  requireWhen(ctx, data.guardianPostalCode, 'guardianPostalCode', 'guardianPostalCode.required')
  requireWhen(ctx, data.guardianNationality, 'guardianNationality', 'guardianNationality.required')
}

// Jotform 18 — residence permit. Required only when the applicant lives in a
// country other than their nationality; both the number and a valid expiry date.
function refineResidencePermit(
  data: {
    livesInOtherCountry: boolean
    residencePermitNumber?: string
    residencePermitExpiry?: string
  },
  ctx: z.RefinementCtx,
) {
  if (data.livesInOtherCountry !== true) return
  requireWhen(ctx, data.residencePermitNumber, 'residencePermitNumber', 'residencePermitNumber.required')
  const expiry = data.residencePermitExpiry?.trim()
  if (!expiry) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['residencePermitExpiry'],
      message: 'residencePermitExpiry.required',
    })
  } else if (parseISODate(expiry) === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['residencePermitExpiry'],
      message: 'residencePermitExpiry.invalid',
    })
  }
}

// Jotform 20 — employer / school. NOT validated: the block is hidden for the
// exempt occupations (EMPLOYER_HIDDEN_OCCUPATIONS) and fully optional for every
// other occupation, so there is no required-ness rule. The employer columns are
// still persisted verbatim from whatever the applicant chose to enter.

// Jotform 31–32B — sponsor / invitation. Required only when the funding source
// is a sponsor; of the whole block ONLY the inviter/hotel name (31) is mandatory.
function refineSponsor(
  data: { fundingSource: string; inviterOrHotelName?: string },
  ctx: z.RefinementCtx,
) {
  if (data.fundingSource !== 'sponsor') return
  requireWhen(ctx, data.inviterOrHotelName, 'inviterOrHotelName', 'inviterOrHotelName.required')
}

// Jotform 33A — means of subsistence. Always required: at least one selection.
function refineFinancing(
  data: { financingMeans?: string[] },
  ctx: z.RefinementCtx,
) {
  if (!data.financingMeans || data.financingMeans.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['financingMeans'],
      message: 'financingMeans.required',
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
  lastName:           requiredText('lastName.required'),
  previousLastName:   z.string().trim().optional(),       // Jotform 2 · optional
  firstName:          requiredText('firstName.required'),
  fatherName:         requiredText('fatherName.required'),
  motherName:         requiredText('motherName.required'),
  birthDate:          isoDate('birthDate.invalid').refine(
                        (v) => v < todayAthensISO(),
                        { message: 'birthDate.past' },     // strictly before today
                      ),
  birthPlace:         requiredText('birthPlace.required'),
  birthCountry:       requiredText('birthCountry.required'),
  nationality:        requiredText('nationality.required'),    // Jotform 7 · required (Schengen)
  previousNationality:z.string().trim().optional(),            // Jotform 7A · optional
  gender:             enumField(GENDERS, 'gender.required'),
  maritalStatus:      enumField(MARITAL_STATUSES, 'maritalStatus.required'),

  // Jotform 10 · legal guardian — optional here, conditionally required for
  // minors via refineGuardian (which also reads birthDate above).
  guardianName:        z.string().trim().optional(),
  guardianAddress:     z.string().trim().optional(),
  guardianCity:        z.string().trim().optional(),
  guardianProvince:    z.string().trim().optional(),
  guardianPostalCode:  z.string().trim().optional(),
  guardianNationality: z.string().trim().optional(),
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

  // Jotform 18 · residence permit — conditionally required (lives abroad) via
  // refineResidencePermit; written to dedicated columns (migration 009).
  residencePermitNumber: z.string().trim().optional(),
  residencePermitExpiry: z.string().trim().optional(),

  // Jotform 20 · employer / school — always optional (block hidden for the
  // exempt occupations); written to metadata.employer when filled.
  employerName:        z.string().trim().optional(),
  employerAddress:     z.string().trim().optional(),
  employerCity:        z.string().trim().optional(),
  employerProvince:    z.string().trim().optional(),
  employerPostalCode:  z.string().trim().optional(),
  employerEmail:       z.string().trim().optional(),
  employerPhone:       z.string().trim().optional(),
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

  // Jotform 31–32B · sponsor / invitation — conditionally shown (funding =
  // sponsor) via refineSponsor; only the inviter/hotel name (31) is required,
  // the rest are free. Persisted to metadata.sponsor.
  inviterOrHotelName:   z.string().trim().optional(),   // 31
  accommodationAddress: z.string().trim().optional(),   // 31A
  accommodationEmail:   z.string().trim().optional(),   // 31A
  accommodationPhone:   z.string().trim().optional(),   // 31A
  inviterCompanyName:   z.string().trim().optional(),   // 32
  inviterCompanyAddress:z.string().trim().optional(),   // 32
  companyPhone:         z.string().trim().optional(),   // 32A
  companyFax:           z.string().trim().optional(),   // 32A
  contactName:          z.string().trim().optional(),   // 32B
  contactAddress:       z.string().trim().optional(),   // 32B
  contactPhone:         z.string().trim().optional(),   // 32B
  contactFax:           z.string().trim().optional(),   // 32B
  contactEmail:         z.string().trim().optional(),   // 32B

  // Jotform 33A · means of subsistence — always required, at least one option
  // (refineFinancing). Persisted to metadata.financing_means.
  financingMeans:       z.array(z.enum(FINANCING_MEANS)).optional(),
})

// ============================================================
// Per-step schemas (the wizard validates one step at a time).
// Wizard step 1 MERGES the old Travel + Personal steps into one, so the array
// has 4 entries. There is no cross-field rule spanning travel↔personal, so the
// merge is a plain shape union. The full schema below still composes ALL raw
// shapes, so every field stays validated on final submit.
// ============================================================
export const visaStep1Schema = step1Object.merge(step2Object)              // Travel + Personal
  .superRefine(refineGuardian)
export const visaStep2Schema = step3Object.superRefine(refineDocDates)     // Travel Document
export const visaStep3Schema = step4Object                                 // Contact & Occupation
  .superRefine(refineResidencePermit)
export const visaStep4Schema = step5Object.superRefine(refineSchengenDates) // Trip Details
  .superRefine(refineSponsor)
  .superRefine(refineFinancing)

// The per-step schema array the wizard iterates for next/back validation.
export const VISA_STEP_SCHEMAS = [
  visaStep1Schema, visaStep2Schema, visaStep3Schema, visaStep4Schema,
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
  .superRefine(refineGuardian)
  .superRefine(refineResidencePermit)
  .superRefine(refineSponsor)
  .superRefine(refineFinancing)

export type VisaApplicationInput = z.infer<typeof visaApplicationSchema>
