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
import { CheckCircle, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/lib/validation/visa'
import { submitVisaApplication } from '@/lib/actions/submit-visa-application'
import { buildSupportWhatsAppLink, type Locale } from '@/lib/notifications/whatsapp-link'

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

type FormState = Record<FieldName, string>

const EMPTY_FORM: FormState = {
  entryPoint: '', vesselType: '',
  lastName: '', previousLastName: '', firstName: '', fatherName: '', motherName: '', birthDate: '',
  birthPlace: '', birthCountry: '', nationality: '', previousNationality: '', gender: '', maritalStatus: '',
  idNumber: '', docType: '', docNumber: '', docIssueDate: '', docExpiryDate: '', issuingAuthority: '',
  residenceAddress: '', email: '', phone: '', livesInOtherCountry: '', occupation: '',
  travelPurpose: '', fundingSource: '', schengenLast3Years: '', fingerprintsTaken: '',
  schengenEntryDate: '', schengenExitDate: '',
}

// Which fields live on which step — used to jump back to the earliest step
// that has an error after the full-form submit parse.
const STEP_FIELDS: FieldName[][] = [
  // Step 1 — Travel + Personal (merged)
  ['entryPoint', 'vesselType', 'lastName', 'previousLastName', 'firstName', 'fatherName', 'motherName', 'birthDate', 'birthPlace', 'birthCountry', 'nationality', 'previousNationality', 'gender', 'maritalStatus'],
  // Step 2 — Travel Document
  ['idNumber', 'docType', 'docNumber', 'docIssueDate', 'docExpiryDate', 'issuingAuthority'],
  // Step 3 — Contact & Occupation
  ['residenceAddress', 'email', 'phone', 'livesInOtherCountry', 'occupation'],
  // Step 4 — Trip Details
  ['travelPurpose', 'fundingSource', 'schengenLast3Years', 'fingerprintsTaken', 'schengenEntryDate', 'schengenExitDate'],
]
const TOTAL_STEPS = STEP_FIELDS.length

const YES_NO = ['true', 'false'] as const

/** Door-visa max stay: exit auto-fills to entry + this many nights. */
const MAX_STAY_NIGHTS = 7

/** '' → undefined (triggers required), else 'true' → true / 'false' → false. */
function toBool(v: string): boolean | undefined {
  return v === '' ? undefined : v === 'true'
}

/** Add n days to a YYYY-MM-DD date (UTC, DST-safe). '' if it won't parse. */
function addDaysISO(iso: string, n: number): string {
  const d = parseISODate(iso)
  if (!d) return ''
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function VisaWizard() {
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
  const [errors, setErrors] = React.useState<Partial<Record<FieldName, string>>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)
  const [done, setDone] = React.useState(false)

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
  }, [])

  // Optional, free-form date tied to the previous_schengen_visa slot (step 5):
  // the validity date of the applicant's previous Schengen visa. Stored in
  // metadata.previous_schengen_visa_date on submit — NOT a Zod field, never
  // blocks the submit gate. Distinct from schengen_entry/exit (the TRAVEL dates).
  const [previousSchengenVisaDate, setPreviousSchengenVisaDate] = React.useState('')

  // On mount, if a draft already exists (resumed session / prior uploads), load
  // its uploaded documents so slots reopen filled. Keys already known locally
  // (fresher) win over the DB snapshot.
  React.useEffect(() => {
    const id = getDraftId()
    if (!id) return
    let cancelled = false
    fetch(`/api/visa/documents/list?application_id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((data: { documents: { doc_type: string; original_filename: string }[] }) => {
        if (cancelled) return
        const fromDb: Record<string, string> = {}
        for (const d of data.documents) fromDb[d.doc_type] = d.original_filename
        setUploadedDocs((prev) => ({ ...fromDb, ...prev }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Conditional slot visibility — drives whether the slot is rendered at all (the
  // catalogue's predicate only toggles isRequired). Mirrors lib/visa-documents.
  const applicantAge = form.birthDate ? ageOn(form.birthDate, today) : NaN
  const applicantIsMinor = Number.isFinite(applicantAge) && applicantAge < 18
  const isSponsor = form.fundingSource === 'sponsor'

  // Render one inline slot by catalogue key (null if the doc isn't in scope).
  const renderDocSlot = (key: string) => {
    const doc = docByKey[key]
    if (!doc) return null
    return (
      <DocumentUploadSlot
        key={key}
        doc={doc}
        ensureApplicationId={ensureApplicationId}
        initialFilename={uploadedDocs[key]}
        onStatusChange={(status) => handleDocStatus(key, status)}
        onUploaded={(filename) => handleDocUploaded(key, filename)}
      />
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

  const update = (name: FieldName, value: string) => {
    setForm((f) => ({ ...f, [name]: value }))
    // Clear the field's error as the user edits it.
    setErrors((e) => {
      if (!e[name]) return e
      const { [name]: _omit, ...rest } = e
      return rest
    })
  }

  // Exit auto-tracks entry + 7 nights (door-visa max) until the user edits exit
  // themselves. We RE-SYNC on every entry change (not just when exit is empty):
  // a date input fires onChange per keystroke while the year is typed, so entry
  // transiently passes through values like "0202-01-01" before "2026-01-01".
  // A one-shot "fill only if empty" guard would lock exit onto that bad partial
  // year; re-syncing every change lets the final keystroke correct it.
  const exitManuallyEdited = React.useRef(false)
  const handleEntryDateChange = (value: string) => {
    update('schengenEntryDate', value)
    if (!exitManuallyEdited.current) {
      update('schengenExitDate', addDaysISO(value, MAX_STAY_NIGHTS))
    }
  }
  const handleExitDateChange = (value: string) => {
    exitManuallyEdited.current = true
    update('schengenExitDate', value)
  }

  // Build the payload Zod expects: Yes/No selects → booleans, enums/dates as-is.
  // stayDuration is no longer a form field (derived server-side from the dates).
  const buildPayload = () => ({
    locale,
    ...form,
    livesInOtherCountry: toBool(form.livesInOtherCountry),
    schengenLast3Years: toBool(form.schengenLast3Years),
    fingerprintsTaken: toBool(form.fingerprintsTaken),
  })

  // ----- Final-step FORM gate (UX). The full schema is the same one the server
  //       action re-checks authoritatively; here it just drives the submit button
  //       + the missing-items summary so the user isn't offered an inert submit. -----
  const fullParse = React.useMemo(
    () => visaApplicationSchema.safeParse(buildPayload()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, locale],
  )
  const formValid = fullParse.success
  const missingFormFields = React.useMemo<FieldName[]>(() => {
    if (fullParse.success) return []
    const seen = new Set<string>()
    const out: FieldName[] = []
    for (const issue of fullParse.error.issues) {
      const f = String(issue.path[0]) as FieldName
      if (f && !seen.has(f)) { seen.add(f); out.push(f) }
    }
    return out
  }, [fullParse])

  // Map a Zod result's issues → { field: localized message }. First issue per
  // field wins; issue.message is a fragment like 'gender.required'.
  const collectErrors = (issues: { path: (string | number)[]; message: string }[]) => {
    const next: Partial<Record<FieldName, string>> = {}
    for (const issue of issues) {
      const field = String(issue.path[0]) as FieldName
      if (field && !next[field]) next[field] = t(`errors.${issue.message}`)
    }
    return next
  }

  const scrollToTop = () => {
    document.getElementById('visa-application-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNext = async () => {
    const payload = buildPayload()
    const result = VISA_STEP_SCHEMAS[step].safeParse(payload)
    if (!result.success) {
      setErrors(collectErrors(result.error.issues))
      return
    }
    setErrors({})
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
      scrollToTop()
      return
    }
    await handleSubmit(payload)
  }

  const handleBack = () => {
    setErrors({})
    setStep((s) => Math.max(0, s - 1))
    scrollToTop()
  }

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
        previous_schengen_visa_date:
          form.schengenLast3Years === 'true' && previousSchengenVisaDate
            ? previousSchengenVisaDate
            : undefined,
      })
      if (res.ok) {
        clearDraft() // finalised — next application starts fresh
        setDone(true)
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
  const textField = (name: FieldName, type: 'text' | 'email' | 'tel' = 'text', optional = false) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{t(`labels.${name}`)}{optional ? '' : ' *'}</Label>
      <Input
        id={name}
        type={type}
        value={form[name]}
        onChange={(e) => update(name, e.target.value)}
        className={errors[name] ? 'border-destructive' : ''}
      />
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  )

  const dateField = (
    name: FieldName,
    opts: { min?: string; max?: string; onChange?: (value: string) => void } = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{t(`labels.${name}`)} *</Label>
      <Input
        id={name}
        type="date"
        min={opts.min}
        max={opts.max}
        value={form[name]}
        onChange={(e) => (opts.onChange ? opts.onChange(e.target.value) : update(name, e.target.value))}
        className={errors[name] ? 'border-destructive' : ''}
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
      <Label htmlFor={name}>{t(`labels.${name}`)} *</Label>
      <Select value={form[name]} onValueChange={(v) => update(name, v)}>
        <SelectTrigger id={name} className={errors[name] ? 'border-destructive' : ''}>
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
    return (
      <Card className="max-w-2xl mx-auto border-primary/30">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">{t('success.title')}</h3>
          <p className="text-muted-foreground mb-6">{t('success.body')}</p>
          <div className="flex flex-col items-center gap-3">
            <a
              href={buildSupportWhatsAppLink({ locale: locale as Locale })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">{t('success.whatsapp')}</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isLastStep = step === TOTAL_STEPS - 1

  return (
    <Card className="max-w-2xl mx-auto border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t(`sections.step${step + 1}`)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('nav.step', { current: step + 1, total: TOTAL_STEPS })}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
            <DocsSection title={t('docs.stepHeading')}>
              {renderDocSlot('biometric_photo')}
              {applicantIsMinor && renderDocSlot('consent_form')}
            </DocsSection>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderDocSlot('id_card_front')}
                {renderDocSlot('id_card_back')}
                {renderDocSlot('passport_main')}
              </div>
            </DocsSection>
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
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('travelPurpose', TRAVEL_PURPOSES, 'travelPurpose')}
              {selectField('fundingSource', FUNDING_SOURCES, 'fundingSource')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('schengenLast3Years', YES_NO, 'yesNo')}
              {selectField('fingerprintsTaken', YES_NO, 'yesNo')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {dateField('schengenEntryDate', { min: today, onChange: handleEntryDateChange })}
              {dateField('schengenExitDate', { min: form.schengenEntryDate || today, onChange: handleExitDateChange })}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        value={previousSchengenVisaDate}
                        onChange={(e) => setPreviousSchengenVisaDate(e.target.value)}
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

        {/* Final-step gate summary: missing form fields + missing docs, sticky to the
            viewport bottom so the user sees what's left without scrolling the long step. */}
        {isLastStep && (missingFormFields.length > 0 || missingRequiredDocs.length > 0) && (
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

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
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
            disabled={submitting || (isLastStep && !(formValid && allRequiredDocsUploaded))}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
      </CardContent>
    </Card>
  )
}

// ============================================================
// Subcomponents
// ============================================================

/** Wraps the inline document slots within a step under a labelled, set-off block. */
function DocsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4 mt-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
