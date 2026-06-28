'use client'

import * as React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import {
  CheckCircle, Sparkles, ShieldCheck, HeartPulse, CalendarClock, Headphones,
} from 'lucide-react'

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

// 1a hero: 4 özellik ikonu (salt görünüm). i18n: insurance.heroFeatures.*
const HERO_FEATURES = [
  { key: 'f1', Icon: ShieldCheck },
  { key: 'f2', Icon: HeartPulse },
  { key: 'f3', Icon: CalendarClock },
  { key: 'f4', Icon: Headphones },
] as const

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
      <div className="container px-4 py-10 md:px-6">
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
      </div>
    )
  }

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        {!heroError && (
          <Image
            src="/services/insurance-hero_main.webp"
            alt={t('heroTitle')}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            onError={() => setHeroError(true)}
          />
        )}
        {/* filtre yok: sadece sol kenar hafif beyaz, orta/sağ tam canlı */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
      </div>

      {/* min-h-screen + items-center: sığarsa ortalı, taşarsa uzar */}
      <div className="container relative flex min-h-screen items-start px-4 pt-6 pb-12 md:px-6">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[36rem_minmax(0,1fr)]">

          {/* SOL: eyebrow + başlık + subtitle + form (sola yaslı, dar) */}
          <div className="w-full max-w-xl space-y-3">
            {/* Eyebrow — mobil: sol-üstte. Masaüstünde sağ kolonda gösterilir (burada lg:hidden). */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-blue-950 lg:hidden"
            >
              <Sparkles className="h-4 w-4" />
              {t('heroEyebrow')}
            </motion.div>
            <h1 className="text-balance text-4xl font-bold text-blue-950 md:text-5xl">{t('heroTitle')}</h1>
            <p className="max-w-md text-pretty text-lg text-blue-950/80">{t('heroSubtitle')}</p>

            <Card className="border-0 shadow-2xl">
              <CardContent className="space-y-5 px-6 pt-6 pb-4">
                {/* Adım göstergesi — kart içi üst */}
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
              {/* Yolcu + İletişim — tek kutu: başlık → e-posta/telefon → yolcu scroll */}
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium text-foreground">{t('contactHeading')}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ins-email">{t('labels.contactEmail')} *</Label>
                    <Input id="ins-email" type="email" value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={`h-9 ${step2Errors['contact-email'] ? 'border-destructive' : ''}`} />
                    {step2Errors['contact-email'] && <p className="text-sm text-destructive">{step2Errors['contact-email']}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ins-phone">{t('labels.contactPhone')} *</Label>
                    <Input id="ins-phone" type="tel" value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className={`h-9 ${step2Errors['contact-phone'] ? 'border-destructive' : ''}`} />
                    {step2Errors['contact-phone'] && <p className="text-sm text-destructive">{step2Errors['contact-phone']}</p>}
                  </div>
                </div>

                {/* Yolcu kartları — sabit yükseklik + scroll (aynı kutu içinde) */}
                <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-2">
              {passengers.map((p, index) => (
                <div key={index} className="space-y-4 rounded-md border p-4">
                  <p className="text-sm font-medium text-foreground">
                    {t('passengerNumber', { number: index + 1 })}{index === 0 ? ` ${t('leadBadge')}` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
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
              </div>
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
                {/* Butonlar — Card içinde, dışarı taşmaz */}
                <div className="flex items-center gap-3 pt-1">
                  {step > 0 && (
                    <Button type="button" variant="outline"
                      onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={submitting}>
                      {t('nav.back')}
                    </Button>
                  )}
                  <Button type="button" className="ml-auto"
                    onClick={isLast ? handleSubmit : goNext} disabled={submitting}>
                    {submitting
                      ? t('nav.processing')
                      : isLast
                        ? t('nav.pay')
                        : step === 0 ? t('nav.goPassengers') : t('nav.goReview')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SAĞ: 4 ikon dikey — canlı opak pill, forma yakın (max-w-xs sola hug), stagger giriş */}
          <div className="hidden max-w-xs flex-col justify-center gap-4 lg:flex">
            {HERO_FEATURES.map(({ key, Icon }, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12, duration: 0.4 }}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-white/40 to-transparent px-4 py-3 backdrop-blur-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                  <Icon className="h-5 w-5 text-amber-500" />
                </span>
                <span className="text-sm font-semibold text-blue-950">{t(`heroFeatures.${key}`)}</span>
              </motion.div>
            ))}
            {/* Eyebrow — masaüstü: ikonların altında son eleman (mobilde sol kolonda). */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: HERO_FEATURES.length * 0.12, duration: 0.4 }}
              className="inline-flex items-center gap-2 self-start rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-blue-950"
            >
              <Sparkles className="h-4 w-4" />
              {t('heroEyebrow')}
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
