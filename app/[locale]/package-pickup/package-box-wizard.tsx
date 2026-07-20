'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CheckCircle, ShieldCheck, Lock, MessageCircle, Minus, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DateRangeField } from '@/components/ferry/date-range-field'

import {
  PACKAGE_BOX_RATES_EUR,
  PACKAGE_BOX_SIZES,
  PACKAGE_BOX_DIMS,
  PACKAGE_BOX_MIN_MONTHS,
  PACKAGE_BOX_MAX_MONTHS,
  packageBoxFreeMonths,
  type PackageBoxSize,
} from '@/lib/package-box-rates'
import { todayAthensISO } from '@/lib/validation/dates'
import { submitPackageBoxOrder } from '@/lib/actions/submit-package-box-order'
import { getOrCreatePackageBoxOrderKey, clearPackageBoxOrderKey } from '@/lib/package-box/order-key'
import type { Locale } from '@/lib/notifications/whatsapp-link'

export function PackageBoxWizard() {
  const locale = useLocale() as Locale
  const t = useTranslations('packagePickupPage.reserve')
  const today = todayAthensISO()

  const [size, setSize] = React.useState<PackageBoxSize | null>(null)
  const [months, setMonths] = React.useState(1)
  const [startDate, setStartDate] = React.useState('')
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [errorCode, setErrorCode] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const [paymentLink, setPaymentLink] = React.useState<string | null>(null)

  const setMonthsClamped = (n: number) =>
    setMonths(
      Math.min(
        PACKAGE_BOX_MAX_MONTHS,
        Math.max(PACKAGE_BOX_MIN_MONTHS, Number.isFinite(n) ? n : PACKAGE_BOX_MIN_MONTHS),
      ),
    )

  // Client görüntü fiyatı — SUNUCU re-price eder (resolvePackageBoxItem otoritedir).
  const freeMonths = packageBoxFreeMonths(months)
  const billableMonths = months - freeMonths
  const rate = size ? PACKAGE_BOX_RATES_EUR[size] : 0
  const totalEur = billableMonths * rate

  const contactValid =
    !!firstName.trim() && !!lastName.trim() && /.+@.+\..+/.test(email) && phone.trim().length >= 6
  const canPay = !!size && !!startDate && startDate >= today && contactValid && !submitting

  async function handleSubmit() {
    if (!canPay || !size) return
    setSubmitting(true)
    setErrorCode(null)
    try {
      const res = await submitPackageBoxOrder({
        idempotencyKey: getOrCreatePackageBoxOrderKey(),
        locale,
        size,
        months,
        startDate,
        customer: { firstName, lastName, email, phone },
      })
      if (res.ok) {
        clearPackageBoxOrderKey() // tamamlandı → sonraki satış taze key
        if (res.redirectUrl) {
          window.location.assign(res.redirectUrl) // Viva Smart Checkout (sayfa unmount)
          return
        }
        setPaymentLink(res.paymentWhatsAppUrl) // Viva yok → WhatsApp fallback
        setDone(true)
      } else {
        // Sayfa gece yarısını geçip client `today` bayatlarsa submit past_date
        // döner → görünür özel mesaj + tarihi temizle (kullanıcı yeniden seçsin).
        setErrorCode(res.error)
        if (res.error === 'past_date') setStartDate('')
      }
    } catch {
      setErrorCode('unknown')
    } finally {
      setSubmitting(false)
    }
  }

  // ----- Başarı (WhatsApp fallback) kartı — ÖDEME YAPILMADI, metin bunu netler -----
  if (done) {
    return (
      <Card className="mx-auto max-w-2xl border-primary/30">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{t('successTitle')}</h3>
          <p className="text-muted-foreground">{t('successBody')}</p>
          {paymentLink && (
            <Button asChild className="mt-2">
              <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('successWhatsapp')}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* BOYUT — tek seçim, 5 kutu */}
      <Card className="border-border/50">
        <CardContent className="space-y-3 p-5">
          <Label className="text-blue-950">{t('sizeLabel')}</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PACKAGE_BOX_SIZES.map((s) => {
              const selected = size === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                    selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-bold uppercase text-foreground">{s}</span>
                  <span className="text-[11px] text-muted-foreground">{PACKAGE_BOX_DIMS[s]}</span>
                  <span className="text-xs font-semibold text-primary">
                    €{PACKAGE_BOX_RATES_EUR[s]}
                    <span className="font-normal text-muted-foreground">{t('perMonthShort')}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* SÜRE — ay stepper */}
      <Card className="border-border/50">
        <CardContent className="space-y-2 p-5">
          <Label className="text-blue-950">{t('monthsLabel')}</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="−"
              onClick={() => setMonthsClamped(months - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:border-primary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={months}
              onChange={(e) => setMonthsClamped(parseInt(e.target.value.replace(/\D/g, ''), 10))}
              className="h-10 w-16 rounded-lg border border-border text-center text-lg font-semibold"
            />
            <button
              type="button"
              aria-label="+"
              onClick={() => setMonthsClamped(months + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:border-primary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {freeMonths > 0 && (
            <p className="text-sm font-medium text-primary">
              {t('freeHint', { free: freeMonths, billable: billableMonths })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* BAŞLANGIÇ TARİHİ — tek tarih (returnDate/onReturnDateChange single'da kullanılmaz ama zorunlu prop) */}
      <Card className="border-border/50">
        <CardContent className="space-y-2 p-5">
          <Label className="text-blue-950">{t('startLabel')}</Label>
          <DateRangeField
            mode="single"
            date={startDate}
            returnDate=""
            onDateChange={setStartDate}
            onReturnDateChange={() => {}}
            minDate={today}
            locale={locale}
            placeholder={t('startPlaceholder')}
            triggerClassName="h-11 rounded-xl"
          />
        </CardContent>
      </Card>

      {/* İLETİŞİM */}
      <Card className="border-border/50">
        <CardContent className="space-y-4 p-5">
          <h3 className="text-lg font-bold text-blue-950">{t('contactHeading')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pb-firstName">{t('firstName')}</Label>
              <Input id="pb-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-lastName">{t('lastName')}</Label>
              <Input id="pb-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-email">{t('email')}</Label>
              <Input id="pb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-phone">{t('phone')}</Label>
              <Input id="pb-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOPLAM + ÖDE */}
      <Card className="border-border/50">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between text-lg font-bold">
            <span className="text-blue-950">{t('total')}</span>
            <span className="text-primary">€{totalEur}</span>
          </div>
          <Separator />
          {errorCode && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorCode === 'past_date' ? t('errorPastDate') : t('errorSubmit')}
            </p>
          )}
          <Button
            className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={!canPay}
          >
            {submitting ? (
              <>
                <motion.div
                  className="mr-2 h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                {t('processing')}
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                {t('payButton')}
              </>
            )}
          </Button>
          {/* Disabled ipuçları — neden kapalı */}
          {!submitting && !size && (
            <p className="text-center text-sm text-muted-foreground">{t('hintPickSize')}</p>
          )}
          {!submitting && !!size && !startDate && (
            <p className="text-center text-sm text-muted-foreground">{t('hintPickDate')}</p>
          )}
          {!submitting && !!size && !!startDate && !contactValid && (
            <p className="text-center text-sm text-muted-foreground">{t('hintFillContact')}</p>
          )}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t('secureNote')}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
