'use client'

import * as React from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { todayAthensISO } from '@/lib/validation/dates'
import { DateRangeField } from '@/components/ferry/date-range-field'
import {
  INSURANCE_DATE_RE, MAX_TRAVELLERS, insuranceStep1Schema, insuranceStep2Schema,
} from '@/lib/validation/insurance'
import { submitInsuranceOrder } from '@/lib/actions/submit-insurance-order'
import { INSURANCE_COVERAGE_CATALOG } from '@/lib/insurance/coverage-catalog'
import { getOrCreateInsuranceOrderKey, clearInsuranceOrderKey } from '@/lib/insurance/order-key'
import type { InsuranceTariff } from '@/lib/insurs'             // type-only (server-only guard tetiklenmez)
import type { Locale } from '@/lib/notifications/whatsapp-link' // type-only

// 3-adımlı wizard: 1) tarih+teminat (B2 ✓), 2) yolcular (B3 ✓), 3) özet+öde (B4 ✓).
const TOTAL_STEPS = 3
const STEP_KEYS = ['dates', 'travellers', 'review'] as const

interface PassengerForm {
  firstName: string
  lastName: string
  birthDate: string
  passportNumber: string
}
const emptyPassenger = (): PassengerForm => ({ firstName: '', lastName: '', birthDate: '', passportNumber: '' })

// Native date input 6 haneli yıl kabul eder → ilk 4'e kes (visa clampYear deseni).
function clampYear(v: string): string {
  const m = /^(\d+)-(\d{2})-(\d{2})$/.exec(v)
  return m && m[1].length > 4 ? `${m[1].slice(0, 4)}-${m[2]}-${m[3]}` : v
}

// Zod path → düz error key (ferry passenger-details pathToErrorKey deseni).
function step2ErrorKey(path: ReadonlyArray<string | number>): string | null {
  if (path[0] === 'passengers' && typeof path[1] === 'number') return `passenger-${path[1]}-${String(path[2])}`
  if (path[0] === 'contactEmail') return 'contact-email'
  if (path[0] === 'contactPhone') return 'contact-phone'
  return null
}

export function InsuranceWizard() {
  const t = useTranslations('insurance')
  const locale = useLocale()
  const today = todayAthensISO()

  const [step, setStep] = React.useState(0)
  const [heroError, setHeroError] = React.useState(false) // banner fallback; salt görünüm

  // Adım 1
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [travellers, setTravellers] = React.useState(1)
  const [coverageId, setCoverageId] = React.useState<number | null>(null)

  // Adım 2
  const [passengers, setPassengers] = React.useState<PassengerForm[]>([emptyPassenger()])
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [step2Errors, setStep2Errors] = React.useState<Record<string, string>>({})

  // Quote
  const [tariffs, setTariffs] = React.useState<InsuranceTariff[]>([])
  const [quoteLoading, setQuoteLoading] = React.useState(false)
  const [quoteFailed, setQuoteFailed] = React.useState(false)
  const [step1Attempted, setStep1Attempted] = React.useState(false)

  // Submit
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [paymentLink, setPaymentLink] = React.useState<string | null>(null)

  // Idempotency key mount'ta üretilir + sessionStorage'a yazılır (submit'te okunur).
  React.useEffect(() => { getOrCreateInsuranceOrderKey() }, [])

  // Yolcu sayısı değişince diziyi yeniden boyutlandır (girilen veriyi KORU).
  React.useEffect(() => {
    setPassengers((prev) => {
      if (prev.length === travellers) return prev
      const next = prev.slice(0, travellers)
      while (next.length < travellers) next.push(emptyPassenger())
      return next
    })
  }, [travellers])

  const datesValid =
    INSURANCE_DATE_RE.test(dateFrom) && INSURANCE_DATE_RE.test(dateTo) && dateFrom <= dateTo

  // Tüm DOB'lar dolu → re-quote'u gerçek DOB ile çağır (tahmin → kesin fiyat).
  const allDobsValid =
    passengers.length === travellers && passengers.every((p) => INSURANCE_DATE_RE.test(p.birthDate))
  const dobKey = passengers.map((p) => p.birthDate).join(',')

  React.useEffect(() => {
    if (!datesValid) { setTariffs([]); return }
    let cancelled = false
    setQuoteLoading(true)
    setQuoteFailed(false)
    fetch('/api/insurance/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateFrom, dateTo, touristCount: travellers,
        // DOB'lar tamamsa gerçek DOB → kesin fiyat; değilse tahmin (server fallback).
        ...(allDobsValid ? { tourists: passengers.map((p) => ({ dateBirth: p.birthDate })) } : {}),
      }),
    })
      .then((r) => { if (!r.ok) throw new Error('quote'); return r.json() })
      .then((d: { tariffs: InsuranceTariff[] }) => { if (!cancelled) setTariffs(d.tariffs) })
      .catch(() => { if (!cancelled) setQuoteFailed(true) }) // tariffs KORUNUR (son iyi değer)
      .finally(() => { if (!cancelled) setQuoteLoading(false) })
    return () => { cancelled = true }
  }, [dateFrom, dateTo, travellers, datesValid, allDobsValid, dobKey])

  const step1Parsed = insuranceStep1Schema.safeParse({
    dateFrom, dateTo, travellers, coverageId: coverageId ?? undefined,
  })
  const selectedTariff = tariffs.find((tf) => tf.coverageId === coverageId) ?? null
  const step1Valid = step1Parsed.success && selectedTariff != null
  const isLast = step === TOTAL_STEPS - 1

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    setPassengers((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const validateStep2 = (): boolean => {
    const result = insuranceStep2Schema.safeParse({ passengers, contactEmail, contactPhone })
    if (result.success) { setStep2Errors({}); return true }
    const next: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = step2ErrorKey(issue.path)
      if (key && !next[key]) next[key] = t(`errors.${issue.message}`)
    }
    setStep2Errors(next)
    return false
  }

  const goNext = () => {
    if (step === 0) {
      setStep1Attempted(true)
      if (quoteLoading) return // re-quote bitene kadar kilitle (eski tariff eşleşmesi yanıltmasın)
      if (!step1Valid) return
    }
    if (step === 1) { if (!validateStep2()) return }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
  }

  // Adım 3 — Öde. Defansif: coverage/step2 hâlâ geçerli mi (yoksa ilgili adıma dön).
  const handleSubmit = async () => {
    if (!coverageId || !selectedTariff) { setStep(0); return }
    if (!validateStep2()) { setStep(1); return }
    setSubmitting(true)
    setSubmitError(false)
    try {
      const res = await submitInsuranceOrder({
        idempotencyKey: getOrCreateInsuranceOrderKey(),
        locale: locale as Locale,
        dateFrom,
        dateTo,
        coverageId,
        passengers: passengers.map((p) => ({
          firstName: p.firstName, lastName: p.lastName,
          birthDate: p.birthDate, passportNumber: p.passportNumber, // Part A şekli (birthDate)
        })),
        contact: { email: contactEmail, phone: contactPhone },
      })
      if (res.ok) {
        clearInsuranceOrderKey() // tamamlandı → sonraki satış taze key
        if (res.redirectUrl) {
          window.location.assign(res.redirectUrl) // Viva Smart Checkout (sayfa unmount)
          return
        }
        setPaymentLink(res.paymentWhatsAppUrl) // Viva yok → WhatsApp fallback
        setDone(true)
      } else {
        setSubmitError(true)
      }
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const passengerError = (i: number, field: string) => step2Errors[`passenger-${i}-${field}`]

  // ----- Başarı (WhatsApp fallback) kartı -----
  if (done) {
    return (
      <Card className="mx-auto max-w-2xl border-primary/30">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('success.title')}</h3>
          <p className="text-muted-foreground">{t('success.body')}</p>
          {paymentLink && (
            <Button asChild className="mt-2">
              <a href={paymentLink} target="_blank" rel="noopener noreferrer">{t('success.whatsappCta')}</a>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Full-width hero banner (rounded-3xl) — checkout kartıyla aynı görsel.
          Collapse YOK (standalone'da "none" seçeneği yok). Salt görünüm. */}
      <div className="relative h-40 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 to-muted">
        {!heroError && (
          <Image
            src="/services/insurance-hero.webp"
            alt={t('heroTitle')}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
            priority
            onError={() => setHeroError(true)}
          />
        )}
      </div>
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('heroTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('heroSubtitle')}</p>
      </div>

      {/* Adım göstergesi */}
      <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{i + 1}</span>
            <span className={`hidden text-sm sm:inline ${
              i === step ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}>{t(`steps.${key}`)}</span>
            {i < TOTAL_STEPS - 1 && <span className="mx-1 h-px w-4 bg-border sm:w-6" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="space-y-5 p-6">
          {step === 0 ? (
            <>
              {/* Tarih aralığı + yolcu sayısı — yan yana (range tek alan) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('labels.dates')} *</Label>
                  <DateRangeField
                    mode="range"
                    date={dateFrom}
                    returnDate={dateTo}
                    onDateChange={setDateFrom}
                    onReturnDateChange={setDateTo}
                    minDate={today}
                    locale={locale}
                    placeholder={t('datesPlaceholder')}
                    alignOffset={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ins-travellers">{t('labels.travellers')} *</Label>
                  <Select value={String(travellers)} onValueChange={(v) => setTravellers(Number(v))}>
                    <SelectTrigger id="ins-travellers" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Teminat — açılışta katalogdan 3 gri "tahmini" satır; canlı quote gelince
                  eşleşen satır aktifleşir + gerçek €. Seçilebilirlik live tariff'e bağlı. */}
              <div className="space-y-2">
                <Label>{t('coverageHeading')} *</Label>
                <RadioGroup
                  value={coverageId != null ? String(coverageId) : ''}
                  onValueChange={(v) => setCoverageId(Number(v))}
                  className="space-y-2"
                >
                  {INSURANCE_COVERAGE_CATALOG.map((cat) => {
                    const live = tariffs.find((tf) => tf.coverageId === cat.coverageId)
                    const enabled = datesValid && !quoteLoading && live != null
                    const selected = cat.coverageId === coverageId
                    const price = live ? live.priceAmount : cat.estimateOneDay
                    return (
                      <Label key={cat.coverageId} htmlFor={`ins-cov-${cat.coverageId}`}
                        className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                          enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                        } ${
                          selected ? 'border-primary bg-primary/5'
                            : enabled ? 'border-border/50 hover:border-primary/50' : 'border-border/50'
                        }`}>
                        <span className="flex items-center gap-2">
                          <RadioGroupItem value={String(cat.coverageId)} id={`ins-cov-${cat.coverageId}`} disabled={!enabled} />
                          <span className="text-sm text-foreground">
                            {t('coverageLabel', { coverage: cat.coverageValue.toLocaleString(locale) })}
                          </span>
                        </span>
                        <span className={`whitespace-nowrap text-sm font-semibold ${
                          enabled ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {t('estimatedPrice', { price: price.toLocaleString(locale) })}
                        </span>
                      </Label>
                    )
                  })}
                </RadioGroup>
                {/* Liste hep görünür; durum ipucu altta (bloğu değiştirmez). */}
                {!datesValid ? (
                  <p className="text-xs text-muted-foreground">{t('pickDates')}</p>
                ) : quoteLoading ? (
                  <p className="text-xs text-muted-foreground">{t('quoteLoading')}</p>
                ) : quoteFailed ? (
                  <p className="text-xs text-destructive">{t('quoteFailed')}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">{t('estimateNote')}</p>
              </div>

              {step1Attempted && !step1Valid && (
                <p className="text-sm text-destructive">
                  {!datesValid ? t('errors.datesRequired') : t('errors.coverageRequired')}
                </p>
              )}
            </>
          ) : step === 1 ? (
            <div className="space-y-6">
              {/* İletişim — yolcu listesinin ÜSTÜnde (rezervasyon başına tek blok) */}
              <div className="space-y-4 rounded-md border p-4">
                <p className="text-sm font-medium text-foreground">{t('contactHeading')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ins-email">{t('labels.contactEmail')} *</Label>
                    <Input id="ins-email" type="email" value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={step2Errors['contact-email'] ? 'border-destructive' : ''} />
                    {step2Errors['contact-email'] && <p className="text-sm text-destructive">{step2Errors['contact-email']}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ins-phone">{t('labels.contactPhone')} *</Label>
                    <Input id="ins-phone" type="tel" value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className={step2Errors['contact-phone'] ? 'border-destructive' : ''} />
                    {step2Errors['contact-phone'] && <p className="text-sm text-destructive">{step2Errors['contact-phone']}</p>}
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-foreground">{t('travellersHeading')}</h2>

              {passengers.map((p, index) => (
                <div key={index} className="space-y-4 rounded-md border p-4">
                  <p className="text-sm font-medium text-foreground">
                    {t('passengerNumber', { number: index + 1 })}{index === 0 ? ` ${t('leadBadge')}` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_8rem] lg:gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`ins-fn-${index}`}>{t('labels.firstName')} *</Label>
                      <Input id={`ins-fn-${index}`} value={p.firstName}
                        onChange={(e) => updatePassenger(index, 'firstName', e.target.value)}
                        className={`min-w-0 ${passengerError(index, 'firstName') ? 'border-destructive' : ''}`} />
                      {passengerError(index, 'firstName') && <p className="text-sm text-destructive">{passengerError(index, 'firstName')}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ins-ln-${index}`}>{t('labels.lastName')} *</Label>
                      <Input id={`ins-ln-${index}`} value={p.lastName}
                        onChange={(e) => updatePassenger(index, 'lastName', e.target.value)}
                        className={`min-w-0 ${passengerError(index, 'lastName') ? 'border-destructive' : ''}`} />
                      {passengerError(index, 'lastName') && <p className="text-sm text-destructive">{passengerError(index, 'lastName')}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ins-dob-${index}`}>{t('labels.birthDate')} *</Label>
                      <Input id={`ins-dob-${index}`} type="date" min="1900-01-01" max={today} value={p.birthDate}
                        onChange={(e) => updatePassenger(index, 'birthDate', clampYear(e.target.value))}
                        className={`min-w-0 ${passengerError(index, 'birthDate') ? 'border-destructive' : ''}`} />
                      {passengerError(index, 'birthDate') && <p className="text-sm text-destructive">{passengerError(index, 'birthDate')}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ins-pp-${index}`}>{t('labels.passportNumber')} *</Label>
                      <Input id={`ins-pp-${index}`} value={p.passportNumber}
                        onChange={(e) => updatePassenger(index, 'passportNumber', e.target.value)}
                        className={`min-w-0 ${passengerError(index, 'passportNumber') ? 'border-destructive' : ''}`} />
                      {passengerError(index, 'passportNumber') && <p className="text-sm text-destructive">{passengerError(index, 'passportNumber')}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Adım 3 — Özet + öde
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">{t('reviewHeading')}</h2>
              <div className="divide-y rounded-md border">
                <div className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="text-muted-foreground">{t('summaryCoverage')}</span>
                  <span className="text-foreground">
                    {selectedTariff
                      ? t('coverageLabel', { coverage: selectedTariff.coverageValue.toLocaleString(locale) })
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="text-muted-foreground">{t('summaryDates')}</span>
                  <span className="text-foreground">{dateFrom} → {dateTo}</span>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="text-muted-foreground">{t('summaryTravellers')}</span>
                  <span className="text-right text-foreground">
                    {passengers.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 p-3">
                  <span className="text-sm font-medium text-foreground">{t('summaryTotal')}</span>
                  <span className="text-base font-semibold text-primary">
                    {selectedTariff ? `€${selectedTariff.priceAmount.toLocaleString(locale)}` : '—'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('payNote')}</p>
              {submitError && <p className="text-sm text-destructive">{t('submitError')}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
          {t('nav.back')}
        </Button>
        <Button type="button" onClick={isLast ? handleSubmit : goNext} disabled={submitting}>
          {submitting ? t('nav.processing') : isLast ? t('nav.pay') : t('nav.next')}
        </Button>
      </div>
    </div>
  )
}
