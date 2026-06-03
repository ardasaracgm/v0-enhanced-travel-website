'use server'

/**
 * Server action: submitVisaApplication
 * ====================================
 * Finalises an in-house Schengen door-visa application (Vize redesign, Faz 1).
 *
 * NEW draft model: the row already exists (created in state 'draft' by
 * POST /api/visa/draft when the wizard opened). This action does NOT insert —
 * it UPDATEs that draft with the full set of answers and advances its state
 * draft → pending_payment. Payment itself is wired in Vize-3; NO file upload,
 * NO signature, NO email/WhatsApp notifications here.
 *
 * The client wizard validates per-step with the same Zod schema, but the
 * AUTHORITATIVE "every required field is present + cross-field valid" gate is
 * HERE: a client could post anything. The DB no longer enforces NOT NULL on the
 * form columns (migration 008), so Zod is the only completeness check.
 *
 * The UPDATE is scoped to state='draft', which also makes a double-submit a
 * harmless no-op: once advanced past 'draft', the row no longer matches.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  visaApplicationSchema,
  GUARDIAN_AGE_THRESHOLD,
  EMPLOYER_HIDDEN_OCCUPATIONS,
} from '@/lib/validation/visa'
import { ageOn, parseISODate, todayAthensISO } from '@/lib/validation/dates'
import { z } from 'zod'

export type SubmitVisaApplicationResult =
  | { ok: true; id: string }
  | { ok: false; error: string; code: SubmitVisaErrorCode }

export type SubmitVisaErrorCode =
  | 'missing_draft'
  | 'validation_failed'
  | 'draft_not_found'
  | 'database_error'
  | 'unexpected'

// The draft id travels alongside the form fields. visaApplicationSchema strips
// unknown keys, so we pull it out before validating the rest.
function extractApplicationId(input: unknown): string | null {
  if (input && typeof input === 'object' && 'application_id' in input) {
    const id = (input as { application_id?: unknown }).application_id
    if (typeof id === 'string' && id.trim().length > 0) return id.trim()
  }
  return null
}

// Optional previous-Schengen-visa date (metadata.previous_schengen_visa_date).
// Travels outside visaApplicationSchema (which strips it). Optional + free: a
// missing/blank/unparseable value yields null and never blocks the submit.
function extractPreviousSchengenVisaDate(input: unknown): string | null {
  if (input && typeof input === 'object' && 'previous_schengen_visa_date' in input) {
    const raw = (input as { previous_schengen_visa_date?: unknown }).previous_schengen_visa_date
    if (typeof raw === 'string' && parseISODate(raw.trim()) !== null) return raw.trim()
  }
  return null
}

export async function submitVisaApplication(
  input: unknown,   // trust boundary — Zod is the sole gate
): Promise<SubmitVisaApplicationResult> {
  // ----- 0. The draft to finalise must be identified -----
  const applicationId = extractApplicationId(input)
  if (!applicationId) {
    return { ok: false, code: 'missing_draft', error: 'application_id is required' }
  }

  // ----- 1. Validate (full schema, incl. cross-field refines). Authoritative:
  //          a NULL-filled draft only becomes pending_payment if EVERY required
  //          field is present and valid here. -----
  const parsed = visaApplicationSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, code: 'validation_failed', error: formatZodError(parsed.error) }
  }
  const v = parsed.data

  // Optional, non-blocking — null when absent/invalid (see helper).
  const previousSchengenVisaDate = extractPreviousSchengenVisaDate(input)

  // stay_duration is no longer a form field — derive it (nights = exit − entry).
  // Validation guarantees both dates parse and the diff is within 1..7, so this
  // always lands inside the BETWEEN 1 AND 7 CHECK.
  const stayDuration = deriveStayNights(v.schengenEntryDate, v.schengenExitDate)

  // ----- Grup B conditional blocks -----
  // Guardian (jotform 10) — only persisted for minors. Validation already
  // guaranteed every guardian field is present when the applicant is a minor.
  const age = ageOn(v.birthDate, todayAthensISO())
  const isMinor = Number.isFinite(age) && age < GUARDIAN_AGE_THRESHOLD
  const guardian = isMinor
    ? cleanObject({
        name: v.guardianName,
        address: v.guardianAddress,
        city: v.guardianCity,
        province: v.guardianProvince,
        postal_code: v.guardianPostalCode,
        nationality: v.guardianNationality,
      })
    : null

  // Employer / school (jotform 20) — fully optional; persisted whenever any
  // field is filled. Dropped entirely for the hidden occupations (the block is
  // never shown for them), so stale values can't leak in if the applicant
  // changed occupation after typing.
  const employer = EMPLOYER_HIDDEN_OCCUPATIONS.has(v.occupation)
    ? null
    : cleanObject({
        name: v.employerName,
        address: v.employerAddress,
        city: v.employerCity,
        province: v.employerProvince,
        postal_code: v.employerPostalCode,
        email: v.employerEmail,
        phone: v.employerPhone,
      })

  // Residence permit (jotform 18) — dedicated columns; only when lives abroad.
  const residencePermitNumber = v.livesInOtherCountry ? v.residencePermitNumber?.trim() || null : null
  const residencePermitExpiry = v.livesInOtherCountry ? v.residencePermitExpiry?.trim() || null : null

  // ----- Grup A sponsor / financing -----
  // Sponsor / invitation (jotform 31–32B) — only persisted when a sponsor funds
  // the trip. Validation guaranteed the inviter/hotel name (31) is present then.
  const sponsor = v.fundingSource === 'sponsor'
    ? cleanObject({
        inviter_or_hotel_name: v.inviterOrHotelName,
        accommodation_address: v.accommodationAddress,
        accommodation_email: v.accommodationEmail,
        accommodation_phone: v.accommodationPhone,
        company_name: v.inviterCompanyName,
        company_address: v.inviterCompanyAddress,
        company_phone: v.companyPhone,
        company_fax: v.companyFax,
        contact_name: v.contactName,
        contact_address: v.contactAddress,
        contact_phone: v.contactPhone,
        contact_fax: v.contactFax,
        contact_email: v.contactEmail,
      })
    : null

  // Means of subsistence (jotform 33A) — always present (validation enforced ≥1).
  const financingMeans = v.financingMeans ?? []

  // ----- 2. UPDATE the draft (service-role; RLS bypassed) -----
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('visa_applications')
      .update({
        state: 'pending_payment',          // draft → pending_payment (payment in Vize-3)
        locale: v.locale,

        // Step 1 · Travel
        entry_point: v.entryPoint,
        vessel_type: v.vesselType,

        // Step 2 · Personal
        last_name: v.lastName,
        previous_last_name: v.previousLastName?.trim() || null,       // Jotform 2 · optional
        first_name: v.firstName,
        father_name: v.fatherName,
        mother_name: v.motherName,
        birth_date: v.birthDate,
        birth_place: v.birthPlace,
        birth_country: v.birthCountry,
        nationality: v.nationality,                                   // Jotform 7 · required
        previous_nationality: v.previousNationality?.trim() || null,  // Jotform 7A · optional
        gender: v.gender,
        marital_status: v.maritalStatus,

        // Step 3 · Document
        id_number: v.idNumber,
        doc_type: v.docType,
        doc_number: v.docNumber,
        doc_issue_date: v.docIssueDate,
        doc_expiry_date: v.docExpiryDate,
        issuing_authority: v.issuingAuthority,

        // Step 4 · Contact
        residence_address: v.residenceAddress,
        email: v.email,
        phone: v.phone,
        lives_in_other_country: v.livesInOtherCountry,
        occupation: v.occupation,

        // Jotform 18 · residence permit (conditional: lives abroad) — migration 009
        residence_permit_number: residencePermitNumber,
        residence_permit_expiry: residencePermitExpiry,

        // Step 5 · Trip
        travel_purpose: v.travelPurpose,
        stay_duration: stayDuration,
        schengen_last_3_years: v.schengenLast3Years,
        fingerprints_taken: v.fingerprintsTaken,
        schengen_entry_date: v.schengenEntryDate,
        schengen_exit_date: v.schengenExitDate,

        // Overflow — funding source lives in metadata (no dedicated column).
        // Zod already constrained v.fundingSource to 'self'|'sponsor'.
        // lib/visa-documents.ts reads metadata.funding_source to decide whether
        // the sponsor_id / sponsor_bank documents are required. The optional
        // previous-Schengen-visa date is parked here too (only when provided) —
        // no dedicated column, no impact on the required-docs engine.
        metadata: {
          funding_source: v.fundingSource,
          ...(previousSchengenVisaDate
            ? { previous_schengen_visa_date: previousSchengenVisaDate }
            : {}),
          ...(guardian ? { guardian } : {}),    // jotform 10 (minors)
          ...(employer ? { employer } : {}),    // jotform 20 (employer/school)
          ...(sponsor ? { sponsor } : {}),      // jotform 31–32B (invitation)
          financing_means: financingMeans,      // jotform 33A (≥1 selection)
        },

        updated_at: new Date().toISOString(),
      })
      // Scope to the draft: guards against finalising an already-submitted row
      // and makes a double-submit a harmless 0-row no-op.
      .eq('id', applicationId)
      .eq('state', 'draft')
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[submitVisaApplication] update failed:', error)
      return { ok: false, code: 'database_error', error: 'Could not save application' }
    }
    if (!data) {
      // No row matched id + state='draft': unknown id, or already finalised.
      return { ok: false, code: 'draft_not_found', error: 'Draft not found or already submitted' }
    }

    return { ok: true, id: data.id }
  } catch (err) {
    console.error('[submitVisaApplication] unexpected error:', err)
    return {
      ok: false,
      code: 'unexpected',
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// ============================================================
// Helpers
// ============================================================

/** Trim a record of optional strings, dropping blanks. Returns null if nothing
 *  remains — used to omit empty metadata sub-objects (guardian, employer, …). */
function cleanObject(
  entries: Record<string, string | undefined>,
): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(entries)) {
    const trimmed = raw?.trim()
    if (trimmed) out[key] = trimmed
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Nights between two YYYY-MM-DD dates (exit − entry). null if either won't parse. */
function deriveStayNights(entryDate: string, exitDate: string): number | null {
  const entry = parseISODate(entryDate)
  const exit = parseISODate(exitDate)
  if (!entry || !exit) return null
  return Math.round((exit.getTime() - entry.getTime()) / 86_400_000)
}

// Mirrors formatZodError in submit-booking.ts (kept local so this action
// doesn't import the booking flow). Flattens issues into one string.
function formatZodError(err: z.ZodError): string {
  const flat = err.flatten()
  const fieldLines = Object.entries(flat.fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
  return [...fieldLines, ...flat.formErrors].join(' | ') || err.message
}
