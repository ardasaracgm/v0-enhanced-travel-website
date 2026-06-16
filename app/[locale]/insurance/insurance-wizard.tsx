'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { todayAthensISO } from '@/lib/validation/dates'
import { INSURANCE_DATE_RE, MAX_TRAVELLERS, insuranceStep1Schema } from '@/lib/validation/insurance'
import type { InsuranceTariff } from '@/lib/insurs' // type-only (server-only guard tetiklenmez)

// 3-adımlı wizard: 1) tarih+teminat (B2 ✓), 2) yolcular (B3), 3) özet+öde (B4).
const TOTAL_STEPS = 3
const STEP_KEYS = ['dates', 'travellers', 'review'] as const

// Native date input 6 haneli yıl kabul eder → ilk 4'e kes (visa clampYear deseni).
function clampYear(v: string): string {
  const m = /^(\d+)-(\d{2})-(\d{2})$/.exec(v)
  return m && m[1].length > 4 ? `${m[1].slice(0, 4)}-${m[2]}-${m[3]}` : v
}

export function InsuranceWizard() {
  const t = useTranslations('insurance')
  const locale = useLocale()
  const today = todayAthensISO()

  const [step, setStep] = React.useState(0)

  // Adım 1 alanları
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [travellers, setTravellers] = React.useState(1)
  const [coverageId, setCoverageId] = React.useState<number | null>(null)

  // Canlı quote (tahmini — DOB yok; gerçek DOB ile re-quote B3'te)
  const [tariffs, setTariffs] = React.useState<InsuranceTariff[]>([])
  const [quoteLoading, setQuoteLoading] = React.useState(false)
  const [quoteFailed, setQuoteFailed] = React.useState(false)
  const [step1Attempted, setStep1Attempted] = React.useState(false)

  const datesValid =
    INSURANCE_DATE_RE.test(dateFrom) && INSURANCE_DATE_RE.test(dateTo) && dateFrom <= dateTo

  // Tarih/sayı değişiminde tahmini fiyat çek (checkout deseni: cancel flag, debounce yok).
  React.useEffect(() => {
    if (!datesValid) { setTariffs([]); return }
    let cancelled = false
    setQuoteLoading(true)
    setQuoteFailed(false)
    fetch('/api/insurance/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom, dateTo, touristCount: travellers }), // DOB YOK → tahmin
    })
      .then((r) => { if (!r.ok) throw new Error('quote'); return r.json() })
      .then((d: { tariffs: InsuranceTariff[] }) => { if (!cancelled) setTariffs(d.tariffs) })
      .catch(() => { if (!cancelled) { setQuoteFailed(true); setTariffs([]) } })
      .finally(() => { if (!cancelled) setQuoteLoading(false) })
    return () => { cancelled = true }
  }, [dateFrom, dateTo, travellers, datesValid])

  const step1Parsed = insuranceStep1Schema.safeParse({
    dateFrom, dateTo, travellers, coverageId: coverageId ?? undefined,
  })
  // Şema şekli geçerli + seçilen teminat canlı tarifede mevcut.
  const step1Valid = step1Parsed.success && tariffs.some((tf) => tf.coverageId === coverageId)
  const isLast = step === TOTAL_STEPS - 1

  const goNext = () => {
    if (step === 0) {
      setStep1Attempted(true)
      if (!step1Valid) return
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
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
              {/* Tarihler */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ins-date-from">{t('labels.dateFrom')} *</Label>
                  <Input
                    id="ins-date-from" type="date" min={today} value={dateFrom}
                    onChange={(e) => setDateFrom(clampYear(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ins-date-to">{t('labels.dateTo')} *</Label>
                  <Input
                    id="ins-date-to" type="date" min={dateFrom || today} value={dateTo}
                    onChange={(e) => setDateTo(clampYear(e.target.value))}
                  />
                </div>
              </div>

              {/* Yolcu sayısı (1-9) */}
              <div className="space-y-2">
                <Label htmlFor="ins-travellers">{t('labels.travellers')} *</Label>
                <Select value={String(travellers)} onValueChange={(v) => setTravellers(Number(v))}>
                  <SelectTrigger id="ins-travellers" className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Teminat + tahmini fiyat */}
              <div className="space-y-2">
                <Label>{t('coverageHeading')} *</Label>
                {!datesValid ? (
                  <p className="text-sm text-muted-foreground">{t('pickDates')}</p>
                ) : quoteLoading ? (
                  <p className="text-sm text-muted-foreground">{t('quoteLoading')}</p>
                ) : quoteFailed ? (
                  <p className="text-sm text-destructive">{t('quoteFailed')}</p>
                ) : (
                  <RadioGroup
                    value={coverageId != null ? String(coverageId) : ''}
                    onValueChange={(v) => setCoverageId(Number(v))}
                    className="space-y-2"
                  >
                    {tariffs.map((tf) => {
                      const selected = tf.coverageId === coverageId
                      return (
                        <Label
                          key={tf.coverageId}
                          htmlFor={`ins-cov-${tf.coverageId}`}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 ${
                            selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <RadioGroupItem value={String(tf.coverageId)} id={`ins-cov-${tf.coverageId}`} />
                            <span className="text-sm text-foreground">
                              {t('coverageLabel', { coverage: tf.coverageValue.toLocaleString(locale) })}
                            </span>
                          </span>
                          <span className="whitespace-nowrap text-sm font-semibold text-primary">
                            {t('estimatedPrice', { price: tf.priceAmount.toLocaleString(locale) })}
                          </span>
                        </Label>
                      )
                    })}
                  </RadioGroup>
                )}
                <p className="text-xs text-muted-foreground">{t('estimateNote')}</p>
              </div>

              {step1Attempted && !step1Valid && (
                <p className="text-sm text-destructive">
                  {!datesValid ? t('errors.datesRequired') : t('errors.coverageRequired')}
                </p>
              )}
            </>
          ) : (
            // Adım 2-3 gövdeleri B3/B4'te gelecek.
            <p className="text-sm text-muted-foreground">{t('stepPlaceholder')}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          {t('nav.back')}
        </Button>
        <Button type="button" onClick={goNext} disabled={isLast}>
          {isLast ? t('nav.pay') : t('nav.next')}
        </Button>
      </div>
    </div>
  )
}
