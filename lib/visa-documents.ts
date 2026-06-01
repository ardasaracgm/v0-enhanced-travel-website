/**
 * Visa document catalogue + condition engine (Vize-2, step 4).
 * ============================================================
 * The single source of truth for WHICH documents a given visa application
 * needs and how each is labelled. The upload UI renders one slot per entry
 * returned by resolveDocuments(); the doc_type keys here are the same free-text
 * slugs stored in visa_documents.doc_type (migration 006 — no DB enum, on
 * purpose, so this catalogue can evolve without a migration).
 *
 * Size/MIME limits are NOT redefined here — they live in
 * lib/visa/upload-constants.ts and are re-exported below so the UI has one
 * import surface.
 *
 * i18n: TR labels are native; EL labels are English fallbacks for now (the
 * brief: "el şimdilik İngilizce fallback"). A later pass can localise EL.
 *
 * Pure module — no server-only deps, safe to import from client components.
 */

import {
  VISA_DOC_ALLOWED_MIME_TYPES,
  VISA_DOC_MAX_BYTES,
  VISA_DOC_MIN_BYTES,
} from '@/lib/visa/upload-constants'
import { ageOn, todayAthensISO } from '@/lib/validation/dates'

// Re-export so consumers import limits + catalogue from one place.
export {
  VISA_DOC_ALLOWED_MIME_TYPES,
  VISA_DOC_MAX_BYTES,
  VISA_DOC_MIN_BYTES,
}

export type VisaDocLocale = 'tr' | 'el'

/**
 * The application fields the condition engine reads. Snake_case because this
 * is the visa_applications DB row shape (not the camelCase Zod input). Only
 * the fields the rules touch are declared; everything is optional/tolerant so
 * a partial row never throws.
 */
export interface VisaApplicationForDocs {
  birth_date?: string | null
  vessel_type?: string | null
  metadata?: { funding_source?: string | null } | null
}

/** A `required` rule is either a constant or a predicate over the application. */
type RequiredRule = boolean | ((app: VisaApplicationForDocs) => boolean)

export interface VisaDocSpec {
  key: string
  /** Native Turkish label. */
  tr: string
  /** Greek label — English fallback for now. */
  el: string
  /** Optional Turkish label override when the vessel is a yacht. */
  yachtTr?: string
  required: RequiredRule
}

export interface ResolvedVisaDoc {
  key: string
  label: string
  isRequired: boolean
}

// ============================================================
// Internal helpers
// ============================================================

/** True when the application's vessel is a yacht (drives the yacht labels). */
function isYacht(app: VisaApplicationForDocs): boolean {
  return app.vessel_type === 'yacht'
}

/** Calendar age today (Athens tz). NaN-safe: unknown/unparseable → not a minor. */
function isMinor(app: VisaApplicationForDocs): boolean {
  if (!app.birth_date) return false
  const age = ageOn(app.birth_date, todayAthensISO())
  return Number.isFinite(age) && age < 18
}

/** True when the applicant declared a third-party (sponsor) funding source. */
function isSponsored(app: VisaApplicationForDocs): boolean {
  return app.metadata?.funding_source === 'sponsor'
}

// ============================================================
// The catalogue. Order = render order in the UI.
// ============================================================
export const VISA_DOCUMENTS: readonly VisaDocSpec[] = [
  // ----- Always required (every application) -----
  {
    key: 'biometric_photo',
    tr: 'Biyometrik Fotoğraf',
    el: 'Biometric Photo',
    required: true,
  },
  {
    key: 'passport',
    tr: 'Pasaport (varsa önceki Schengen vizesi)',
    el: 'Passport (with previous Schengen visa if any)',
    required: true,
  },
  {
    key: 'id_card',
    tr: 'Kimlik Ön ve Arka Yüz',
    el: 'ID Card (front and back)',
    required: true,
  },
  {
    key: 'bank_statement',
    tr: 'Banka Hesap Hareketleri (ilk/son sayfa)',
    el: 'Bank Statement (first/last page)',
    required: true,
  },
  {
    key: 'ticket',
    tr: 'Seyahat Bileti',
    el: 'Travel Ticket',
    yachtTr: 'Yat Registry',
    required: true,
  },
  {
    key: 'insurance',
    tr: 'Seyahat Sigortası',
    el: 'Travel Insurance',
    yachtTr: 'Yat Sigortası',
    required: true,
  },
  {
    key: 'hotel',
    tr: 'Otel Rezervasyonu',
    el: 'Hotel Reservation',
    yachtTr: 'Yat Registry',
    required: true,
  },

  // ----- Conditional -----
  {
    key: 'credit_card',
    tr: 'Kredi Kartı Ön ve Arka',
    el: 'Credit Card (front and back)',
    required: false, // always optional
  },
  {
    key: 'consent_form',
    tr: 'Muvafakatname',
    el: 'Consent Form',
    required: isMinor, // required when applicant is under 18
  },
  {
    key: 'sponsor_id',
    tr: 'Sponsor Kimlik',
    el: 'Sponsor ID',
    required: isSponsored,
  },
  {
    key: 'sponsor_bank',
    tr: 'Sponsor Banka Hareketleri',
    el: 'Sponsor Bank Statement',
    required: isSponsored,
  },
] as const

// ============================================================
// Resolver — the UI calls this with the application row.
// ============================================================

/** Pick the label for a spec given vessel + locale. Yacht override is TR-only
 *  per the brief; EL has no yacht variant, so it falls back to the EL label. */
function labelFor(spec: VisaDocSpec, app: VisaApplicationForDocs, locale: VisaDocLocale): string {
  if (locale === 'tr') {
    return isYacht(app) && spec.yachtTr ? spec.yachtTr : spec.tr
  }
  return spec.el
}

/**
 * Walk the catalogue and resolve it against a concrete application:
 *   - label   — locale- and vessel-aware (yacht override for TR)
 *   - isRequired — constant rules as-is, predicate rules evaluated
 *
 * locale defaults to 'tr' (the form's primary language).
 */
export function resolveDocuments(
  app: VisaApplicationForDocs,
  locale: VisaDocLocale = 'tr',
): ResolvedVisaDoc[] {
  return VISA_DOCUMENTS.map((spec) => ({
    key: spec.key,
    label: labelFor(spec, app, locale),
    isRequired: typeof spec.required === 'function' ? spec.required(app) : spec.required,
  }))
}
