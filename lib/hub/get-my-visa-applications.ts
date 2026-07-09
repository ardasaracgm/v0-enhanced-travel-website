import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getDownloadUrl } from '@/lib/r2'

export interface HubVisaApplication {
  id: string
  createdAt: string
  firstName: string
  lastName: string
  state: string
  promoCode: string | null
  tripId: string | null
  // Planlanan seyahat penceresi (Postgres `date` → "YYYY-MM-DD").
  // NULL yalnızca 'draft' satırlarında olabilir (008 DROP NOT NULL); submit
  // yolundan geçen her başvuruda doludur.
  schengenEntryDate: string | null
  schengenExitDate: string | null
}

/**
 * 🔐 getMyVisaApplications — bir kullanıcının vize başvurularını döner.
 *
 * GÜVENLİK SÖZLEŞMESİ (İHLAL = IDOR): `email` YALNIZCA doğrulanmış oturumdan gelir
 * (server-side `getUser().user.email`). ASLA searchParams / form / başka client-
 * kontrollü kaynaktan geçirilmez. visa_applications'ta SELECT RLS yok (yalnız anon
 * INSERT) → service-role okur; bu email filtresi kullanıcılar arası TEK bariyerdir.
 *
 * association = email equality (user_id FK yok — visa_applications tasarımı).
 * Liste için yeterli alanlar; belge/ödeme/detay YOK (o Parça 2). Schengen
 * tarihleri Hub dashboard'unun tarih sıralaması için (A3).
 */
export async function getMyVisaApplications(email: string): Promise<HubVisaApplication[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return [] // boş email → ASLA geniş sorgu; boş dön

  const supabase = getSupabaseAdmin()
  const { data: apps, error } = await supabase
    .from('visa_applications')
    .select(
      'id, created_at, first_name, last_name, email, state, promo_code, trip_id, schengen_entry_date, schengen_exit_date',
    )
    .ilike('email', normalized) // case-insensitive (auth email lowercase, stored as-entered)
    .order('created_at', { ascending: false })
  if (error || !apps) return []

  // ilike `_`/`%`'i joker sayar → tam (case-insensitive) eşitlikle JS'te yeniden süz:
  // crafted email'in filtreyi genişletmesini engelle (filtre tek güvenlik bariyeri).
  return apps
    .filter((a) => (a.email ?? '').toLowerCase() === normalized)
    .map((a) => ({
      id: a.id,
      createdAt: a.created_at,
      firstName: a.first_name,
      lastName: a.last_name,
      state: a.state,
      promoCode: a.promo_code,
      tripId: a.trip_id,
      schengenEntryDate: a.schengen_entry_date ?? null,
      schengenExitDate: a.schengen_exit_date ?? null,
    }))
}

export interface HubVisaDocument {
  docType: string
  filename: string
  openUrl: string
  downloadUrl: string
}

export interface HubVisaApplicationFull {
  id: string
  state: string
  createdAt: string
  promoCode: string | null
  // Travel
  entryPoint: string
  vesselType: string
  travelPurpose: string
  stayDuration: number
  schengenLast3Years: boolean
  fingerprintsTaken: boolean
  schengenEntryDate: string
  schengenExitDate: string
  // Personal
  firstName: string
  lastName: string
  fatherName: string
  motherName: string
  birthDate: string
  birthPlace: string
  birthCountry: string
  gender: string
  maritalStatus: string
  occupation: string
  // Document
  idNumber: string
  docType: string
  docNumber: string
  docIssueDate: string
  docExpiryDate: string
  issuingAuthority: string
  // Contact
  residenceAddress: string
  phone: string
  livesInOtherCountry: boolean
}

export interface HubVisaApplicationDetail {
  application: HubVisaApplicationFull
  documents: HubVisaDocument[]
  payment: { tripState: string } | null
}

/**
 * 🔐 getMyVisaApplicationById — TEK başvuru + belgeleri + ödeme durumu.
 *
 * SAHİPLİK KAPISI (IDOR'un tek bariyeri): başvuru yoksa VEYA `email` (oturumdan)
 * başvurunun email'iyle (lowercase) tam eşleşmiyorsa → null. id URL'den gelir
 * ama bu kapı onu oturum email'ine bağlar; null → sayfa notFound (varlık sızdırma yok).
 *
 * 🔐 PRESIGNED URL üretimi yalnızca kapı GEÇTİKTEN sonra — başkasının id'siyle
 * belge URL'i alınamaz. Email UI'a dönmez (filtre için kullanılır, gösterilmez).
 * docx HARİÇ (admin-only). trips'ten YALNIZ state (hassas trip verisi sızdırma yok).
 */
export async function getMyVisaApplicationById(
  id: string,
  email: string,
): Promise<HubVisaApplicationDetail | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const supabase = getSupabaseAdmin()
  const { data: app } = await supabase
    .from('visa_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  // 🔐 SAHİPLİK KAPISI — bundan önce HİÇBİR belge/URL üretilmez.
  if (!app || (app.email ?? '').toLowerCase() !== normalized) return null

  // Belgeler — yalnızca canlı (status='uploaded') satırlar; kapı geçildi.
  const { data: docs } = await supabase
    .from('visa_documents')
    .select('doc_type, original_filename, r2_key')
    .eq('application_id', id)
    .eq('status', 'uploaded')
    .order('doc_type')

  const documents: HubVisaDocument[] = await Promise.all(
    (docs ?? []).map(async (d) => ({
      docType: d.doc_type as string,
      filename: d.original_filename as string,
      openUrl: await getDownloadUrl(d.r2_key as string),
      downloadUrl: await getDownloadUrl(d.r2_key as string, d.original_filename as string),
    })),
  )

  // Ödeme durumu — yalnız trip state (trip_id DB'den gelir, kullanıcıdan değil).
  let payment: { tripState: string } | null = null
  if (app.trip_id) {
    const { data: trip } = await supabase
      .from('trips')
      .select('state')
      .eq('id', app.trip_id)
      .maybeSingle()
    if (trip) payment = { tripState: trip.state as string }
  }

  // Yalnız kullanıcıya uygun alanlar — admin-meta (idempotency_key/source/
  // metadata/locale/updated_at) yapısal olarak dışarıda; email UI'a dönmez.
  const application: HubVisaApplicationFull = {
    id: app.id,
    state: app.state,
    createdAt: app.created_at,
    promoCode: app.promo_code,
    entryPoint: app.entry_point,
    vesselType: app.vessel_type,
    travelPurpose: app.travel_purpose,
    stayDuration: app.stay_duration,
    schengenLast3Years: app.schengen_last_3_years,
    fingerprintsTaken: app.fingerprints_taken,
    schengenEntryDate: app.schengen_entry_date,
    schengenExitDate: app.schengen_exit_date,
    firstName: app.first_name,
    lastName: app.last_name,
    fatherName: app.father_name,
    motherName: app.mother_name,
    birthDate: app.birth_date,
    birthPlace: app.birth_place,
    birthCountry: app.birth_country,
    gender: app.gender,
    maritalStatus: app.marital_status,
    occupation: app.occupation,
    idNumber: app.id_number,
    docType: app.doc_type,
    docNumber: app.doc_number,
    docIssueDate: app.doc_issue_date,
    docExpiryDate: app.doc_expiry_date,
    issuingAuthority: app.issuing_authority,
    residenceAddress: app.residence_address,
    phone: app.phone,
    livesInOtherCountry: app.lives_in_other_country,
  }

  return { application, documents, payment }
}
