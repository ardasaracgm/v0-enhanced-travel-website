'use server'

/**
 * Server action: submitVisaApplication
 * ====================================
 * Persists an in-house Schengen door-visa application (Vize-1).
 *
 * Phase 1 scope: validate (server-side, non-negotiable) + persist.
 * NO file upload, NO signature, NO payment, NO email/WhatsApp
 * notifications — those arrive with payment in Vize-3. The row lands
 * in state 'pending_payment' to reflect that.
 *
 * The client wizard validates per-step with the same Zod schema, but
 * the authoritative gate is HERE: a client could post anything.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { visaApplicationSchema } from '@/lib/validation/visa'
import { z } from 'zod'

export type SubmitVisaApplicationResult =
  | { ok: true; id: string }
  | { ok: false; error: string; code: SubmitVisaErrorCode }

export type SubmitVisaErrorCode =
  | 'validation_failed'
  | 'database_error'
  | 'unexpected'

export async function submitVisaApplication(
  input: unknown,   // trust boundary — Zod is the sole gate
): Promise<SubmitVisaApplicationResult> {
  // ----- 1. Validate (full schema, incl. cross-field refines) -----
  const parsed = visaApplicationSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, code: 'validation_failed', error: formatZodError(parsed.error) }
  }
  const v = parsed.data

  // ----- 2. Insert (service-role; RLS bypassed) -----
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('visa_applications')
      .insert({
        state: 'pending_payment',          // payment wired in Vize-3
        locale: v.locale,
        source: 'web',

        // Step 1 · Travel
        entry_point: v.entryPoint,
        vessel_type: v.vesselType,

        // Step 2 · Personal
        last_name: v.lastName,
        first_name: v.firstName,
        father_name: v.fatherName,
        mother_name: v.motherName,
        birth_date: v.birthDate,
        birth_place: v.birthPlace,
        birth_country: v.birthCountry,
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

        // Step 5 · Trip
        travel_purpose: v.travelPurpose,
        stay_duration: v.stayDuration,
        schengen_last_3_years: v.schengenLast3Years,
        fingerprints_taken: v.fingerprintsTaken,
        schengen_entry_date: v.schengenEntryDate,
        schengen_exit_date: v.schengenExitDate,

        // Overflow — funding source lives in metadata (no dedicated column).
        // Zod already constrained v.fundingSource to 'self'|'sponsor'. Merge
        // over the table default '{}' so any future metadata keys survive.
        // lib/visa-documents.ts reads metadata.funding_source to decide whether
        // the sponsor_id / sponsor_bank documents are required.
        metadata: { funding_source: v.fundingSource },
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('[submitVisaApplication] insert failed:', error)
      return { ok: false, code: 'database_error', error: 'Could not save application' }
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

// Mirrors formatZodError in submit-booking.ts (kept local so this action
// doesn't import the booking flow). Flattens issues into one string.
function formatZodError(err: z.ZodError): string {
  const flat = err.flatten()
  const fieldLines = Object.entries(flat.fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
  return [...fieldLines, ...flat.formErrors].join(' | ') || err.message
}
