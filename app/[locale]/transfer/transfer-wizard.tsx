'use client'

import * as React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle, Users, AlertCircle, Sparkles, UserRound, Headphones, PlaneTakeoff, CalendarX } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PageHero } from '@/components/layout/page-hero'
import { parseISODate, todayAthensISO } from '@/lib/validation/dates'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'
import { transferVehicleVisual } from '@/lib/service-theme'
import { submitTransferOrder } from '@/lib/actions/submit-transfer-order'
import { getOrCreateTransferOrderKey, clearTransferOrderKey } from '@/lib/transfer/order-key'
import type { Locale } from '@/lib/notifications/whatsapp-link'

// 3-adımlı wizard: 1) güzergah+araç+yön+tarih, 2) iletişim, 3) özet+öde.
const TOTAL_STEPS = 3
const STEP_KEYS = ['trip', 'contact', 'review'] as const
// Hero sağ kolon — 4 özellik ikonu (salt görünüm). i18n: transferPage.heroFeature*
const HERO_FEATURES = [
  { key: 'heroFeatureDrivers', Icon: UserRound },
  { key: 'heroFeatureSupport', Icon: Headphones },
  { key: 'heroFeatureTracking', Icon: PlaneTakeoff },
  { key: 'heroFeatureCancel', Icon: CalendarX },
] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /.+@.+\..+/

// Native date input 6 haneli yıl kabul eder → ilk 4'e kes (insurance deseni).
function clampYear(v: string): string {
  const m = /^(\d+)-(\d{2})-(\d{2})$/.exec(v)
  return m && m[1].length > 4 ? `${m[1].slice(0, 4)}-${m[2]}-${m[3]}` : v
}

// Tarih + locale-aware kısa gün (örn TR "01.07.2026 Çar" / EN "07/01/2026 Wed" / EL "01/07/2026 Τετ").
function formatDateWithDay(iso: string, locale: string): string {
  const d = parseISODate(iso)
  if (!d) return iso || '—'
  const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d)
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(d)
  return `${date} ${day}`
}

// Tek region (bodrum) otomatik seçili; UI region-aware (ileride seçici eklenir).
const REGION_IDS = Object.keys(TRANSFER_REGIONS) as (keyof typeof TRANSFER_REGIONS)[]

export interface TransferPrefill {
  routeId?: string
  vehicleId?: string
  outboundDate?: string
  returnDate?: string
}

export function TransferWizard({ prefill }: { prefill?: TransferPrefill | null }) {
  const t = useTranslations('transferPage')
  const locale = useLocale()
  const today = todayAthensISO()

  const regionId = REGION_IDS[0]
  const region = TRANSFER_REGIONS[regionId]

  const [step, setStep] = React.useState(0)
  const [maxStepReached, setMaxStepReached] = React.useState(0)

  // Adım 1
  const [routeId, setRouteId] = React.useState<string>('')
  const [vehicleId, setVehicleId] = React.useState<string>('')
  const [outboundDate, setOutboundDate] = React.useState('')
  const [returnDate, setReturnDate] = React.useState('')
  // Leg aktifliği tarih doluluğundan türetilir (Switch kaldırıldı, tam bağımsız).
  const outbound = outboundDate !== ''
  const ret = returnDate !== ''
  const [step1Attempted, setStep1Attempted] = React.useState(false)

  // Adım 2
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [passengerCount, setPassengerCount] = React.useState('')
  const [step2Attempted, setStep2Attempted] = React.useState(false)

  // Submit
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [paymentLink, setPaymentLink] = React.useState<string | null>(null)

  // Idempotency key mount'ta üretilir + sessionStorage'a yazılır (submit'te okunur).
  React.useEffect(() => { getOrCreateTransferOrderKey() }, [])

  // Hero prefill (Vize/Sigorta deseni, boş-ezmez). Fiyat türetilmiş (route/
  // vehicle/tarih state'inden, :95-99) → prefill set edilince otomatik doğru,
  // ayrı taşıma yok. route+vehicle+en az 1 tarih varsa iletişim adımına (step 1)
  // atla (render kapısı yok; step1Valid sağlandığından handleSubmit step-0'a
  // düşürmez). prefill yoksa: no-op → step 0 boş, normal davranış.
  React.useEffect(() => {
    if (!prefill) return
    if (prefill.routeId) setRouteId(prefill.routeId)
    if (prefill.vehicleId) setVehicleId(prefill.vehicleId)
    if (prefill.outboundDate) setOutboundDate(prefill.outboundDate)
    if (prefill.returnDate) setReturnDate(prefill.returnDate)
    const hasLeg = !!(prefill.outboundDate || prefill.returnDate)
    if (prefill.routeId && prefill.vehicleId && hasLeg) {
      setStep(1)
      setMaxStepReached((m) => Math.max(m, 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  const route = region.routes.find((r) => r.id === routeId) ?? null
  const vehicle = region.vehicles.find((v) => v.id === vehicleId) ?? null
  const perLegEur = route && vehicleId
    ? ((route.prices as Record<string, number>)[vehicleId] ?? 0) / 100
    : 0
  const legCount = (outbound ? 1 : 0) + (ret ? 1 : 0)
  const totalEur = perLegEur * legCount

  // Fiyat formatı — locale ayraçlı 2 ondalık (extras kartı fmtEur ile aynı).
  const fmtEur = (n: number) =>
    n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const outboundDateOk = !outbound || DATE_RE.test(outboundDate)
  const returnDateOk = !ret || DATE_RE.test(returnDate)
  // Dönüş bağımsız seçilebilir — tarih sıralama kısıtı kaldırıldı.
  const step1Valid = !!routeId && !!vehicleId && legCount >= 1 &&
    outboundDateOk && returnDateOk

  const pcNum = passengerCount.trim() === '' ? null : Number(passengerCount)
  const capacityWarning = vehicle != null && pcNum != null &&
    Number.isFinite(pcNum) && pcNum > vehicle.capacity

  const step2Valid =
    firstName.trim().length >= 1 && lastName.trim().length >= 1 &&
    EMAIL_RE.test(email.trim()) && phone.trim().length >= 6

  const isLast = step === TOTAL_STEPS - 1

  const goNext = () => {
    if (step === 0) { setStep1Attempted(true); if (!step1Valid) return }
    if (step === 1) { setStep2Attempted(true); if (!step2Valid) return }
    const next = Math.min(TOTAL_STEPS - 1, step + 1)
    setStep(next)
    setMaxStepReached((m) => Math.max(m, next))
  }

  // Tıklanabilir step: geri her zaman; ileri yalnız ulaşılmış + ön koşullar geçerli (validasyonsuz atlama yok).
  const stepPrereqOk = [true, step1Valid, step1Valid && step2Valid]
  const canGoToStep = (target: number) =>
    target < step ? true : target === step ? false : target <= maxStepReached && stepPrereqOk[target]

  // Adım 3 — Öde. Defansif: adım hâlâ geçerli mi (yoksa ilgili adıma dön).
  const handleSubmit = async () => {
    if (!step1Valid) { setStep1Attempted(true); setStep(0); return }
    if (!step2Valid) { setStep2Attempted(true); setStep(1); return }
    setSubmitting(true)
    setSubmitError(false)
    try {
      const res = await submitTransferOrder({
        idempotencyKey: getOrCreateTransferOrderKey(),
        locale: locale as Locale,
        regionId,
        outbound: outbound ? { routeId, vehicleId, date: outboundDate } : undefined,
        return: ret ? { routeId, vehicleId, date: returnDate } : undefined,
        contact: { firstName, lastName, email, phone },
        passengerCount: pcNum != null && Number.isInteger(pcNum) ? pcNum : undefined,
      })
      if (res.ok) {
        clearTransferOrderKey() // tamamlandı → sonraki satış taze key
        if (res.redirectUrl) { window.location.assign(res.redirectUrl); return } // Viva (sayfa unmount)
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

  // ----- Başarı (WhatsApp fallback) kartı -----
  if (done) {
    return (
      <section className="w-full py-16 md:py-24">
        <div className="container px-4 md:px-6">
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
      </section>
    )
  }

  return (
    <PageHero
      bgImage="/transfer-hero.webp"
      bgAlt={t('heroTitle')}
      overlay="light"
      align="start"
    >
        <div className="wizard-compact grid w-full items-center gap-6 lg:grid-cols-[36rem_minmax(0,1fr)]">

          {/* SOL: eyebrow + başlık + subtitle + form kartı */}
          <div className="w-full max-w-xl space-y-3">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-blue-950 lg:hidden">
              <Sparkles className="h-4 w-4" />{t('heroBadge')}
            </motion.div>
            <h1 className="text-balance text-4xl font-bold text-blue-950 md:text-5xl">{t('heroTitle')}</h1>
            <p className="max-w-md text-pretty text-lg text-blue-950/80">{t('heroSubtitle')}</p>

            <Card className="border-0 shadow-2xl bg-card/90 backdrop-blur">
              <CardContent className="space-y-5 p-6">
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
                  )})}
                </ol>
                {/* Üç bölmeli üst nav şeridi — sol Geri / orta toplam / sağ Devam-Öde. Sabit min-h, zıplama yok. */}
                <div className="flex min-h-[3.25rem] items-center justify-between gap-3 border-b pb-4">
                  {step > 0 ? (
                    <Button type="button" variant="outline"
                      onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={submitting}>
                      {t('nav.back')}
                    </Button>
                  ) : <span aria-hidden />}
                  <span className="text-lg font-bold text-blue-950">
                    {legCount >= 1 && vehicleId && route ? `€${fmtEur(totalEur)}` : ''}
                  </span>
                  <Button type="button" onClick={isLast ? handleSubmit : goNext} disabled={submitting}>
                    {submitting ? t('nav.processing') : isLast ? t('nav.pay') : t('nav.next')}
                  </Button>
                </div>
                <div className="wc-panel lg:min-h-[29rem] space-y-5">
                {step === 0 ? (
            <>
              <p className="wc-optional text-sm text-muted-foreground">
                {t('operatorLabel')}: <span className="text-foreground">{region.operator}</span> ·{' '}
                {t('pickupLabel')}: <span className="text-foreground">{region.pickupLabel}</span>
              </p>

              {/* Varış noktası — tam genişlik (Devam üst şeride taşındı) */}
              <div className="space-y-2">
                <Label htmlFor="tr-route">{t('route')} *</Label>
                <Select value={routeId || undefined} onValueChange={setRouteId}>
                  <SelectTrigger id="tr-route"><SelectValue placeholder={t('selectRoute')} /></SelectTrigger>
                  <SelectContent>
                    {region.routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Araç — yatay kompakt kartlar; seçili açık kapı (-open), değil kapalı (-close) */}
              <div className="space-y-2">
                <Label>{t('vehicle')} *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {region.vehicles.map((v) => {
                    const selected = vehicleId === v.id
                    const priceEur = route ? ((route.prices as Record<string, number>)[v.id] ?? 0) / 100 : null
                    const vSrc = transferVehicleVisual(v.id, selected)
                    return (
                      <button key={v.id} type="button" onClick={() => setVehicleId(v.id)}
                        className={`flex flex-col overflow-hidden rounded-xl border-2 text-left shadow-sm transition-shadow hover:shadow-md ${
                          selected ? 'border-primary shadow-md ring-2 ring-primary' : 'border-border/50'
                        }`}>
                        {/* Görsel — 5:3 oran korunur, max-h ile %75'e kısılır (üst şerit için), object-contain → kırpma yok */}
                        <div className="wc-media relative aspect-[5/3] max-h-[5rem] w-full bg-white">
                          {vSrc && (
                            <Image src={vSrc} alt={v.label} fill sizes="(max-width: 640px) 50vw, 16rem" className="object-contain" />
                          )}
                        </div>
                        {/* Alt şerit: isim + kapasite + fiyat */}
                        <div className="space-y-1 px-3 py-2">
                          <span className="block text-sm font-medium text-foreground">{v.label}</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" />{t('seatCount', { count: v.capacity })}
                            </span>
                            {priceEur != null && (
                              <span className="font-semibold text-primary">€{fmtEur(priceEur)}{t('perLeg')}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Yönler — tarih hep açık (Switch yok); leg ⟺ tarih dolu. Sabit yükseklik. */}
              <div className="space-y-2">
                <Label>{t('legsHeading')} *</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex min-h-[5.25rem] flex-col gap-2 rounded-md border p-3">
                    <Label htmlFor="tr-out-date" className="text-sm text-foreground">{t('outbound')}</Label>
                    <Input id="tr-out-date" type="date" min={today} value={outboundDate}
                      className="w-full"
                      onChange={(e) => setOutboundDate(clampYear(e.target.value))} />
                  </div>
                  <div className="flex min-h-[5.25rem] flex-col gap-2 rounded-md border p-3">
                    <Label htmlFor="tr-ret-date" className="text-sm text-foreground">{t('return')}</Label>
                    <Input id="tr-ret-date" type="date" min={today} value={returnDate}
                      className="w-full"
                      onChange={(e) => setReturnDate(clampYear(e.target.value))} />
                  </div>
                </div>
              </div>

              {step1Attempted && !step1Valid && (
                <p className="text-sm text-destructive">
                  {!routeId || !vehicleId || legCount < 1 ? t('errors.tripRequired') : t('errors.datesRequired')}
                </p>
              )}
            </>
          ) : step === 1 ? (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">{t('contactHeading')}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tr-fn">{t('labels.firstName')} *</Label>
                  <Input id="tr-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className={step2Attempted && !firstName.trim() ? 'border-destructive' : ''} />
                  {step2Attempted && !firstName.trim() && <p className="text-sm text-destructive">{t('errors.firstName_required')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tr-ln">{t('labels.lastName')} *</Label>
                  <Input id="tr-ln" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className={step2Attempted && !lastName.trim() ? 'border-destructive' : ''} />
                  {step2Attempted && !lastName.trim() && <p className="text-sm text-destructive">{t('errors.lastName_required')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tr-email">{t('labels.email')} *</Label>
                  <Input id="tr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={step2Attempted && !EMAIL_RE.test(email.trim()) ? 'border-destructive' : ''} />
                  {step2Attempted && !EMAIL_RE.test(email.trim()) && <p className="text-sm text-destructive">{t('errors.email_invalid')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tr-phone">{t('labels.phone')} *</Label>
                  <Input id="tr-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className={step2Attempted && phone.trim().length < 6 ? 'border-destructive' : ''} />
                  {step2Attempted && phone.trim().length < 6 && <p className="text-sm text-destructive">{t('errors.phone_invalid')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tr-pax">{t('labels.passengerCount')}</Label>
                  <Input id="tr-pax" type="number" min={1} max={60} value={passengerCount}
                    className="sm:w-40"
                    onChange={(e) => setPassengerCount(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('passengerCountNote')}</p>
                </div>
              </div>
              {/* Sabit yer — uyarı görününce form uzamaz */}
              <div className="min-h-[1.75rem]">
                {capacityWarning && vehicle && (
                  <p className="inline-flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />{t('capacityWarning', { capacity: vehicle.capacity })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Adım 3 — özet + öde
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-blue-950">{t('reviewHeading')}</h2>
              <div className="overflow-hidden rounded-md border">
                {/* Güzergah — tam satır */}
                <div className="flex items-center justify-between gap-4 border-b p-3 text-sm">
                  <span className="text-muted-foreground">{t('summaryRoute')}</span>
                  <span className="text-right text-foreground">{region.pickupLabel} ↔ {route?.label ?? '—'}</span>
                </div>
                {/* Gidiş + Dönüş — yan yana; dönüş daima render (tek yönde "—", yer kaymaz) */}
                <div className="grid grid-cols-2 divide-x border-b">
                  <div className="space-y-0.5 p-3 text-sm">
                    <span className="block text-muted-foreground">{t('summaryOutbound')}</span>
                    <span className="block text-foreground">{outbound ? formatDateWithDay(outboundDate, locale) : '—'}</span>
                  </div>
                  <div className="space-y-0.5 p-3 text-sm">
                    <span className="block text-muted-foreground">{t('summaryReturn')}</span>
                    <span className="block text-foreground">{ret ? formatDateWithDay(returnDate, locale) : '—'}</span>
                  </div>
                </div>
                {/* Araç + Toplam — yan yana; toplam vurgulu */}
                <div className="grid grid-cols-2 divide-x">
                  <div className="space-y-0.5 p-3 text-sm">
                    <span className="block text-muted-foreground">{t('summaryVehicle')}</span>
                    <span className="block text-foreground">{vehicle?.label ?? '—'}</span>
                  </div>
                  <div className="space-y-0.5 p-3 text-sm">
                    <span className="block text-muted-foreground">{t('summaryTotal')}</span>
                    <span className="block text-base font-semibold text-primary">€{fmtEur(totalEur)}</span>
                  </div>
                </div>
              </div>
              {/* Araç görseli — suffix'siz geniş manzara (helper'dan DEĞİL, doğrudan path) */}
              {(vehicleId === 'vito' || vehicleId === 'sprinter') && (
                <div className="relative aspect-[16/9] max-h-[12rem] w-full overflow-hidden rounded-xl bg-white">
                  <Image src={`/services/transfer-${vehicleId}.webp`} alt={vehicle?.label ?? 'Transfer'}
                    fill sizes="(max-width: 640px) 100vw, 36rem" className="object-cover" />
                  {vehicle && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-blue-950/80 px-2.5 py-1 text-xs font-semibold text-white">
                      <Users className="h-3 w-3" />{t('seatCount', { count: vehicle.capacity })}
                    </span>
                  )}
                </div>
              )}
              {submitError && <p className="text-sm text-destructive">{t('submitError')}</p>}
            </div>
          )}
                </div>
        </CardContent>
            </Card>
          </div>

          {/* SAĞ: 4 dikey ikon + CTA hap (sigorta hero ile birebir) */}
          <div className="hidden max-w-xs flex-col justify-center gap-4 lg:flex">
            {HERO_FEATURES.map(({ key, Icon }, index) => (
              <motion.div key={key} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: index * 0.12, duration: 0.4 }}
                className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-white/40 to-transparent px-4 py-3 backdrop-blur-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                  <Icon className="h-5 w-5 text-amber-500" />
                </span>
                <span className="text-sm font-semibold text-blue-950">{t(key)}</span>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: HERO_FEATURES.length * 0.12, duration: 0.4 }}
              className="inline-flex items-center gap-2 self-start rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-blue-950">
              <Sparkles className="h-4 w-4" />{t('heroBadge')}
            </motion.div>
          </div>

        </div>
    </PageHero>
  )
}
