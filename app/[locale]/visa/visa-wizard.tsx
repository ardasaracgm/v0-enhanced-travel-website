'use client'

/**
 * Schengen door-visa application wizard (Vize-1, Phase 1).
 *
 * 5-step next/back form. Each step validates with the matching per-step
 * Zod schema (VISA_STEP_SCHEMAS); the final submit re-parses the whole
 * thing client-side and the server action re-parses again (authoritative).
 * Error messages are i18n key fragments resolved under visaPage.form.errors.
 *
 * Phase 1: NO file upload, NO signature, NO payment, NO notifications.
 */

import * as React from 'react'
import { CheckCircle, ChevronLeft, ChevronRight, Circle, FileText, Loader2, MessageCircle, Phone } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ageOn, parseISODate, todayAthensISO } from '@/lib/validation/dates'
import {
  resolveDocuments,
  type ResolvedVisaDoc,
  type VisaDocLocale,
} from '@/lib/visa-documents'
import {
  DocumentUploadSlot,
  type DocumentUploadSlotStatus,
} from '@/app/[locale]/visa/document-upload-slot'
import { SignaturePad } from '@/components/visa/signature-pad'
import { DateRangeField } from '@/components/ferry/date-range-field'
import { ensureDraft, getDraftId, clearDraft } from '@/lib/visa/use-draft-application'
import {
  VISA_STEP_SCHEMAS,
  visaApplicationSchema,
  ENTRY_POINTS,
  VESSEL_TYPES,
  GENDERS,
  MARITAL_STATUSES,
  DOC_TYPES,
  TRAVEL_PURPOSES,
  FUNDING_SOURCES,
  OCCUPATIONS,
  EMPLOYER_HIDDEN_OCCUPATIONS,
  FINANCING_MEANS,
} from '@/lib/validation/visa'
import { submitVisaApplication } from '@/lib/actions/submit-visa-application'
import { checkPromoCode } from '@/lib/actions/check-promo-code-action'
import { buildSupportWhatsAppLink, getSalesPhoneLink, type Locale } from '@/lib/notifications/whatsapp-link'

// ============================================================
// Form state — every field is a string in state (select/date/text).
// Yes/No selects hold '' | 'true' | 'false'; converted to boolean on submit.
// ============================================================
type FieldName =
  | 'entryPoint' | 'vesselType'
  | 'lastName' | 'previousLastName' | 'firstName' | 'fatherName' | 'motherName' | 'birthDate'
  | 'birthPlace' | 'birthCountry' | 'nationality' | 'previousNationality' | 'gender' | 'maritalStatus'
  | 'idNumber' | 'docType' | 'docNumber' | 'docIssueDate' | 'docExpiryDate' | 'issuingAuthority'
  | 'residenceAddress' | 'email' | 'phone' | 'livesInOtherCountry' | 'occupation'
  | 'travelPurpose' | 'fundingSource' | 'schengenLast3Years' | 'fingerprintsTaken'
  | 'schengenEntryDate' | 'schengenExitDate'
  // Jotform 10 — legal guardian (minors)
  | 'guardianName' | 'guardianAddress' | 'guardianCity' | 'guardianProvince'
  | 'guardianPostalCode' | 'guardianNationality'
  // Jotform 18 — residence permit (lives abroad)
  | 'residencePermitNumber' | 'residencePermitExpiry'
  // Jotform 20 — employer / school
  | 'employerName' | 'employerAddress' | 'employerCity' | 'employerProvince'
  | 'employerPostalCode' | 'employerEmail' | 'employerPhone'
  // Jotform 31–32B — sponsor / invitation
  | 'inviterOrHotelName' | 'accommodationAddress' | 'accommodationEmail' | 'accommodationPhone'
  | 'inviterCompanyName' | 'inviterCompanyAddress' | 'companyPhone' | 'companyFax'
  | 'contactName' | 'contactAddress' | 'contactPhone' | 'contactFax' | 'contactEmail'

type FormState = Record<FieldName, string>

// Validation surfaces issues for non-text fields too (e.g. the financingMeans
// checkbox group) — those ride alongside the text FieldNames in error maps.
type ErrorKey = FieldName | 'financingMeans'

/** Hero mini-form → wizard köprüsü için lifted prefill (yalnız 5 alan, hepsi opsiyonel). */
export type WizardPrefill = {
  firstName?: string
  lastName?: string
  entryPoint?: string
  vesselType?: string
  birthDate?: string
}

const EMPTY_FORM: FormState = {
  entryPoint: '', vesselType: '',
  lastName: '', previousLastName: '', firstName: '', fatherName: '', motherName: '', birthDate: '',
  birthPlace: '', birthCountry: '', nationality: '', previousNationality: '', gender: '', maritalStatus: '',
  idNumber: '', docType: '', docNumber: '', docIssueDate: '', docExpiryDate: '', issuingAuthority: '',
  residenceAddress: '', email: '', phone: '', livesInOtherCountry: '', occupation: '',
  travelPurpose: '', fundingSource: '', schengenLast3Years: '', fingerprintsTaken: '',
  schengenEntryDate: '', schengenExitDate: '',
  guardianName: '', guardianAddress: '', guardianCity: '', guardianProvince: '',
  guardianPostalCode: '', guardianNationality: '',
  residencePermitNumber: '', residencePermitExpiry: '',
  employerName: '', employerAddress: '', employerCity: '', employerProvince: '',
  employerPostalCode: '', employerEmail: '', employerPhone: '',
  inviterOrHotelName: '', accommodationAddress: '', accommodationEmail: '', accommodationPhone: '',
  inviterCompanyName: '', inviterCompanyAddress: '', companyPhone: '', companyFax: '',
  contactName: '', contactAddress: '', contactPhone: '', contactFax: '', contactEmail: '',
}

// Which fields live on which step — used to jump back to the earliest step
// that has an error after the full-form submit parse.
const STEP_FIELDS: ErrorKey[][] = [
  // Step 1 — Travel + Personal (merged) + guardian (minors)
  ['entryPoint', 'vesselType', 'lastName', 'previousLastName', 'firstName', 'fatherName', 'motherName', 'birthDate', 'birthPlace', 'birthCountry', 'nationality', 'previousNationality', 'gender', 'maritalStatus', 'guardianName', 'guardianAddress', 'guardianCity', 'guardianProvince', 'guardianPostalCode', 'guardianNationality'],
  // Step 2 — Travel Document
  ['idNumber', 'docType', 'docNumber', 'docIssueDate', 'docExpiryDate', 'issuingAuthority'],
  // Step 3 — Contact & Occupation + residence permit + employer/school
  ['residenceAddress', 'email', 'phone', 'livesInOtherCountry', 'occupation', 'residencePermitNumber', 'residencePermitExpiry', 'employerName', 'employerAddress', 'employerCity', 'employerProvince', 'employerPostalCode', 'employerEmail', 'employerPhone'],
  // Step 4 — Trip Details + sponsor/invitation + financing means
  ['travelPurpose', 'fundingSource', 'schengenLast3Years', 'fingerprintsTaken', 'schengenEntryDate', 'schengenExitDate', 'inviterOrHotelName', 'accommodationAddress', 'accommodationEmail', 'accommodationPhone', 'inviterCompanyName', 'inviterCompanyAddress', 'companyPhone', 'companyFax', 'contactName', 'contactAddress', 'contactPhone', 'contactFax', 'contactEmail', 'financingMeans'],
]
const TOTAL_STEPS = STEP_FIELDS.length

// Hangi belge hangi adımda render ediliyor — renderDocSlot (:729/764/895…) +
// SignaturePad (:935, isLastStep=3) yerleşimlerinden DOĞRULANDI. step2'de belge
// yok. Sidebar adım-tamamlanma + (ileride) scroll-to-step bunu kullanacak.
const DOC_STEP_MAP: Record<string, number> = {
  biometric_photo: 0, consent_form: 0,
  id_card_front: 1, id_card_back: 1, passport_main: 1,
  bank_statement_first: 3, bank_statement_last: 3,
  sponsor_id: 3, sponsor_bank: 3, ticket: 3, insurance: 3, hotel: 3,
  credit_card_front: 3, credit_card_back: 3, previous_schengen_visa: 3,
  applicant_signature: 3,
}

const YES_NO = ['true', 'false'] as const

/** '' → undefined (triggers required), else 'true' → true / 'false' → false. */
function toBool(v: string): boolean | undefined {
  return v === '' ? undefined : v === 'true'
}

export function VisaWizard({ prefill }: { prefill?: WizardPrefill | null }) {
  const t = useTranslations('visaPage.form')
  const locale = useLocale()
  const today = todayAthensISO()

  const [step, setStep] = React.useState(0)
  // nationality is pre-filled with the locale's word for Turkey (editable, still
  // required) — the overwhelming majority of applicants are Turkish citizens.
  const [form, setForm] = React.useState<FormState>(() => ({
    ...EMPTY_FORM,
    nationality: t('defaults.nationality'),
  }))
  // Hero mini-form köprüsü (state-lift). Wizard, hero ile AYNI sayfada eşzamanlı
  // mount olur; initializer Başlat'tan ÖNCE koştuğu için prefill'i initializer'da
  // yakalayamayız. prefill prop Başlat'a basınca değişir → burada merge ederiz.
  // Boş alanlar mevcut değeri (nationality default dahil) ezmez.
  React.useEffect(() => {
    if (!prefill) return
    setForm((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(prefill)) {
        if (v) (next as Record<string, string>)[k] = v
      }
      return next
    })
  }, [prefill])
  const [errors, setErrors] = React.useState<Partial<Record<ErrorKey, string>>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)
  const [done, setDone] = React.useState(false)
  // Viva yoksa (fallback) success kartında gösterilecek WhatsApp ödeme linki.
  const [paymentLink, setPaymentLink] = React.useState<string | null>(null)
  // Son adım gate'i (amber banner + inline kırmızılar) yalnız submit denendikten
  // sonra görünsün — kullanıcı 4. adıma varır varmaz "eksik" basmasın.
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [promoCode, setPromoCode] = React.useState('')          // gate-DIŞI kupon kodu
  const [invalidPromo, setInvalidPromo] = React.useState(false) // geçersiz kod uyarısı
  const [freeApplication, setFreeApplication] = React.useState(false) // ücretsiz (kuponlu) success
  const [docMissing, setDocMissing] = React.useState(false)        // step 0 belge eksik uyarısı
  const [checkingPromo, setCheckingPromo] = React.useState(false)  // promo await kilidi (çift-tık)

  // ----- Inline document slots (Vize redesign, Faz 1) -----
  // Documents attach to a lazily-created draft: the first upload calls ensureDraft.
  const ensureApplicationId = React.useCallback(() => ensureDraft(locale), [locale])

  // The condition engine reads the snake_case DB row shape; map the live (not yet
  // persisted) form values onto it so required/conditional docs react as the user
  // edits age, vessel and funding source.
  const docLocale: VisaDocLocale = locale === 'tr' ? 'tr' : 'el'
  const resolvedDocs = React.useMemo(
    () =>
      resolveDocuments(
        {
          birth_date: form.birthDate || null,
          vessel_type: form.vesselType || null,
          metadata: { funding_source: form.fundingSource || null },
        },
        docLocale,
      ),
    [form.birthDate, form.vesselType, form.fundingSource, docLocale],
  )
  const docByKey = React.useMemo(() => {
    const map: Record<string, ResolvedVisaDoc> = {}
    for (const d of resolvedDocs) map[d.key] = d
    return map
  }, [resolvedDocs])

  // Each slot reports its live status here (used to block submit DURING an
  // in-progress upload, not as the source of truth for "is this doc present").
  const [docStatuses, setDocStatuses] = React.useState<Record<string, DocumentUploadSlotStatus>>({})
  const handleDocStatus = React.useCallback((key: string, status: DocumentUploadSlotStatus) => {
    setDocStatuses((prev) => (prev[key] === status ? prev : { ...prev, [key]: status }))
  }, [])

  // Authoritative "this doc has a confirmed file" map (key → filename). Survives
  // slot unmount/remount, so a slot reopened after a sponsor→self→sponsor toggle
  // (or a resumed session) shows "uploaded" instead of asking for the file again.
  // Seeded from the DB once a draft exists, then kept fresh by each upload.
  const [uploadedDocs, setUploadedDocs] = React.useState<Record<string, string>>({})
  const handleDocUploaded = React.useCallback((key: string, filename: string) => {
    setUploadedDocs((prev) => ({ ...prev, [key]: filename }))
    if (['biometric_photo', 'consent_form', 'id_card_front', 'id_card_back', 'passport_main'].includes(key))
      setDocMissing(false)
  }, [])

  // Optional, free-form date tied to the previous_schengen_visa slot (step 5):
  // the validity date of the applicant's previous Schengen visa. Stored in
  // metadata.previous_schengen_visa_date on submit — NOT a Zod field, never
  // blocks the submit gate. Distinct from schengen_entry/exit (the TRAVEL dates).
  const [previousSchengenVisaDate, setPreviousSchengenVisaDate] = React.useState('')

  // Jotform 33A · means of subsistence — multi-select (always required, min 1).
  // Not a string FieldName (it's an array), so it lives in its own state and is
  // threaded into buildPayload explicitly.
  const [financingMeans, setFinancingMeans] = React.useState<string[]>([])
  const toggleFinancingMeans = (value: string) => {
    setFinancingMeans((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
    setErrors((e) => {
      if (!e.financingMeans) return e
      const { financingMeans: _omit, ...rest } = e
      return rest
    })
  }

  // uploadedDocs'u DB'den (otoritatif) seed/refresh et. Mount'ta VE son adıma
  // girişte çağrılır: onUploaded sinyali kaybolan (slot mid-flight unmount) bir
  // yükleme, gate çalışmadan ÖNCE kalıcı satırdan kurtarılır.
  const refreshUploadedDocs = React.useCallback(async () => {
    const id = getDraftId()
    if (!id) return
    try {
      const res = await fetch(`/api/visa/documents/list?application_id=${encodeURIComponent(id)}`)
      if (!res.ok) return
      const data = (await res.json()) as { documents: { doc_type: string; original_filename: string }[] }
      const fromDb: Record<string, string> = {}
      for (const d of data.documents) fromDb[d.doc_type] = d.original_filename
      // Local (taze) kazanır; DB boşlukları doldurur (kayıp onUploaded dahil).
      setUploadedDocs((prev) => ({ ...fromDb, ...prev }))
      // DB'de teyitli bir belgenin takılı 'uploading'ini temizle — yoksa dosya
      // confirmed olsa bile isDocSatisfied false kalır.
      setDocStatuses((prev) => {
        let changed = false
        const next = { ...prev }
        for (const key of Object.keys(fromDb)) {
          if (next[key] === undefined || next[key] === 'uploading') {
            next[key] = 'uploaded'
            changed = true
          }
        }
        return changed ? next : prev
      })
    } catch {
      /* non-fatal */
    }
  }, [])

  // Mount (resumed session / önceki upload'lar).
  React.useEffect(() => {
    refreshUploadedDocs()
  }, [refreshUploadedDocs])

  // Son adıma GİRİŞTE — submit gate allRequiredDocsUploaded'ı okumadan ÖNCE
  // kayıp sinyali kurtar (state bu tick güncellenir, kullanıcı submit'e basmadan
  // görür). handleSubmit içinde await EDİLMEZ (aynı-tick state bayatlaması).
  React.useEffect(() => {
    if (step === TOTAL_STEPS - 1) refreshUploadedDocs()
  }, [step, refreshUploadedDocs])

  // Conditional slot visibility — drives whether the slot is rendered at all (the
  // catalogue's predicate only toggles isRequired). Mirrors lib/visa-documents.
  const applicantAge = form.birthDate ? ageOn(form.birthDate, today) : NaN
  const applicantIsMinor = Number.isFinite(applicantAge) && applicantAge < 18
  const isSponsor = form.fundingSource === 'sponsor'
  const livesAbroad = form.livesInOtherCountry === 'true'
  // Employer/school block (jotform 20): hidden entirely for occupations with no
  // employer/school; shown but fully optional otherwise. Students get
  // school/faculty-oriented labels (jotform 20 wording).
  const employerHidden = EMPLOYER_HIDDEN_OCCUPATIONS.has(form.occupation)
  const isStudent = form.occupation === 'student'

  // Render one inline slot by catalogue key (null if the doc isn't in scope).
  const renderDocSlot = (key: string) => {
    const doc = docByKey[key]
    if (!doc) return null
    return (
      <div id={`doc-${key}`} key={key}>
        <DocumentUploadSlot
          doc={doc}
          ensureApplicationId={ensureApplicationId}
          initialFilename={uploadedDocs[key]}
          onStatusChange={(status) => handleDocStatus(key, status)}
          onUploaded={(filename) => handleDocUploaded(key, filename)}
        />
      </div>
    )
  }

  // ----- Final-step document gate (UX only; the submit route re-checks against
  //       resolveDocuments + the DB authoritatively). A required doc is satisfied
  //       when a confirmed file exists AND no upload is mid-flight for it. -----
  const isDocSatisfied = (key: string) =>
    Boolean(uploadedDocs[key]) && docStatuses[key] !== 'uploading'
  const requiredDocs = resolvedDocs.filter((d) => d.isRequired)
  const missingRequiredDocs = requiredDocs.filter((d) => !isDocSatisfied(d.key))
  const allRequiredDocsUploaded = missingRequiredDocs.length === 0

  // "Next"i, herhangi bir slot yüklerken blokla → slot, onUploaded fire etmeden
  // step değişiminde unmount olamaz (kayıp-sinyal bug'ı). Global yeterli: mounted
  // bir slot 'uploading' raporlar; biri havadayken asla ilerlemeyiz.
  const isUploading = Object.values(docStatuses).some((s) => s === 'uploading')

  const update = (name: FieldName, value: string) => {
    setForm((f) => ({ ...f, [name]: value }))
    // Clear the field's error as the user edits it.
    setErrors((e) => {
      if (!e[name]) return e
      const { [name]: _omit, ...rest } = e
      return rest
    })
  }

  // Entry/exit are picked together from the range calendar; each maps straight
  // to its own field. The 6-night cap is enforced by refineSchengenDates on
  // submit (schengenExitDate.maxStay) — no client-side auto-fill needed.
  const handleEntryDateChange = (value: string) => update('schengenEntryDate', value)
  const handleExitDateChange = (value: string) => update('schengenExitDate', value)

  // Build the payload Zod expects: Yes/No selects → booleans, enums/dates as-is.
  // stayDuration is no longer a form field (derived server-side from the dates).
  const buildPayload = () => ({
    locale,
    ...form,
    livesInOtherCountry: toBool(form.livesInOtherCountry),
    schengenLast3Years: toBool(form.schengenLast3Years),
    fingerprintsTaken: toBool(form.fingerprintsTaken),
    financingMeans,
  })

  // ----- Final-step FORM gate (UX). The full schema is the same one the server
  //       action re-checks authoritatively; here it just drives the submit button
  //       + the missing-items summary so the user isn't offered an inert submit. -----
  const fullParse = React.useMemo(
    () => visaApplicationSchema.safeParse(buildPayload()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, locale, financingMeans],
  )
  const missingFormFields = React.useMemo<ErrorKey[]>(() => {
    if (fullParse.success) return []
    const seen = new Set<string>()
    const out: ErrorKey[] = []
    for (const issue of fullParse.error.issues) {
      const f = String(issue.path[0]) as ErrorKey
      if (f && !seen.has(f)) { seen.add(f); out.push(f) }
    }
    return out
  }, [fullParse])

  // ----- Sidebar türevleri (Parça A — yalnız hesaplama; tüketim Parça B'de) -----
  // Her adımın FORM alanları geçerli mi (belge hariç). fullParse deseninin 4'e
  // çoğaltımı; deps aynı.
  const stepDone = React.useMemo(
    () => VISA_STEP_SCHEMAS.map((s) => s.safeParse(buildPayload()).success),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, locale, financingMeans],
  )
  // Her adımın O ADIMDA render edilen ZORUNLU belgeleri yüklü mü. resolvedDocs
  // reaktif; DOC_STEP_MAP ile adıma ayır, isDocSatisfied ile kontrol.
  const stepDocsDone = React.useMemo(
    () =>
      VISA_STEP_SCHEMAS.map((_s, i) =>
        resolvedDocs
          .filter((d) => d.isRequired && DOC_STEP_MAP[d.key] === i)
          .every((d) => isDocSatisfied(d.key)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedDocs, uploadedDocs, docStatuses],
  )
  // Sidebar yeşil-tık: form-OK VE belge-OK.
  const stepComplete = React.useMemo(
    () => stepDone.map((ok, i) => ok && stepDocsDone[i]),
    [stepDone, stepDocsDone],
  )

  // Map a Zod result's issues → { field: localized message }. First issue per
  // field wins; issue.message is a fragment like 'gender.required'.
  const collectErrors = (issues: { path: (string | number)[]; message: string }[]) => {
    const next: Partial<Record<ErrorKey, string>> = {}
    for (const issue of issues) {
      const field = String(issue.path[0]) as ErrorKey
      if (field && !next[field]) next[field] = t(`errors.${issue.message}`)
    }
    return next
  }

  const scrollToTop = () => {
    document.getElementById('visa-application-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNext = async () => {
    const payload = buildPayload()
    const lastStep = step === TOTAL_STEPS - 1
    // Son adımda her tık = bir submit denemesi → gate'i görünür kıl.
    if (lastStep) setSubmitAttempted(true)

    const result = VISA_STEP_SCHEMAS[step].safeParse(payload)
    if (!result.success) {
      setErrors(collectErrors(result.error.issues))
      return
    }
    setErrors({})
    if (!lastStep) {
      // Step 0 kapıları: zorunlu belge + (varsa) promo kodu erken kontrol.
      if (step === 0) {
        const docsOk =
          isDocSatisfied('biometric_photo') &&
          (!applicantIsMinor || isDocSatisfied('consent_form'))
        if (!docsOk) {
          setDocMissing(true)
          scrollToTop()
          return
        }
        if (promoCode.trim()) {
          setCheckingPromo(true)
          const { valid } = await checkPromoCode(promoCode.trim())
          setCheckingPromo(false)
          if (!valid) {
            setInvalidPromo(true)
            return
          }
        }
      }
      if (step === 1) {
        const docsOk =
          isDocSatisfied('id_card_front') &&
          isDocSatisfied('id_card_back') &&
          isDocSatisfied('passport_main')
        if (!docsOk) {
          setDocMissing(true)
          scrollToTop()
          return
        }
      }
      setSubmitAttempted(false) // ileri giderken sonraki adım sessiz başlasın
      setStep(step + 1)
      scrollToTop()
      return
    }
    // Son adım: tüm-form + zorunlu-belge gate'i. Hepsi geçerliyse submit.
    if (!fullParse.success || !allRequiredDocsUploaded) {
      if (!fullParse.success) setErrors(collectErrors(fullParse.error.issues)) // inline kırmızılar
      scrollToTop()
      return // submit ETME
    }
    await handleSubmit(payload)
  }

  const handleBack = () => {
    setErrors({})
    setSubmitAttempted(false) // geri gidip dönünce banner tekrar sessiz başlasın
    setStep((s) => Math.max(0, s - 1))
    scrollToTop()
  }

  // Sidebar'dan adıma atlama — serbest gezinme (validation yok, handleBack gibi sessiz).
  const goToStep = (i: number) => {
    setErrors({})
    setSubmitAttempted(false)
    setStep(i)
  }
  const jumpToStep = (i: number) => {
    goToStep(i)
    scrollToTop()
  }
  // Sidebar belge satırından o belgenin slot'una atlama. Belge başka adımdaysa
  // önce o adıma geç; slot DOM'a O commit'te gelir → scroll'u useEffect[step]'e
  // ERTELE (setStep sonrası, timing-safe — setTimeout/raf yarışı yok). Aynı
  // adımdaysa slot zaten DOM'da → anında scroll.
  const pendingDocScroll = React.useRef<string | null>(null)
  const scrollToDoc = (key: string) => {
    document.getElementById(`doc-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const jumpToDoc = (key: string) => {
    const target = DOC_STEP_MAP[key]
    if (target === undefined) return
    if (target === step) { scrollToDoc(key); return }
    pendingDocScroll.current = key
    goToStep(target)
  }
  React.useEffect(() => {
    if (pendingDocScroll.current) {
      scrollToDoc(pendingDocScroll.current)
      pendingDocScroll.current = null
    }
  }, [step])

  const handleSubmit = async (payload: ReturnType<typeof buildPayload>) => {
    // Full re-parse client-side (cross-field refines). Should pass since every
    // step already validated, but jump back if something slipped through.
    const full = visaApplicationSchema.safeParse(payload)
    if (!full.success) {
      const collected = collectErrors(full.error.issues)
      setErrors(collected)
      const earliest = STEP_FIELDS.findIndex((fields) => fields.some((f) => collected[f]))
      if (earliest >= 0) {
        setStep(earliest)
        scrollToTop()
      }
      return
    }

    setSubmitting(true)
    setSubmitError(false)
    try {
      // The draft normally already exists (created on the first document upload).
      // Edge case: the applicant reached the end without uploading anything, so no
      // draft was ever created — create it now, then immediately finalise it.
      const draftId = getDraftId() ?? (await ensureDraft(locale))

      // Optional previous-Schengen-visa date rides alongside (server writes it to
      // metadata). Only sent when the slot is actually in scope (answered "yes").
      const res = await submitVisaApplication({
        ...payload,
        application_id: draftId,
        promoCode: promoCode.trim() || undefined,
        previous_schengen_visa_date:
          form.schengenLast3Years === 'true' && previousSchengenVisaDate
            ? previousSchengenVisaDate
            : undefined,
      })
      if (res.ok) {
        clearDraft() // finalised — next application starts fresh
        if (res.redirectUrl) {
          // Viva Smart Checkout'a devret (checkout'taki dalın aynısı). Sayfa
          // unmount olacağı için spinner'ı temizlemiyoruz, çift-submit imkânsız.
          window.location.assign(res.redirectUrl)
          return
        }
        if (res.free) {
          // Kuponlu/ücretsiz: ödeme yok → free success kartı.
          setFreeApplication(true)
          setDone(true)
          scrollToTop()
          return
        }
        // Viva yok → WhatsApp ödeme fallback: success kartı + €90 ödeme linki.
        setPaymentLink(res.paymentWhatsAppUrl ?? null)
        setDone(true)
        scrollToTop()
      } else if (res.code === 'invalid_promo') {
        // Kod geçersiz → step 0'daki uyarıyı göster (draft 'draft', retry açık).
        setInvalidPromo(true)
        setStep(0)
        scrollToTop()
      } else {
        setSubmitError(true)
      }
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ----- Field renderers -----
  // Native type=date yıl alanı 6 haneye kadar kabul eder (maxLength geçmez).
  // Yıl >4 hane gelirse ilk 4'e kes — Zod zaten reddeder; bu UX guard'ı.
  const clampYear = (v: string): string => {
    const m = /^(\d+)-(\d{2})-(\d{2})$/.exec(v)
    return m && m[1].length > 4 ? `${m[1].slice(0, 4)}-${m[2]}-${m[3]}` : v
  }

  const textField = (
    name: FieldName,
    type: 'text' | 'email' | 'tel' = 'text',
    optional = false,
    labelKey: string = name,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-blue-950">
        {t(`labels.${labelKey}`)}
        {optional ? '' : <span className="text-red-500"> *</span>}
      </Label>
      <Input
        id={name}
        type={type}
        value={form[name]}
        onChange={(e) => update(name, e.target.value)}
        className={`h-9 rounded-xl ${errors[name] ? 'border-destructive' : ''}`}
      />
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  )

  const dateField = (
    name: FieldName,
    opts: { min?: string; max?: string; onChange?: (value: string) => void } = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-blue-950">
        {t(`labels.${name}`)} <span className="text-red-500">*</span>
      </Label>
      <Input
        id={name}
        type="date"
        min={opts.min}
        max={opts.max}
        value={form[name]}
        onChange={(e) => {
          const val = clampYear(e.target.value)
          if (opts.onChange) opts.onChange(val)
          else update(name, val)
        }}
        className={`h-9 rounded-xl ${errors[name] ? 'border-destructive' : ''}`}
      />
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  )

  const selectField = (
    name: FieldName,
    values: readonly string[],
    optionPrefix: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-blue-950">
        {t(`labels.${name}`)} <span className="text-red-500">*</span>
      </Label>
      <Select value={form[name]} onValueChange={(v) => update(name, v)}>
        <SelectTrigger id={name} className={`h-9 rounded-xl ${errors[name] ? 'border-destructive' : ''}`}>
          <SelectValue placeholder={t('selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {values.map((val) => (
            <SelectItem key={val} value={val}>
              {t(`options.${optionPrefix}.${val}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  )

  // ----- Success screen -----
  if (done) {
    const pending = Boolean(paymentLink) // ödeme bekleniyorsa ödeme-odaklı metin
    const title = freeApplication ? t('success.titleFree') : pending ? t('success.titlePending') : t('success.title')
    const body  = freeApplication ? t('success.bodyFree')  : pending ? t('success.bodyPayment') : t('success.body')
    return (
      <Card className="max-w-2xl mx-auto border-primary/30">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>
          <p className="text-muted-foreground mb-6">{body}</p>
          <div className="flex flex-col items-center gap-3">
            <a
              href={paymentLink ?? buildSupportWhatsAppLink({ locale: locale as Locale })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">{pending ? t('success.payButton') : t('success.whatsapp')}</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isLastStep = step === TOTAL_STEPS - 1

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_22rem]">
      <Card className="rounded-3xl border-0 bg-card shadow-xl">
      <CardHeader>
        {/* Başlık solda, nav sağ üstte. Mobilde çakışmayı önlemek için dikey
            yığılır (flex-col), sm+ yatay hizalanır (buton 40px, başlık ~48px →
            items-start). Buton MANTIĞI eski alt bloktan birebir taşındı. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-950">{t(`sections.step${step + 1}`)}</CardTitle>
              <p className="text-sm text-slate-500">
                {t('nav.step', { current: step + 1, total: TOTAL_STEPS })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0 || submitting}
              className={step === 0 ? 'invisible' : ''}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('nav.back')}
            </Button>
            <Button
              onClick={handleNext}
              disabled={submitting || isUploading || checkingPromo}
              className="bg-amber-400 text-blue-950 hover:bg-amber-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('submit.submitting')}
                </>
              ) : isLastStep ? (
                t('submit.cta')
              ) : (
                <>
                  {t('nav.next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {step === 0 && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('entryPoint', ENTRY_POINTS, 'entryPoint')}
              {selectField('vesselType', VESSEL_TYPES, 'vesselType')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('lastName')}
              {textField('previousLastName', 'text', true)}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('firstName')}
              {textField('fatherName')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('motherName')}
              {dateField('birthDate', { max: today })}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('birthPlace')}
              {textField('birthCountry')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('nationality')}
              {textField('previousNationality', 'text', true)}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('gender', GENDERS, 'gender')}
              {selectField('maritalStatus', MARITAL_STATUSES, 'maritalStatus')}
            </div>
            {/* Jotform 10 — legal guardian. Appears only for minors; all fields
                become required (refineGuardian). */}
            {applicantIsMinor && (
              <FieldGroup title={t('sections.guardian')}>
                {textField('guardianName')}
                {textField('guardianAddress')}
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('guardianCity')}
                  {textField('guardianProvince')}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('guardianPostalCode')}
                  {textField('guardianNationality')}
                </div>
              </FieldGroup>
            )}
            <div className="grid md:grid-cols-2 gap-3 items-start">
              <DocsSection title={t('docs.stepHeading')}>
                {renderDocSlot('biometric_photo')}
                {applicantIsMinor && renderDocSlot('consent_form')}
              </DocsSection>
              <div className="space-y-2">
                <Label htmlFor="promoCode">{t('labels.promoCode')}</Label>
                <Input
                  id="promoCode"
                  type="text"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value); setInvalidPromo(false) }}
                  className={invalidPromo ? 'border-destructive' : ''}
                />
                {invalidPromo && <p className="text-sm text-destructive">{t('promoInvalid')}</p>}
              </div>
            </div>
            {docMissing && <p className="text-sm text-destructive">{t('docMissing')}</p>}
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('idNumber')}
              {selectField('docType', DOC_TYPES, 'docType')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('docNumber')}
              {textField('issuingAuthority')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {dateField('docIssueDate', { max: today })}
              {dateField('docExpiryDate', { min: today })}
            </div>
            <DocsSection title={t('docs.stepHeading')}>
              <p className="text-xs text-muted-foreground">{t('docs.idCardNote')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderDocSlot('id_card_front')}
                {renderDocSlot('id_card_back')}
                {renderDocSlot('passport_main')}
              </div>
            </DocsSection>
            {docMissing && <p className="text-sm text-destructive">{t('docMissing')}</p>}
          </>
        )}

        {step === 2 && (
          <>
            {textField('residenceAddress')}
            <div className="grid md:grid-cols-2 gap-4">
              {textField('email', 'email')}
              {textField('phone', 'tel')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('livesInOtherCountry', YES_NO, 'yesNo')}
              {selectField('occupation', OCCUPATIONS, 'occupation')}
            </div>
            {/* Jotform 18 — residence permit. Appears only when the applicant
                lives abroad; both fields required (refineResidencePermit). */}
            {livesAbroad && (
              <FieldGroup title={t('sections.residencePermit')}>
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('residencePermitNumber')}
                  {dateField('residencePermitExpiry', { min: '1900-01-01', max: '2100-12-31' })}
                </div>
              </FieldGroup>
            )}
            {/* Jotform 20 — employer / school. Hidden entirely for the exempt
                occupations; shown but fully OPTIONAL otherwise. Students see
                school/faculty labels, everyone else employer labels. */}
            {!employerHidden && (
              <FieldGroup title={isStudent ? t('sections.school') : t('sections.employer')}>
                <p className="text-xs text-muted-foreground">{t('docs.employerOptionalNote')}</p>
                {textField('employerName', 'text', true, isStudent ? 'schoolName' : 'employerName')}
                {textField('employerAddress', 'text', true, isStudent ? 'schoolAddress' : 'employerAddress')}
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('employerCity', 'text', true, isStudent ? 'schoolCity' : 'employerCity')}
                  {textField('employerProvince', 'text', true, isStudent ? 'schoolProvince' : 'employerProvince')}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('employerPostalCode', 'text', true, isStudent ? 'schoolPostalCode' : 'employerPostalCode')}
                  {textField('employerPhone', 'tel', true, isStudent ? 'schoolPhone' : 'employerPhone')}
                </div>
                {textField('employerEmail', 'email', true, isStudent ? 'schoolEmail' : 'employerEmail')}
              </FieldGroup>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('travelPurpose', TRAVEL_PURPOSES, 'travelPurpose')}
              {selectField('fundingSource', FUNDING_SOURCES, 'fundingSource')}
            </div>
            {/* Jotform 31–32B — sponsor / invitation. Shown only when a sponsor
                covers the trip; only the inviter/hotel name is required. */}
            {isSponsor && (
              <FieldGroup title={t('sections.sponsor')}>
                {textField('inviterOrHotelName')}
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('accommodationAddress', 'text', true)}
                  {textField('accommodationPhone', 'tel', true)}
                </div>
                {textField('accommodationEmail', 'email', true)}
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('inviterCompanyName', 'text', true)}
                  {textField('inviterCompanyAddress', 'text', true)}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('companyPhone', 'tel', true)}
                  {textField('companyFax', 'tel', true)}
                </div>
                {textField('contactName', 'text', true)}
                {textField('contactAddress', 'text', true)}
                <div className="grid md:grid-cols-2 gap-4">
                  {textField('contactPhone', 'tel', true)}
                  {textField('contactFax', 'tel', true)}
                </div>
                {textField('contactEmail', 'email', true)}
              </FieldGroup>
            )}
            {/* Jotform 33A — means of subsistence. Always shown; at least one
                must be selected (refineFinancing). */}
            <FieldGroup title={t('sections.financingMeans')}>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {FINANCING_MEANS.map((val) => (
                  <label
                    key={val}
                    htmlFor={`fm-${val}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      id={`fm-${val}`}
                      checked={financingMeans.includes(val)}
                      onCheckedChange={() => toggleFinancingMeans(val)}
                    />
                    <span className="text-sm">{t(`options.financingMeans.${val}`)}</span>
                  </label>
                ))}
              </div>
              {errors.financingMeans && (
                <p className="text-sm text-destructive">{errors.financingMeans}</p>
              )}
            </FieldGroup>
            <div className="grid md:grid-cols-3 gap-4">
              {selectField('schengenLast3Years', YES_NO, 'yesNo')}
              {selectField('fingerprintsTaken', YES_NO, 'yesNo')}
              <div className="space-y-2">
                <Label className="text-blue-950">
                  {t('labels.plannedDates')} <span className="text-red-500">*</span>
                </Label>
                <DateRangeField
                  mode="range"
                  date={form.schengenEntryDate}
                  returnDate={form.schengenExitDate}
                  onDateChange={handleEntryDateChange}
                  onReturnDateChange={handleExitDateChange}
                  minDate={today}
                  locale={locale}
                  placeholder={t('selectPlaceholder')}
                  triggerClassName="h-9 rounded-xl"
                />
              </div>
            </div>
            {/* Destination + first-entry country are FIXED to Greece (door visa).
                Read-only, never user-editable, not submitted — shown only for
                transparency; the value is hardcoded in the future PDF printout. */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destinationCountry">{t('labels.destinationCountry')}</Label>
                <Input id="destinationCountry" value={t('fixedGreece')} disabled readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstEntryCountry">{t('labels.firstEntryCountry')}</Label>
                <Input id="firstEntryCountry" value={t('fixedGreece')} disabled readOnly />
              </div>
            </div>
            <DocsSection title={t('docs.stepHeading')}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {renderDocSlot('bank_statement_first')}
                {renderDocSlot('bank_statement_last')}
                {isSponsor && renderDocSlot('sponsor_id')}
                {isSponsor && renderDocSlot('sponsor_bank')}
                {renderDocSlot('ticket')}
                {renderDocSlot('insurance')}
                {renderDocSlot('hotel')}
                {renderDocSlot('credit_card_front')}
                {renderDocSlot('credit_card_back')}
              </div>
              {/* Only when the applicant answered "yes" to holding a Schengen visa
                  in the last 3 years. Optional slot; the validity-date picker below
                  appears only once the image is uploaded. */}
              {form.schengenLast3Years === 'true' && (
                <div className="space-y-3">
                  {renderDocSlot('previous_schengen_visa')}
                  {uploadedDocs['previous_schengen_visa'] && (
                    <div className="space-y-2">
                      <Label htmlFor="previousSchengenVisaDate">
                        {t('labels.previousSchengenVisaDate')}
                      </Label>
                      <Input
                        id="previousSchengenVisaDate"
                        type="date"
                        min="1900-01-01"
                        max={today}
                        value={previousSchengenVisaDate}
                        onChange={(e) => setPreviousSchengenVisaDate(clampYear(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('docs.previousSchengenVisaDateHint')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DocsSection>
          </>
        )}

        {isLastStep && (
          <div id="doc-applicant_signature" className="mt-6">
            <SignaturePad
              label={docByKey['applicant_signature']?.label ?? ''}
              isRequired={docByKey['applicant_signature']?.isRequired ?? true}
              ensureApplicationId={ensureApplicationId}
              initialSigned={Boolean(uploadedDocs['applicant_signature'])}
              onStatusChange={(status) => handleDocStatus('applicant_signature', status)}
              onUploaded={(filename) => handleDocUploaded('applicant_signature', filename)}
            />
          </div>
        )}

        {/* Final-step gate summary: missing form fields + missing docs, sticky to the
            viewport bottom so the user sees what's left without scrolling the long step. */}
        {isLastStep && submitAttempted && (missingFormFields.length > 0 || missingRequiredDocs.length > 0) && (
          <div className="sticky bottom-4 z-10 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm shadow-lg">
            <p className="font-medium text-amber-800">{t('docs.gateSummaryTitle')}</p>
            {missingFormFields.length > 0 && (
              <div className="mt-2">
                <p className="text-amber-700">{t('docs.missingFieldsLabel')}</p>
                <ul className="mt-1 list-disc pl-5 text-amber-700">
                  {missingFormFields.map((f) => (
                    <li key={f}>{t(`labels.${f}`)}</li>
                  ))}
                </ul>
              </div>
            )}
            {missingRequiredDocs.length > 0 && (
              <div className="mt-2">
                <p className="text-amber-700">{t('docs.missingDocsLabel')}</p>
                <ul className="mt-1 list-disc pl-5 text-amber-700">
                  {missingRequiredDocs.map((doc) => (
                    <li key={doc.key}>{doc.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {submitError && (
          <p className="text-sm text-destructive">{t('submit.error')}</p>
        )}

        {/* Nav butonları CardHeader'a taşındı (sağ üst). Durum satırları burada
            kalır — üstteki submitError + aşağıdaki isUploading (progress bar
            header'a girmesin diye header'a taşınmadı). */}
        {isUploading && (
          <p className="pt-2 text-right text-xs text-muted-foreground">{t('uploading')}</p>
        )}
      </CardContent>
      </Card>
      <VisaSidebar
        className="hidden lg:block"
        step={step}
        stepComplete={stepComplete}
        onJumpToStep={jumpToStep}
        resolvedDocs={resolvedDocs}
        isDocSatisfied={isDocSatisfied}
        onJumpToDoc={jumpToDoc}
      />
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

/** Labelled, set-off block for a group of conditional/related form fields
 *  (guardian, residence permit, employer, sponsor). */
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3 mt-2">
      <h3 className="text-sm font-semibold text-blue-950">{title}</h3>
      {children}
    </div>
  )
}

/** Wraps the inline document slots within a step under a labelled, set-off block. */
function DocsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3 mt-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-950/70">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

/** Sağ sidebar — adım-durum (canlı) + belge placeholder (Parça C) + destek.
 *  Salt-okunur: wizard türevlerini prop alır, upload akışına dokunmaz. */
function VisaSidebar({
  step,
  stepComplete,
  onJumpToStep,
  resolvedDocs,
  isDocSatisfied,
  onJumpToDoc,
  className,
}: {
  step: number
  stepComplete: boolean[]
  onJumpToStep: (i: number) => void
  resolvedDocs: ResolvedVisaDoc[]
  isDocSatisfied: (key: string) => boolean
  onJumpToDoc: (key: string) => void
  className?: string
}) {
  const t = useTranslations('visaPage.form')
  const locale = useLocale()
  const anyComplete = stepComplete.some(Boolean)
  const sales = getSalesPhoneLink()
  const requiredDocs = resolvedDocs.filter((d) => d.isRequired)
  const satisfiedCount = requiredDocs.filter((d) => isDocSatisfied(d.key)).length
  return (
    <aside className={`space-y-4 ${className ?? ''}`}>
      {/* Başvuru Özeti — canlı adım durumu */}
      <Card className="rounded-3xl border-0 bg-card shadow-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm text-blue-950">Başvuru Özeti</CardTitle>
              {!anyComplete && <p className="text-sm text-slate-500">Henüz bilgi girilmedi</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ol className="space-y-0.5">
            {stepComplete.map((done, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onJumpToStep(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition-colors ${
                    step === i ? 'bg-blue-50 font-medium text-blue-950' : 'text-slate-600 hover:bg-muted/50'
                  }`}
                >
                  {done ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <span>{t(`sections.step${i + 1}`)}</span>
                </button>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Gerekli Belgeler — PLACEHOLDER (canlı içerik Parça C) */}
      <Card className="rounded-3xl border-0 bg-card shadow-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-sm text-blue-950">Gerekli Belgeler</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {requiredDocs.length === 0 ? (
            <p className="text-sm text-slate-500">Şu an zorunlu belge yok.</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-medium text-slate-500">
                {satisfiedCount} / {requiredDocs.length} yüklendi
              </p>
              <ul className="space-y-0.5">
                {requiredDocs.map((d) => (
                  <li key={d.key}>
                    <button
                      type="button"
                      onClick={() => onJumpToDoc(d.key)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm text-slate-600 transition-colors hover:bg-muted/50"
                    >
                      {isDocSatisfied(d.key) ? (
                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <span>{d.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Destek — locale-aware WhatsApp (proje kanonu 5008/5009) */}
      <Card className="rounded-3xl border-0 bg-card shadow-md">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
              <MessageCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-950">Yardıma mı ihtiyacınız var?</p>
              <p className="text-sm text-slate-500">7/24 destek hattımızla bize ulaşın.</p>
            </div>
          </div>
          <a
            href={buildSupportWhatsAppLink({ locale: locale as Locale })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-amber-500"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <a
            href={sales.href}
            className="flex items-center justify-center gap-2 text-sm font-medium text-blue-950 hover:text-blue-700"
          >
            <Phone className="h-4 w-4" />
            {sales.display}
          </a>
        </CardContent>
      </Card>
    </aside>
  )
}
