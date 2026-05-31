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

import { todayAthensISO } from '@/lib/validation/dates'
import {
  VISA_STEP_SCHEMAS,
  visaApplicationSchema,
  ENTRY_POINTS,
  VESSEL_TYPES,
  GENDERS,
  MARITAL_STATUSES,
  DOC_TYPES,
  TRAVEL_PURPOSES,
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
  | 'lastName' | 'firstName' | 'fatherName' | 'motherName' | 'birthDate'
  | 'birthPlace' | 'birthCountry' | 'gender' | 'maritalStatus'
  | 'idNumber' | 'docType' | 'docNumber' | 'docIssueDate' | 'docExpiryDate' | 'issuingAuthority'
  | 'residenceAddress' | 'email' | 'phone' | 'livesInOtherCountry' | 'occupation'
  | 'travelPurpose' | 'stayDuration' | 'schengenLast3Years' | 'fingerprintsTaken'
  | 'schengenEntryDate' | 'schengenExitDate'

type FormState = Record<FieldName, string>

const EMPTY_FORM: FormState = {
  entryPoint: '', vesselType: '',
  lastName: '', firstName: '', fatherName: '', motherName: '', birthDate: '',
  birthPlace: '', birthCountry: '', gender: '', maritalStatus: '',
  idNumber: '', docType: '', docNumber: '', docIssueDate: '', docExpiryDate: '', issuingAuthority: '',
  residenceAddress: '', email: '', phone: '', livesInOtherCountry: '', occupation: '',
  travelPurpose: '', stayDuration: '', schengenLast3Years: '', fingerprintsTaken: '',
  schengenEntryDate: '', schengenExitDate: '',
}

// Which fields live on which step — used to jump back to the earliest step
// that has an error after the full-form submit parse.
const STEP_FIELDS: FieldName[][] = [
  ['entryPoint', 'vesselType'],
  ['lastName', 'firstName', 'fatherName', 'motherName', 'birthDate', 'birthPlace', 'birthCountry', 'gender', 'maritalStatus'],
  ['idNumber', 'docType', 'docNumber', 'docIssueDate', 'docExpiryDate', 'issuingAuthority'],
  ['residenceAddress', 'email', 'phone', 'livesInOtherCountry', 'occupation'],
  ['travelPurpose', 'stayDuration', 'schengenLast3Years', 'fingerprintsTaken', 'schengenEntryDate', 'schengenExitDate'],
]
const TOTAL_STEPS = STEP_FIELDS.length

const YES_NO = ['true', 'false'] as const
const STAY_DURATIONS = ['1', '2', '3', '4', '5', '6', '7'] as const

/** '' → undefined (triggers required), else 'true' → true / 'false' → false. */
function toBool(v: string): boolean | undefined {
  return v === '' ? undefined : v === 'true'
}

export function VisaWizard() {
  const t = useTranslations('visaPage.form')
  const locale = useLocale()
  const today = todayAthensISO()

  const [step, setStep] = React.useState(0)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = React.useState<Partial<Record<FieldName, string>>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)
  const [done, setDone] = React.useState(false)

  const update = (name: FieldName, value: string) => {
    setForm((f) => ({ ...f, [name]: value }))
    // Clear the field's error as the user edits it.
    setErrors((e) => {
      if (!e[name]) return e
      const { [name]: _omit, ...rest } = e
      return rest
    })
  }

  // Build the payload Zod expects: booleans converted, stayDuration left as a
  // string (z.coerce.number handles it), enums/dates as-is.
  const buildPayload = () => ({
    locale,
    ...form,
    livesInOtherCountry: toBool(form.livesInOtherCountry),
    schengenLast3Years: toBool(form.schengenLast3Years),
    fingerprintsTaken: toBool(form.fingerprintsTaken),
  })

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
      const res = await submitVisaApplication(payload)
      if (res.ok) {
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
  const textField = (name: FieldName, type: 'text' | 'email' | 'tel' = 'text') => (
    <div className="space-y-2">
      <Label htmlFor={name}>{t(`labels.${name}`)} *</Label>
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

  const dateField = (name: FieldName, opts: { min?: string; max?: string } = {}) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{t(`labels.${name}`)} *</Label>
      <Input
        id={name}
        type="date"
        min={opts.min}
        max={opts.max}
        value={form[name]}
        onChange={(e) => update(name, e.target.value)}
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

  // Numeric select (1-7) — labels are the raw numbers, no i18n.
  const stayDurationField = () => (
    <div className="space-y-2">
      <Label htmlFor="stayDuration">{t('labels.stayDuration')} *</Label>
      <Select value={form.stayDuration} onValueChange={(v) => update('stayDuration', v)}>
        <SelectTrigger id="stayDuration" className={errors.stayDuration ? 'border-destructive' : ''}>
          <SelectValue placeholder={t('selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {STAY_DURATIONS.map((n) => (
            <SelectItem key={n} value={n}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.stayDuration && <p className="text-sm text-destructive">{errors.stayDuration}</p>}
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
          <a
            href={buildSupportWhatsAppLink({ locale: locale as Locale })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">{t('success.whatsapp')}</Button>
          </a>
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
          <div className="grid md:grid-cols-2 gap-4">
            {selectField('entryPoint', ENTRY_POINTS, 'entryPoint')}
            {selectField('vesselType', VESSEL_TYPES, 'vesselType')}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('lastName')}
              {textField('firstName')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('fatherName')}
              {textField('motherName')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {dateField('birthDate', { max: today })}
              {textField('birthPlace')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {textField('birthCountry')}
              {selectField('gender', GENDERS, 'gender')}
            </div>
            {selectField('maritalStatus', MARITAL_STATUSES, 'maritalStatus')}
          </>
        )}

        {step === 2 && (
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
          </>
        )}

        {step === 3 && (
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

        {step === 4 && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('travelPurpose', TRAVEL_PURPOSES, 'travelPurpose')}
              {stayDurationField()}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {selectField('schengenLast3Years', YES_NO, 'yesNo')}
              {selectField('fingerprintsTaken', YES_NO, 'yesNo')}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {dateField('schengenEntryDate', { min: today })}
              {dateField('schengenExitDate', { min: today })}
            </div>
          </>
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

          <Button onClick={handleNext} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
