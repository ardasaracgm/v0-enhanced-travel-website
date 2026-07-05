'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import {
  CheckCircle, Sparkles, ShieldCheck, HeartPulse, CalendarClock, Headphones,
  Zap, Globe, Umbrella, Check, Minus, Lock, BadgeCheck, FileCheck,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PageHero } from '@/components/layout/page-hero'
import { todayAthensISO } from '@/lib/validation/dates'
import { DateRangeField } from '@/components/ferry/date-range-field'
import {
  INSURANCE_DATE_RE, MAX_TRAVELLERS, insuranceStep1Schema, insuranceStep2Schema,
} from '@/lib/validation/insurance'
import { submitInsuranceOrder } from '@/lib/actions/submit-insurance-order'
import {
  getCompanionPrefillContext,
  getCompanionForPrefill,
  type CompanionOption,
} from '@/lib/actions/companion-prefill'
import { upperName, upperPassport } from '@/lib/text/uppercase'
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

// 1b — Neden TravelBeez 5'li şerit. i18n: insurance.why.*
const WHY_ITEMS = [
  { key: 'why1', Icon: ShieldCheck },
  { key: 'why2', Icon: Zap },
  { key: 'why3', Icon: Headphones },
  { key: 'why4', Icon: Globe },
  { key: 'why5', Icon: Umbrella },
] as const

// Faz 3 — paket kartları. coverageId canlı Auras (7=35k, 8=100k, 9=500k); tıklama → setCoverageId + scroll.
const PACKAGES = [
  { key: 'essential', coverageId: 7, popular: false },
  { key: 'plus', coverageId: 8, popular: true },
  { key: 'premium', coverageId: 9, popular: false },
] as const
const PACKAGE_FEATURES = ['f1', 'f2', 'f3', 'f4'] as const

// Faz 3 — karşılaştırma satırları (teminat satırı katalogdan ayrı eklenir). i18n: insurance.comparison.rows.*
const COMPARE_ROWS = [
  { key: 'medical', cells: [true, true, true] },
  { key: 'baggage', cells: [false, true, true] },
  { key: 'cancellation', cells: [false, true, true] },
  { key: 'support', cells: [true, true, true] },
  { key: 'covid', cells: [false, false, true] },
] as const

// 1c — alt güven şeridi. i18n: insurance.trust.*
const TRUST_ITEMS = [
  { key: 'f1', Icon: Lock },
  { key: 'f2', Icon: BadgeCheck },
  { key: 'f3', Icon: ShieldCheck },
  { key: 'f4', Icon: FileCheck },
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
  return null
}

// Step 1 iletişim path → error key (contact step 1'e taşındı; passenger'lar step 2'de).
function step1ErrorKey(path: ReadonlyArray<string | number>): string | null {
  if (path[0] === 'contactEmail') return 'contact-email'
  if (path[0] === 'contactPhone') return 'contact-phone'
  return null
}

export interface InsurancePrefill {
  dateFrom?: string
  dateTo?: string
  travellers?: number
  coverageId?: number
}

export function InsuranceWizard({ prefill }: { prefill?: InsurancePrefill | null }) {
  const t = useTranslations('insurance')
  const tCompanion = useTranslations('passengerDetails') // shared prefill label
  const locale = useLocale()
  const today = todayAthensISO()

  const [step, setStep] = React.useState(0)
  const [maxStepReached, setMaxStepReached] = React.useState(0)

  // Adım 1
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [travellers, setTravellers] = React.useState(1)
  const [coverageId, setCoverageId] = React.useState<number | null>(null)
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')

  // Adım 2
  const [passengers, setPassengers] = React.useState<PassengerForm[]>([emptyPassenger()])
  const [step2Errors, setStep2Errors] = React.useState<Record<string, string>>({})
  const [companions, setCompanions] = React.useState<CompanionOption[]>([])
  const [assignments, setAssignments] = React.useState<Record<number, string>>({})

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

  // Signed-in owners: load saved companions (name-only) + prefill contact. The
  // server action reads the cookie session; guests get signedIn:false. Contact
  // fields are filled only if still empty (functional set) so a late response
  // never clobbers typed input. Reuses the ferry prefill actions unchanged.
  React.useEffect(() => {
    let cancelled = false
    getCompanionPrefillContext()
      .then((ctx) => {
        if (cancelled || !ctx.signedIn) return
        setCompanions(ctx.companions)
        if (ctx.contactEmail) setContactEmail((prev) => (prev === '' ? ctx.contactEmail : prev))
        if (ctx.contactPhone) setContactPhone((prev) => (prev === '' ? ctx.contactPhone : prev))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Hero prefill (Vize WizardPrefill deseni, boş-ezmez). KRİTİK QUOTE TİMİNG:
  //  • dateFrom/dateTo/travellers HEMEN set → quote effect (aşağıda) tarihle tetiklenir.
  //  • coverageId'yi HEMEN SETLEME → ref'te beklet; canlı tariff gelince uygula
  //    (aşağıdaki effect). Aksi halde selectedTariff boş kalır, handleSubmit
  //    step-0'a düşürür. Böylece coverageId set edildiği an selectedTariff DOLU olur.
  //  • dateFrom+dateTo varsa yolcular adımına (step 1) atla (render kapısı yok).
  // prefill yoksa/boşsa: hiçbir şey yapma → step 0 boş, normal davranış.
  const pendingCoverageRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (!prefill) return
    if (prefill.dateFrom) setDateFrom(prefill.dateFrom)
    if (prefill.dateTo) setDateTo(prefill.dateTo)
    if (prefill.travellers) setTravellers(prefill.travellers)
    if (prefill.coverageId) pendingCoverageRef.current = prefill.coverageId
    if (prefill.dateFrom && prefill.dateTo) { setStep(1); setMaxStepReached((m) => Math.max(m, 1)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  // Bekleyen coverageId'yi CANLI tariff hazır olunca uygula → selectedTariff hiç
  // boş kalmaz (handleSubmit step-0 düşme riski kapanır). Tariff bir kez gelir.
  React.useEffect(() => {
    const want = pendingCoverageRef.current
    if (want != null && tariffs.some((tf) => tf.coverageId === want)) {
      setCoverageId(want)
      pendingCoverageRef.current = null
    }
  }, [tariffs])

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
    contactEmail, contactPhone,
  })
  const selectedTariff = tariffs.find((tf) => tf.coverageId === coverageId) ?? null
  const step1Valid = step1Parsed.success && selectedTariff != null
  // Step 2 (yolcular) saf geçerlilik — SADECE kapı/tıklama için (yan etkisiz;
  // validateStep2 hata-SET eden yol ayrı kalır). Contact step 1'e taşındı → step2Schema passengers-only.
  const step2Valid = insuranceStep2Schema.safeParse({ passengers }).success
  // Tıklanabilir gösterge (transfer paritesi): geri serbest, aynı no-op, ileri
  // yalnız ulaşılmış + ön-koşul + re-quote kilidi yok. quoteLoading guard yalnız
  // ileri dalında (target<step erken 'true' → step 0'a dönüş HER ZAMAN serbest).
  const stepPrereqOk = [true, step1Valid, step1Valid && step2Valid]
  const canGoToStep = (target: number) =>
    target < step ? true
      : target === step ? false
      : target <= maxStepReached && stepPrereqOk[target] && !quoteLoading
  // Contact alan-hataları (reaktif; step1Attempted olunca gösterilir). Yalnız
  // contact path'leri map'lenir (step1ErrorKey diğerlerine null döner).
  const step1FieldErrors: Record<string, string> = {}
  if (!step1Parsed.success) {
    for (const issue of step1Parsed.error.issues) {
      const key = step1ErrorKey(issue.path)
      if (key && !step1FieldErrors[key]) step1FieldErrors[key] = t(`errors.${issue.message}`)
    }
  }
  const isLast = step === TOTAL_STEPS - 1

  // User edit path. Uppercases names/passport, and — the strict reset rule — if
  // this block was prefilled from a companion, any manual edit detaches it: the
  // block is cleared (keeping only the field just edited) and the companion is
  // freed. Prefill uses prefillPassenger and never lands here.
  const updatePassenger = (index: number, field: keyof PassengerForm, rawValue: string) => {
    const value =
      field === 'firstName' || field === 'lastName'
        ? upperName(rawValue)
        : field === 'passportNumber'
          ? upperPassport(rawValue)
          : rawValue
    const bound = !!assignments[index]
    setPassengers((prev) =>
      prev.map((p, i) =>
        i !== index ? p : bound ? { ...emptyPassenger(), [field]: value } : { ...p, [field]: value }
      )
    )
    if (bound) {
      setAssignments((prev) => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  const prefillPassenger = (index: number, patch: Partial<PassengerForm>) => {
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const handlePrefill = async (index: number, companionId: string) => {
    const data = await getCompanionForPrefill(companionId)
    if (!data) return
    // Insurance only has firstName/lastName/birthDate/passportNumber — take that
    // subset; gender/nationality/expiry have no target here (no expiry gate).
    prefillPassenger(index, {
      firstName: upperName(data.firstName),
      lastName: upperName(data.lastName),
      birthDate: data.birthDate,
      passportNumber: upperPassport(data.passportNumber),
    })
    setAssignments((prev) => ({ ...prev, [index]: companionId }))
  }

  const validateStep2 = (): boolean => {
    const result = insuranceStep2Schema.safeParse({ passengers })
    if (result.success) { setStep2Errors({}); return true }
    const next: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = step2ErrorKey(issue.path)
      if (key && !next[key]) next[key] = t(`errors.${issue.message}`)
    }
    setStep2Errors(next)
    return false
  }

  // Paket kartı → ilgili coverage'ı seç + forma kaydır. SADECE setCoverageId + scroll
  // (ödeme/Auras/Zod yoluna dokunmaz; quote zaten coverageId değişince tetiklenir).
  const selectPackage = (cid: number) => {
    setCoverageId(cid)
    document.getElementById('insurance-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goNext = () => {
    if (step === 0) {
      setStep1Attempted(true)
      if (quoteLoading) return // re-quote bitene kadar kilitle (eski tariff eşleşmesi yanıltmasın)
      if (!step1Valid) return
    }
    if (step === 1) { if (!validateStep2()) return }
    const next = Math.min(TOTAL_STEPS - 1, step + 1)
    setStep(next)
    setMaxStepReached((m) => Math.max(m, next))
  }

  // Adım 3 — Öde. Defansif: coverage/step2 hâlâ geçerli mi (yoksa ilgili adıma dön).
  const handleSubmit = async () => {
    // step1Valid = tarih+teminat+contact; coverageId/selectedTariff ayrıca (tip daralması).
    if (!step1Valid || !coverageId || !selectedTariff) { setStep(0); return }
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
    <>
    <PageHero
      bgImage="/services/insurance-hero_main.webp"
      bgAlt={t('heroTitle')}
      overlay="light"
      align="start"
    >
        <div className="wizard-compact grid w-full items-center gap-6 lg:grid-cols-[36rem_minmax(0,1fr)]">

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

            <Card id="insurance-form" className="border-0 shadow-2xl bg-card/90 backdrop-blur">
              <CardContent className="space-y-5 px-6 pt-6 pb-4">
                {/* Adım göstergesi — kart içi üst */}
                <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {STEP_KEYS.map((key, i) => {
          const clickable = canGoToStep(i)
          const reached = i <= maxStepReached
          return (
          <li key={key} className="flex items-center gap-2">
            <button type="button" disabled={!clickable} onClick={() => { if (clickable) setStep(i) }}
              aria-current={i === step ? 'step' : undefined}
              className={`flex items-center gap-2 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground'
                : reached ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              } ${clickable ? 'hover:ring-2 hover:ring-primary/40' : ''}`}>{i + 1}</span>
              <span className={`hidden text-sm sm:inline ${
                i === step ? 'font-medium text-foreground'
                : clickable ? 'text-foreground/70 hover:text-foreground' : 'text-muted-foreground'
              }`}>{t(`steps.${key}`)}</span>
            </button>
            {i < TOTAL_STEPS - 1 && <span className="mx-1 h-px w-4 bg-border sm:w-6" />}
          </li>
          )
        })}
                </ol>

                <div className="wc-panel lg:min-h-[min(28rem,60svh)] space-y-5">
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
                        className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
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

              {/* İletişim — teminat sonrası (voucher/ödeme bildirimi için). Başlıksız:
                  label'lar zaten alanı tanımlıyor (yer kazancı, fold için kritik). */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ins-email">{t('labels.contactEmail')} *</Label>
                  <Input id="ins-email" type="email" value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={`h-9 ${step1Attempted && step1FieldErrors['contact-email'] ? 'border-destructive' : ''}`} />
                  {step1Attempted && step1FieldErrors['contact-email'] && <p className="text-sm text-destructive">{step1FieldErrors['contact-email']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ins-phone">{t('labels.contactPhone')} *</Label>
                  <Input id="ins-phone" type="tel" value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className={`h-9 ${step1Attempted && step1FieldErrors['contact-phone'] ? 'border-destructive' : ''}`} />
                  {step1Attempted && step1FieldErrors['contact-phone'] && <p className="text-sm text-destructive">{step1FieldErrors['contact-phone']}</p>}
                </div>
              </div>

              {step1Attempted && (!datesValid || !selectedTariff) && (
                <p className="text-sm text-destructive">
                  {!datesValid ? t('errors.datesRequired') : t('errors.coverageRequired')}
                </p>
              )}
            </>
          ) : step === 1 ? (
            <div className="space-y-6">
              {/* Yolcu kartları — sabit yükseklik + scroll (iletişim step 1'e taşındı) */}
              <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-2">
              {passengers.map((p, index) => (
                <div key={index} className="space-y-4 rounded-md border p-4">
                  <p className="text-sm font-medium text-foreground">
                    {t('passengerNumber', { number: index + 1 })}{index === 0 ? ` ${t('leadBadge')}` : ''}
                  </p>
                  {companions.length > 0 && (
                    // Controlled value = the companion held by THIS block (persists);
                    // options exclude companions chosen in OTHER blocks so the same
                    // person can't be prefilled twice. Reselect frees the old.
                    <Select value={assignments[index] ?? ''} onValueChange={(id) => handlePrefill(index, id)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={tCompanion('companionPrefill.placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {companions
                          .filter((c) => !Object.entries(assignments).some(([i, id]) => Number(i) !== index && id === c.id))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.isSelf ? tCompanion('companionPrefill.self') : c.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
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
                </div>
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
    </PageHero>

    {/* ===== 1b — Neden TravelBeez Seyahat Sigortası (5'li şerit) ===== */}
    <section className="w-full bg-secondary/30 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <h2 className="mb-12 text-center text-2xl font-bold text-blue-950 md:text-3xl">{t('why.title')}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {WHY_ITEMS.map(({ key, Icon }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <Card className="h-full rounded-3xl border-border/50 shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                    <Icon className="h-7 w-7 text-amber-600" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-blue-950">{t(`why.${key}Title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`why.${key}Desc`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
    {/* ===== Faz 3 — Paket kartları (tıklama → setCoverageId + forma scroll) ===== */}
    <section className="w-full py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-blue-950 md:text-3xl">{t('packages.heading')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t('packages.intro')}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {PACKAGES.map((pkg) => {
            const est = INSURANCE_COVERAGE_CATALOG.find((c) => c.coverageId === pkg.coverageId)
            return (
              <Card key={pkg.key}
                className={`relative flex flex-col rounded-3xl ${pkg.popular ? 'border-amber-400 shadow-xl ring-2 ring-amber-400' : 'border-border/50 shadow-sm'}`}>
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-semibold text-blue-950">
                    {t('packages.popular')}
                  </span>
                )}
                <CardContent className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold text-blue-950">{t(`packages.${pkg.key}.name`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`packages.${pkg.key}.desc`)}</p>
                  <p className="mt-4 text-3xl font-bold text-blue-950">{t(`packages.${pkg.key}.coverage`)}</p>
                  {est && (
                    <p className="mt-1 text-sm font-medium text-amber-600">
                      {t('packages.priceFrom', { price: est.estimateOneDay.toLocaleString(locale) })}
                    </p>
                  )}
                  <ul className="mt-5 space-y-2">
                    {PACKAGE_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-blue-950">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        {t(`packages.${pkg.key}.${f}`)}
                      </li>
                    ))}
                  </ul>
                  <Button type="button" onClick={() => selectPackage(pkg.coverageId)}
                    className={`mt-6 w-full ${pkg.popular ? 'bg-amber-400 text-blue-950 hover:bg-amber-500' : ''}`}>
                    {t('packages.ctaSelect')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{t('packages.priceNote')}</p>
      </div>
    </section>
    {/* ===== Faz 3 — Paket karşılaştırma tablosu ===== */}
    <section className="w-full bg-secondary/30 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <h2 className="mb-12 text-center text-2xl font-bold text-blue-950 md:text-3xl">{t('comparison.heading')}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-4 text-left font-medium text-muted-foreground">{t('comparison.feature')}</th>
                {PACKAGES.map((pkg) => (
                  <th key={pkg.key} className="px-4 py-4 text-center font-bold text-blue-950">{t(`packages.${pkg.key}.name`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="px-4 py-3 text-blue-950">{t('comparison.rows.coverage')}</td>
                {PACKAGES.map((pkg) => {
                  const c = INSURANCE_COVERAGE_CATALOG.find((x) => x.coverageId === pkg.coverageId)
                  return (
                    <td key={pkg.key} className="px-4 py-3 text-center font-semibold text-blue-950">
                      {c ? `${c.coverageValue.toLocaleString(locale)} €` : '—'}
                    </td>
                  )
                })}
              </tr>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-blue-950">{t(`comparison.rows.${row.key}`)}</td>
                  {row.cells.map((on, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      {on
                        ? <Check className="mx-auto h-5 w-5 text-amber-500" />
                        : <Minus className="mx-auto h-5 w-5 text-muted-foreground/40" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    {/* ===== 1c — Alt güven şeridi ===== */}
    <section className="w-full py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-blue-950 md:text-3xl">{t('trust.title')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t('trust.intro')}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map(({ key, Icon }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="flex flex-col items-center rounded-2xl border border-border/50 bg-card p-6 text-center"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <Icon className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mb-1 font-semibold text-blue-950">{t(`trust.${key}Title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`trust.${key}Desc`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
    </>
  )
}
