'use client'

import * as React from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Luggage, Info, X, CheckCircle, ShieldCheck, Lock, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { DateRangeField } from '@/components/ferry/date-range-field'

import { LUGGAGE_RATES_EUR, type LuggageCounts } from '@/lib/luggage-rates'
import { luggageVisual } from '@/lib/service-theme'
import { dateDiffInDays } from '@/lib/normalize-car'
import { todayAthensISO } from '@/lib/validation/dates'
import { submitLuggageOrder } from '@/lib/actions/submit-luggage-order'
import { getOrCreateLuggageOrderKey, clearLuggageOrderKey } from '@/lib/luggage/order-key'
import type { Locale } from '@/lib/notifications/whatsapp-link'

// UI'da gösterilen boyutlar — 'bag' enum'u kasıtlı dışarıda (small'a eşit, gizli).
const LUGGAGE_SIZES = ['small', 'medium', 'large'] as const
type LuggageDisplaySize = (typeof LUGGAGE_SIZES)[number]

export interface LuggagePrefill {
  dropOffDate?: string
  pickupDate?: string
}

export function LuggageClient({ prefill }: { prefill: LuggagePrefill | null }) {
  const locale = useLocale() as Locale
  const t = useTranslations('luggagePage')
  const today = todayAthensISO()

  // Prefill'i geçmiş-tarih guard'ıyla al: bugünün altındaki tarih yok sayılır.
  const [dropOffDate, setDropOffDate] = React.useState(
    prefill?.dropOffDate && prefill.dropOffDate >= today ? prefill.dropOffDate : '',
  )
  const [pickupDate, setPickupDate] = React.useState(
    prefill?.pickupDate && prefill.pickupDate >= today ? prefill.pickupDate : '',
  )

  const [counts, setCounts] = React.useState<LuggageCounts>({ small: 0, medium: 0, large: 0 })
  const [sizeTipOpen, setSizeTipOpen] = React.useState(false)

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')

  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [paymentLink, setPaymentLink] = React.useState<string | null>(null)

  // Türetilenler — gün hesabı calculateLuggageTotalCents ile BİREBİR (aynı gün = 1 gün).
  const totalPieces = LUGGAGE_SIZES.reduce((s, z) => s + counts[z], 0)
  const validRange = !!dropOffDate && !!pickupDate && dateDiffInDays(dropOffDate, pickupDate) >= 0
  const days = validRange ? dateDiffInDays(dropOffDate, pickupDate) + 1 : 0
  const perDayEur = LUGGAGE_SIZES.reduce((s, z) => s + counts[z] * LUGGAGE_RATES_EUR[z], 0)
  const totalEur = perDayEur * days
  const thumbSrc = luggageVisual(LUGGAGE_SIZES.filter((z) => counts[z] > 0)) ?? '/services/luggage-sizes.webp'

  const contactValid =
    !!firstName.trim() && !!lastName.trim() && /.+@.+\..+/.test(email) && phone.trim().length >= 6
  const canPay = totalPieces >= 1 && validRange && contactValid && !submitting

  // Chip = 0→1→…→5→0 döngü (extras handleCycleLuggageSize, cart dispatch YOK).
  function cycleSize(size: LuggageDisplaySize) {
    setCounts((c) => ({ ...c, [size]: (c[size] + 1) % 6 }))
  }
  function resetSize(size: LuggageDisplaySize) {
    setCounts((c) => ({ ...c, [size]: 0 }))
  }

  async function handleSubmit() {
    if (!canPay) return
    setSubmitting(true)
    setSubmitError(false)
    try {
      const res = await submitLuggageOrder({
        idempotencyKey: getOrCreateLuggageOrderKey(),
        locale,
        counts,
        dropOffDate,
        pickupDate,
        customer: { firstName, lastName, email, phone },
      })
      if (res.ok) {
        clearLuggageOrderKey() // tamamlandı → sonraki satış taze key
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

  // ----- Başarı (WhatsApp fallback) kartı — insurance-wizard deseni -----
  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <div className="container px-4 py-16 md:px-6">
            <Card className="mx-auto max-w-2xl border-primary/30">
              <CardContent className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">{t('success.title')}</h3>
                <p className="text-muted-foreground">{t('success.body')}</p>
                {paymentLink && (
                  <Button asChild className="mt-2">
                    <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {t('success.whatsappCta')}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
        <FloatingWhatsApp />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full bg-white py-12 md:py-16">
          <div className="container px-4 md:px-6">
            {/* car2 başlık — amber eyebrow + blue-950 başlık */}
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-600">{t('eyebrow')}</p>
              <h1 className="mb-3 text-3xl font-bold text-blue-950 md:text-4xl">{t('title')}</h1>
              <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
            </div>

            <div className="mx-auto max-w-2xl space-y-6">
              {/* VALİZ KARTI — extras saf çekirdeği (görsel + ölçüler + 3'lü seçici + toplam) */}
              <Card className="overflow-hidden border-2 border-border/50 bg-amber-50/60">
                <CardContent className="space-y-4 p-5">
                  <div className="flex min-h-[4rem] items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Luggage className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold leading-tight text-foreground">{t('luggage.heading')}</h2>
                        <p className="text-xs text-muted-foreground">{t('luggage.subheading')}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                        {t('total')}: <span className="text-lg font-bold text-blue-950">€{totalEur}</span>
                      </span>
                      {/* Boyut rehberi — (i) hover(desktop)/tap(mobil); İngilizce hardcode (extras ile aynı), fiyat YOK */}
                      <Popover open={sizeTipOpen} onOpenChange={setSizeTipOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Luggage size guide"
                            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setSizeTipOpen(true) }}
                            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setSizeTipOpen(false) }}
                            className="shrink-0 text-sky-600 transition-colors hover:text-primary"
                          >
                            <Info className="h-5 w-5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="left" align="start" className="w-auto max-w-sm p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                          <div className="divide-y divide-border text-xs">
                            <div className="px-3 py-2 font-medium text-foreground">Size guide</div>
                            <div className="px-3 py-2">
                              <p className="font-semibold text-foreground">Small (S)</p>
                              <p className="text-muted-foreground">Cabin bag · 55×40×25 cm · Backpack, carry-on</p>
                            </div>
                            <div className="px-3 py-2">
                              <p className="font-semibold text-foreground">Medium (M)</p>
                              <p className="text-muted-foreground">Checked bag · 70×45×30 cm · 4–7 day suitcase</p>
                            </div>
                            <div className="px-3 py-2">
                              <p className="font-semibold text-foreground">Large (L)</p>
                              <p className="text-muted-foreground">Large checked · 80×55×35+ cm · Family / long-trip case</p>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Ölçü bilgisi — cm evrensel (i18n yok), ad mevcut key */}
                  <div className="flex min-h-[3.5rem] flex-col justify-center gap-0.5 text-xs">
                    {LUGGAGE_SIZES.map((size, i) => (
                      <div key={size} className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{t(`luggage.size.${size}`)}</span>
                        <span className="text-muted-foreground">
                          {['55×40×25 cm', '70×45×30 cm', '80×55×35+ cm'][i]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Görsel — seçime göre thumbnail, yoksa karışık sizes fallback */}
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-white/70">
                    <Image src={thumbSrc} alt="Luggage storage" fill sizes="(max-width: 768px) 100vw, 50vw" quality={90} className="object-cover" />
                  </div>

                  {/* 3'lü grid (Küçük|Orta|Büyük) — tık=+1 döngü; ×N rozet; köşe × = 0'a sıfırla */}
                  <div className="grid grid-cols-3 gap-3">
                    {LUGGAGE_SIZES.map((size) => {
                      const count = counts[size]
                      const selected = count >= 1
                      return (
                        <div key={size} className="relative">
                          {count >= 1 && (
                            <button
                              type="button"
                              aria-label={t('luggage.removeAria')}
                              onClick={(e) => { e.stopPropagation(); resetSize(size) }}
                              className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => cycleSize(size)}
                            className={`flex w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-xl border-2 px-2 py-2.5 transition-all ${
                              selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                            }`}
                          >
                            <span className="text-sm font-medium leading-tight text-foreground">{t(`luggage.size.${size}`)}</span>
                            <span className="whitespace-nowrap text-xs font-semibold text-primary">
                              €{LUGGAGE_RATES_EUR[size]}<span className="font-normal text-muted-foreground">{t('perDay')}</span>
                            </span>
                            {count >= 1 && (
                              <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                                ×{count}
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* TARİH — YENİ tek fark: kullanıcı bırakma→alma günü girer (extras'ta feribottandı) */}
              <Card className="border-border/50">
                <CardContent className="space-y-2 p-5">
                  <Label className="text-blue-950">{t('dateLabel')}</Label>
                  <DateRangeField
                    mode="range"
                    date={dropOffDate}
                    returnDate={pickupDate}
                    onDateChange={setDropOffDate}
                    onReturnDateChange={setPickupDate}
                    minDate={today}
                    locale={locale}
                    placeholder={t('datePlaceholder')}
                    triggerClassName="h-11 rounded-xl"
                  />
                  {validRange && (
                    <p className="text-sm text-muted-foreground">{t('dayCount', { count: days })}</p>
                  )}
                </CardContent>
              </Card>

              {/* İLETİŞİM — ad/soyad/email/telefon (pasaport YOK) */}
              <Card className="border-border/50">
                <CardContent className="space-y-4 p-5">
                  <h3 className="text-lg font-bold text-blue-950">{t('contact.heading')}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="lug-firstName">{t('contact.firstName')}</Label>
                      <Input id="lug-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lug-lastName">{t('contact.lastName')}</Label>
                      <Input id="lug-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lug-email">{t('contact.email')}</Label>
                      <Input id="lug-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lug-phone">{t('contact.phone')}</Label>
                      <Input id="lug-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
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
                  {submitError && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t('error.submit')}</p>
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
                  {!submitting && totalPieces < 1 && (
                    <p className="text-center text-sm text-muted-foreground">{t('hint.addPiece')}</p>
                  )}
                  {!submitting && totalPieces >= 1 && !validRange && (
                    <p className="text-center text-sm text-muted-foreground">{t('hint.pickDates')}</p>
                  )}
                  {!submitting && totalPieces >= 1 && validRange && !contactValid && (
                    <p className="text-center text-sm text-muted-foreground">{t('hint.fillContact')}</p>
                  )}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" /> {t('secureNote')}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
