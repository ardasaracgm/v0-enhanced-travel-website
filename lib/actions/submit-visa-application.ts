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
import { createTrip } from '@/lib/actions/create-trip'
import { createPaymentOrder } from '@/lib/actions/create-payment-order'
import { VISA_FEE_EUR, isValidPromoCode } from '@/lib/visa-pricing'
import {
  visaApplicationSchema,
  GUARDIAN_AGE_THRESHOLD,
  EMPLOYER_HIDDEN_OCCUPATIONS,
} from '@/lib/validation/visa'
import { ageOn, parseISODate, todayAthensISO } from '@/lib/validation/dates'
import { z } from 'zod'

export type SubmitVisaApplicationResult =
  | { ok: true; id: string; tripId?: string; redirectUrl?: string; paymentWhatsAppUrl?: string; free?: boolean }
  | { ok: false; error: string; code: SubmitVisaErrorCode }

export type SubmitVisaErrorCode =
  | 'missing_draft'
  | 'validation_failed'
  | 'draft_not_found'
  | 'database_error'
  | 'invalid_promo'
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

// promoCode form alanlarıyla gelir; visaApplicationSchema strip eder → ham
// input'tan çek (extractApplicationId kalıbı).
function extractPromoCode(input: unknown): string | null {
  if (input && typeof input === 'object' && 'promoCode' in input) {
    const c = (input as { promoCode?: unknown }).promoCode
    if (typeof c === 'string' && c.trim().length > 0) return c.trim()
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

  // stay_duration is no longer a form field — derive it. Stored as DAYS (entry
  // day inclusive): 0 nights = 1 day, 6 nights = 7 days. Validation guarantees
  // both dates parse and nights are within 0..6, so this always lands inside
  // the BETWEEN 1 AND 7 CHECK.
  const stayDuration = deriveStayDays(v.schengenEntryDate, v.schengenExitDate)

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

  // Cevap kolonları — kuponlu (ücretsiz) ve €90 dallarının ORTAK gövdesi.
  // Branch'ler yalnız state/trip_id/promo_code/updated_at ekler/değiştirir.
  const answerColumns = {
    locale: v.locale,
    entry_point: v.entryPoint,
    vessel_type: v.vesselType,
    last_name: v.lastName,
    previous_last_name: v.previousLastName?.trim() || null,
    first_name: v.firstName,
    father_name: v.fatherName,
    mother_name: v.motherName,
    birth_date: v.birthDate,
    birth_place: v.birthPlace,
    birth_country: v.birthCountry,
    nationality: v.nationality,
    previous_nationality: v.previousNationality?.trim() || null,
    gender: v.gender,
    marital_status: v.maritalStatus,
    id_number: v.idNumber,
    doc_type: v.docType,
    doc_number: v.docNumber,
    doc_issue_date: v.docIssueDate,
    doc_expiry_date: v.docExpiryDate,
    issuing_authority: v.issuingAuthority,
    residence_address: v.residenceAddress,
    email: v.email,
    phone: v.phone,
    lives_in_other_country: v.livesInOtherCountry,
    occupation: v.occupation,
    residence_permit_number: residencePermitNumber,
    residence_permit_expiry: residencePermitExpiry,
    travel_purpose: v.travelPurpose,
    stay_duration: stayDuration,
    schengen_last_3_years: v.schengenLast3Years,
    fingerprints_taken: v.fingerprintsTaken,
    schengen_entry_date: v.schengenEntryDate,
    schengen_exit_date: v.schengenExitDate,
    metadata: {
      funding_source: v.fundingSource,
      ...(previousSchengenVisaDate ? { previous_schengen_visa_date: previousSchengenVisaDate } : {}),
      ...(guardian ? { guardian } : {}),
      ...(employer ? { employer } : {}),
      ...(sponsor ? { sponsor } : {}),
      financing_means: financingMeans,
    },
  }

  // ----- 2. Submit (service-role; RLS bypassed) -----
  try {
    const supabase = getSupabaseAdmin()

    // ----- Kuponlu dal: geçerli kod → ÜCRETSİZ; createTrip/Viva ATLA, state=documents_submitted. -----
    const promoCode = extractPromoCode(input)
    if (promoCode) {
      if (!isValidPromoCode(promoCode)) {
        // Geçersiz kod: draft 'draft'ta kalır → kullanıcı düzeltip retry edebilir.
        return { ok: false, code: 'invalid_promo', error: 'Invalid promo code' }
      }
      const { data, error } = await supabase
        .from('visa_applications')
        .update({
          ...answerColumns,
          state: 'documents_submitted', // ücret yok → ödeme atlanır (CHECK'te mevcut)
          promo_code: promoCode,        // migration 015
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('state', 'draft')
        .select('id')
        .maybeSingle()
      if (error) {
        console.error('[submitVisaApplication] promo update failed:', error)
        return { ok: false, code: 'database_error', error: 'Could not save application' }
      }
      if (!data) {
        return { ok: false, code: 'draft_not_found', error: 'Draft not found or already submitted' }
      }
      return { ok: true, id: data.id, free: true }
    }

    // ----- 2. createTrip FIRST — draft HÂLÂ 'draft'. Fail ederse state ilerlemez,
    //          başvuru retry edilebilir (kilit yok). idempotencyKey=application_id
    //          (UUID, ≥16) → retry'da createTrip mevcut trip'i döndürür, çift trip yok.
    //          Katman A: makePassengerSchema DEĞİL — kimlik alanları opsiyonel passthrough.
    const tripResult = await createTrip({
      idempotencyKey: applicationId,
      locale: v.locale,
      source: 'visa',
      customer: {
        fullName: `${v.firstName} ${v.lastName}`.trim(),
        email: v.email,
        phone: v.phone,
        firstName: v.firstName,
        lastName: v.lastName,
        gender: v.gender,                  // 'male'|'female' ⊂ izinli küme
        birthDate: v.birthDate,
        passportNumber: v.docNumber,
        passportExpiryDate: v.docExpiryDate,
        nationality: v.nationality,
      },
      items: [{
        type: 'visa',
        title: 'Visa Application',         // i18n sonra; şimdilik sabit
        priceAmount: VISA_FEE_EUR,         // EUR decimal (90) — cents DEĞİL
        passengerCount: 1,
        metadata: { application_id: applicationId },
      }],
    })
    if (!tripResult.ok) {
      // Draft 'draft'ta kaldı → retry edilebilir. createTrip kodlarından yalnız
      // ikisi vize'de oluşabilir (validation_failed/database_error); gerisi 'unexpected'.
      const code = tripResult.code === 'validation_failed' || tripResult.code === 'database_error'
        ? tripResult.code
        : 'unexpected'
      return { ok: false, code, error: tripResult.error }
    }

    // ----- 3. TEK atomik UPDATE: cevaplar + state + trip_id, .eq('state','draft')
    //          ile scope'lu (createTrip başarısı = state ilerletmenin ön koşulu). -----
    const { data, error } = await supabase
      .from('visa_applications')
      .update({
        ...answerColumns,
        state: 'pending_payment',          // draft → pending_payment
        trip_id: tripResult.tripId,        // vize ↔ trip bağı (migration 014)
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

    // ----- 4. Viva ödeme siparişi (non-fatal — ulaşılamazsa WhatsApp fallback). -----
    let redirectUrl: string | undefined
    try {
      const pay = await createPaymentOrder({ tripId: tripResult.tripId, locale: v.locale })
      if (pay.ok) redirectUrl = pay.redirectUrl
      else console.warn('[submitVisaApplication] Viva order failed, WhatsApp fallback:', pay.error)
    } catch (err) {
      console.error('[submitVisaApplication] createPaymentOrder threw:', err)
    }

    return {
      ok: true,
      id: data.id,
      tripId: tripResult.tripId,
      redirectUrl,
      paymentWhatsAppUrl: tripResult.paymentWhatsAppUrl,
    }
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

/** Inclusive day count ((exit − entry) + 1). Same-day = 1 day, 6 nights = 7 days. null if either won't parse. */
function deriveStayDays(entryDate: string, exitDate: string): number | null {
  const entry = parseISODate(entryDate)
  const exit = parseISODate(exitDate)
  if (!entry || !exit) return null
  return Math.round((exit.getTime() - entry.getTime()) / 86_400_000) + 1
}

// Mirrors formatZodError in submit-booking.ts (kept local so this action
// doesn't import the booking flow). Flattens issues into one string.
function formatZodError(err: z.ZodError): string {
  const flat = err.flatten()
  const fieldLines = Object.entries(flat.fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
  return [...fieldLines, ...flat.formErrors].join(' | ') || err.message
}
