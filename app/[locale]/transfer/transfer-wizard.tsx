'use client'

import * as React from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle, Users, AlertCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { todayAthensISO } from '@/lib/validation/dates'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'
import { transferVehicleVisual } from '@/lib/service-theme'
import { submitTransferOrder } from '@/lib/actions/submit-transfer-order'
import { getOrCreateTransferOrderKey, clearTransferOrderKey } from '@/lib/transfer/order-key'
import type { Locale } from '@/lib/notifications/whatsapp-link'

// 3-adımlı wizard: 1) güzergah+araç+yön+tarih, 2) iletişim, 3) özet+öde.
const TOTAL_STEPS = 3
const STEP_KEYS = ['trip', 'contact', 'review'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /.+@.+\..+/

// Native date input 6 haneli yıl kabul eder → ilk 4'e kes (insurance deseni).
function clampYear(v: string): string {
  const m = /^(\d+)-(\d{2})-(\d{2})$/.exec(v)
  return m && m[1].length > 4 ? `${m[1].slice(0, 4)}-${m[2]}-${m[3]}` : v
}

// Tek region (bodrum) otomatik seçili; UI region-aware (ileride seçici eklenir).
const REGION_IDS = Object.keys(TRANSFER_REGIONS) as (keyof typeof TRANSFER_REGIONS)[]

export function TransferWizard() {
  const t = useTranslations('transferPage')
  const locale = useLocale()
  const today = todayAthensISO()

  const regionId = REGION_IDS[0]
  const region = TRANSFER_REGIONS[regionId]

  const [step, setStep] = React.useState(0)

  // Adım 1
  const [routeId, setRouteId] = React.useState<string>('')
  const [vehicleId, setVehicleId] = React.useState<string>('')
  const [outbound, setOutbound] = React.useState(true)   // gidiş varsayılan açık
  const [ret, setRet] = React.useState(false)
  const [outboundDate, setOutboundDate] = React.useState('')
  const [returnDate, setReturnDate] = React.useState('')
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
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
  }

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
              <p className="text-sm text-muted-foreground">
                {t('operatorLabel')}: <span className="text-foreground">{region.operator}</span> ·{' '}
                {t('pickupLabel')}: <span className="text-foreground">{region.pickupLabel}</span>
              </p>

              {/* Rota */}
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

              {/* Araç — görselli kartlar; seçili açık kapı (-open), değil kapalı (-close) */}
              <div className="space-y-2">
                <Label>{t('vehicle')} *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {region.vehicles.map((v) => {
                    const selected = vehicleId === v.id
                    const priceEur = route ? ((route.prices as Record<string, number>)[v.id] ?? 0) / 100 : null
                    const vSrc = transferVehicleVisual(v.id, selected)
                    return (
                      <button key={v.id} type="button" onClick={() => setVehicleId(v.id)}
                        className={`flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
                          selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                        }`}>
                        <div className="relative aspect-[3/2] w-full bg-white">
                          {vSrc && (
                            <Image src={vSrc} alt={v.label} fill sizes="(max-width: 640px) 50vw, 16rem" className="object-contain" />
                          )}
                        </div>
                        <div className="space-y-0.5 px-3 py-2">
                          <span className="block text-sm font-medium text-foreground">{v.label}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />{t('seatCount', { count: v.capacity })}
                            {priceEur != null && (
                              <span className="ml-1 font-semibold text-primary">€{fmtEur(priceEur)}{t('perLeg')}</span>
                            )}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Yönler — yan yana; switch yanında yön metni, tarih label'sız */}
              <div className="space-y-2">
                <Label>{t('legsHeading')} *</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <Switch checked={outbound} onCheckedChange={setOutbound} />
                      <span className="text-sm text-foreground">{t('outbound')}</span>
                    </label>
                    {outbound && (
                      <Input id="tr-out-date" type="date" min={today} value={outboundDate}
                        className="mt-3 w-full"
                        onChange={(e) => setOutboundDate(clampYear(e.target.value))} />
                    )}
                  </div>
                  <div className="rounded-md border p-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <Switch checked={ret} onCheckedChange={setRet} />
                      <span className="text-sm text-foreground">{t('return')}</span>
                    </label>
                    {ret && (
                      <Input id="tr-ret-date" type="date" min={today} value={returnDate}
                        className="mt-3 w-full"
                        onChange={(e) => setReturnDate(clampYear(e.target.value))} />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('timeNote')}</p>
              </div>

              {/* Canlı toplam (display-only; sunucu re-price) */}
              {legCount >= 1 && vehicleId && route && (
                <div className="flex items-center justify-between rounded-md bg-muted/40 p-3 text-sm">
                  <span className="text-muted-foreground">{t('total')}</span>
                  <span className="font-semibold text-primary">€{fmtEur(totalEur)}</span>
                </div>
              )}

              {step1Attempted && !step1Valid && (
                <p className="text-sm text-destructive">
                  {!routeId || !vehicleId || legCount < 1 ? t('errors.tripRequired') : t('errors.datesRequired')}
                </p>
              )}

              {/* Devam — tek başına sağa hizalı (Step 1 Geri yok) */}
              <div className="flex justify-end">
                <Button type="button" onClick={goNext}>{t('nav.next')}</Button>
              </div>
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
              {capacityWarning && vehicle && (
                <p className="inline-flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />{t('capacityWarning', { capacity: vehicle.capacity })}
                </p>
              )}
            </div>
          ) : (
            // Adım 3 — özet + öde
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">{t('reviewHeading')}</h2>
              <div className="divide-y rounded-md border">
                <div className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="text-muted-foreground">{t('summaryRoute')}</span>
                  <span className="text-right text-foreground">{region.pickupLabel} ↔ {route?.label ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="text-muted-foreground">{t('summaryVehicle')}</span>
                  <span className="text-foreground">{vehicle?.label ?? '—'}</span>
                </div>
                {outbound && (
                  <div className="flex items-center justify-between gap-4 p-3 text-sm">
                    <span className="text-muted-foreground">{t('summaryOutbound')}</span>
                    <span className="text-foreground">{outboundDate || '—'}</span>
                  </div>
                )}
                {ret && (
                  <div className="flex items-center justify-between gap-4 p-3 text-sm">
                    <span className="text-muted-foreground">{t('summaryReturn')}</span>
                    <span className="text-foreground">{returnDate || '—'}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 p-3">
                  <span className="text-sm font-medium text-foreground">{t('summaryTotal')}</span>
                  <span className="text-base font-semibold text-primary">€{fmtEur(totalEur)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('payNote')}</p>
              {submitError && <p className="text-sm text-destructive">{t('submitError')}</p>}
            </div>
          )}
        </CardContent>

        {/* Step 1 Devam araç bloğunda; Step 2/3 burada Geri+Devam (sabit yükseklik) */}
        {step > 0 && (
          <CardContent className="flex min-h-[3rem] items-center justify-between border-t p-6 pt-4">
            <Button type="button" variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={submitting}>
              {t('nav.back')}
            </Button>
            <Button type="button" onClick={isLast ? handleSubmit : goNext} disabled={submitting}>
              {submitting ? t('nav.processing') : isLast ? t('nav.pay') : t('nav.next')}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
