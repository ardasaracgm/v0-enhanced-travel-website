'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'
import {
  Ship,
  ChevronLeft,
  User,
  CheckCircle,
  Lock,
  AlertCircle,
  MessageCircle,
  CalendarClock,
  ShieldCheck,
  Car,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import {
  useBooking,
  selectOutboundFerry,
  selectTotalPrice,
  type FerryBookingItem,
  type InsuranceBookingItem,
} from '@/lib/booking-context'
import type { InsuranceTariff } from '@/lib/insurs' // type-only (server-only guard tetiklenmez)
import { submitBooking } from '@/lib/actions/submit-booking'
import { assertNever } from '@/lib/trip-items/types'
import { summarizeItem } from '@/lib/trip-items/summary'
import type { Locale } from '@/lib/notifications/whatsapp-link'

export default function CheckoutPage() {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('checkout')
  const tIns = useTranslations('checkoutInsurance')
  const tExtras = useTranslations('extrasPage')
  const { state, dispatch } = useBooking()
  const outbound = selectOutboundFerry(state)
  // Car-only standalone (no ferry but a car item) → route nav links to the
  // car-rental flow instead of /ferry.
  const carOnly = !outbound && state.items.some((i) => i.type === 'car_rental')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [acceptTerms, setAcceptTerms] = React.useState(false)

  // Sigorta upsell (A1) — gerçek DOB'larla canlı quote.
  const outboundItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
  ) ?? null
  const returnItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return'
  ) ?? null
  const insuranceItem = state.items.find(
    (i): i is InsuranceBookingItem => i.type === 'insurance'
  ) ?? null
  const [insTariffs, setInsTariffs] = React.useState<InsuranceTariff[]>([])
  const [insLoading, setInsLoading] = React.useState(false)
  const [insFailed, setInsFailed] = React.useState(false)
  // Forced active choice (AB Madde 22): mount'ta hiçbiri seçili değil; kullanıcı
  // none/tier'den birini seçmeli. 'none' de geçerli aktif seçimdir.
  const [insuranceChoiceMade, setInsuranceChoiceMade] = React.useState(false)
  // Hydrate'le gelen tier de yapılmış seçim sayılır (back-navigation).
  const insuranceChosen = insuranceChoiceMade || !!insuranceItem
  // Sigorta SADECE quote yüklenirken VEYA tier'lar gösterilip henüz seçilmemişken
  // kilitler. insFailed (kart gizli) → kilitlemez (bypass; checkout kilitlenmesin).
  const insuranceBlocking =
    insLoading || (!insFailed && insTariffs.length > 0 && !insuranceChosen)

  // DOB içeriği değişince (sessionStorage hydration boş→dolu) effect'i yeniden
  // tetikler — length tek başına yetmez (SET_ITEMS/SET_PASSENGERS ayrı dispatch).
  const passengerDobKey = state.passengers.map((p) => p.birthDate ?? '').join(',')

  React.useEffect(() => {
    // Savunma: normal akışta her yolcunun birthDate'i dolu (passenger-details
    // Zod gate), ama eksikse quote'u hiç çalıştırma (insFailed=false → bölüm gizli).
    if (!outboundItem || state.passengers.length === 0) return
    if (!state.passengers.every((p) => p.birthDate)) return
    let cancelled = false
    setInsLoading(true)
    setInsFailed(false)
    fetch('/api/insurance/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateFrom: outboundItem.date,
        dateTo: returnItem?.date ?? outboundItem.date,
        touristCount: state.passengers.length,
        tourists: state.passengers.map((p) => ({ dateBirth: p.birthDate })),
      }),
    })
      .then((r) => { if (!r.ok) throw new Error('quote'); return r.json() })
      .then((d: { tariffs: InsuranceTariff[] }) => { if (!cancelled) setInsTariffs(d.tariffs) })
      .catch(() => { if (!cancelled) setInsFailed(true) })
      .finally(() => { if (!cancelled) setInsLoading(false) })
    return () => { cancelled = true }
  }, [outboundItem?.date, returnItem?.date, passengerDobKey])

  function handleInsuranceChange(value: string) {
    setInsuranceChoiceMade(true) // none de tier de geçerli aktif seçim
    if (value === 'none') { dispatch({ type: 'REMOVE_INSURANCE' }); return }
    const tariff = insTariffs.find((tf) => String(tf.tariffId) === value)
    if (!tariff || !outboundItem) return
    dispatch({
      type: 'SET_INSURANCE',
      payload: {
        tariffId: tariff.tariffId,
        tariffName: tariff.tariffName,
        coverageValue: tariff.coverageValue,
        touristCount: state.passengers.length,
        startDate: outboundItem.date,
        endDate: returnItem?.date ?? outboundItem.date,
        priceAmount: tariff.priceAmount, // display; server re-price eder
      },
    })
  }

  const handleConfirm = async () => {
    if (!acceptTerms || isProcessing || insuranceBlocking) return
    if (state.items.length === 0) return

    setIsProcessing(true)
    dispatch({ type: 'SET_SUBMIT_ERROR', payload: null })

    try {
      const result = await submitBooking({
        idempotencyKey: state.idempotencyKey,
        locale,
        // IDs/params only — submitBooking resolves every price server-side
        // (ferry/car from trusted sources, luggage via calculateLuggagePriceCents).
        // A1: insurance da payload'a girer; sunucu getInsuranceQuote ile re-price eder
        // (client priceAmount yok sayılır). Poliçe oluşturma add_contract Kademe B.
        items: state.items.map(item => {
          if (item.type === 'ferry') {
            return { type: 'ferry' as const, leg: item.leg, ferryId: item.ferryId, date: item.date }
          }
          if (item.type === 'car_rental') {
            return { type: 'car_rental' as const, carId: item.carId, days: item.days,
                     pickupAt: item.pickupAt, dropoffAt: item.dropoffAt }
          }
          if (item.type === 'luggage') {
            // client priceAmount was display-only; server recomputes.
            return { type: 'luggage' as const, counts: item.counts, dropOffDate: item.dropOffDate,
                     pickupDate: item.pickupDate, location: item.location }
          }
          if (item.type === 'insurance') {
            // priceAmount display-only; server getInsuranceQuote ile yeniden fiyatlar.
            return { type: 'insurance' as const, tariffId: item.tariffId, tariffName: item.tariffName,
                     touristCount: item.touristCount, priceAmount: item.priceAmount }
          }
          // Exhaustiveness: a new BookingItem type without a branch here fails
          // at compile time (item: never). No more silent "unknown = luggage".
          return assertNever(item, 'checkout booking item')
        }),
        passengerCount: state.searchParams.passengers,
        passengers: state.passengers.map((p, idx) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          birthDate: p.birthDate,
          passportNumber: p.passportNumber,
          passportExpiryDate: p.passportExpiryDate,
          nationality: p.nationality,
          licenseExpiry: p.licenseExpiry,
          isLead: idx === 0,
        })),
        contactEmail: state.contactEmail,
        contactPhone: state.contactPhone,
      })

      if (!result.ok) {
        const message = result.code === 'car_unavailable' ? t('error.carUnavailable') : result.error
        dispatch({ type: 'SET_SUBMIT_ERROR', payload: message })
        setIsProcessing(false)
        return
      }

      // Success — persist reference + payment link
      dispatch({ type: 'SET_BOOKING_REFERENCE', payload: result.reference })
      dispatch({ type: 'SET_PAYMENT_LINK', payload: result.paymentWhatsAppUrl })

      if (result.vivaRedirectUrl) {
        // Viva path: stash the redirect URL and hand off to Smart Checkout.
        // Keep isProcessing=true — page unmounts during navigation so there's
        // no spinner to clear and no way to double-submit.
        dispatch({ type: 'SET_VIVA_REDIRECT', payload: result.vivaRedirectUrl })
        window.location.assign(result.vivaRedirectUrl)
        return
      }

      // WhatsApp fallback: no Viva order — navigate to confirmation directly.
      router.push('/confirmation')
    } catch (err) {
      console.error('[checkout] submit threw:', err)
      dispatch({
        type: 'SET_SUBMIT_ERROR',
        payload: 'Unexpected error. Please try again or contact us on WhatsApp.',
      })
      setIsProcessing(false)
    }
  }

  // Guard: must have at least one item + one passenger/driver. Car-only
  // standalone has no ferry leg, so we no longer require `outbound` here —
  // the server (submitBooking) is the authority on ferry-leg validity.
  if (state.items.length === 0 || state.passengers.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Booking Incomplete</h2>
              <p className="text-muted-foreground mb-6">
                Please complete the previous steps before checkout.
              </p>
              <Link href={carOnly ? '/car-rental' : '/ferry'}>
                <Button>Start New Booking</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href={carOnly ? '/car-rental/driver' : '/ferry/passenger-details'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-lg font-semibold">Review & Confirm</h1>
                  <p className="text-sm text-primary-foreground/80">
                    Review your booking. Payment via WhatsApp after confirmation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Lock className="h-4 w-4" />
                <span>Secure booking</span>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps */}
        <section className="w-full py-4 border-b border-border/50 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-center gap-4 md:gap-8 text-xs md:text-sm">
              <Step done label={outbound ? 'Select Ferry' : 'Select Car'} />
              <Divider />
              <Step done label={outbound ? 'Passengers' : 'Driver'} />
              <Divider />
              <Step current label="Confirm" />
            </div>
          </div>
        </section>

        {/* Checkout Content */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Summary */}
              <div className="lg:col-span-2 space-y-6">
                {/* Booking Overview */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      {outbound ? <Ship className="h-5 w-5 text-primary" /> : <Car className="h-5 w-5 text-primary" />}
                      Your Trip
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Generic per-item rows (registry summary facet). Luggage
                        now appears here too — was previously only in the total. */}
                    {state.items.map((item, i) => {
                      const row = summarizeItem(item, locale)
                      return (
                        <div
                          key={i}
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/50 rounded-xl"
                        >
                          <div>
                            <p className="text-sm text-muted-foreground">{row.label}</p>
                            <p className="font-semibold text-foreground">{row.title}</p>
                            {row.detail && (
                              <p className="text-sm text-muted-foreground">{row.detail}</p>
                            )}
                            {item.type === 'car_rental' && (
                              <p className="text-xs text-muted-foreground mt-1">{tExtras('dailyRateNotice')}</p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-primary mt-2 md:mt-0">
                            €{row.amount}
                          </p>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* Passengers Summary */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <User className="h-5 w-5 text-primary" />
                      {outbound ? 'Passengers' : 'Driver'} ({state.passengers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {state.passengers.map((passenger, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-foreground">{passenger.firstName} {passenger.lastName}</p>
                            {outbound ? (
                              <p className="text-sm text-muted-foreground">
                                {passenger.nationality} · Passport: {passenger.passportNumber}
                              </p>
                            ) : (passenger.birthDate || passenger.licenseExpiry) ? (
                              <p className="text-sm text-muted-foreground">
                                {[
                                  passenger.birthDate && `DOB: ${passenger.birthDate}`,
                                  passenger.licenseExpiry && `Licence exp: ${passenger.licenseExpiry}`,
                                ].filter(Boolean).join(' · ')}
                              </p>
                            ) : null}
                          </div>
                          {index === 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Lead
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground">
                        Contact: {state.contactEmail} · {state.contactPhone}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Info — explains the WhatsApp-based flow */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <MessageCircle className="h-5 w-5 text-[#25D366]" />
                      Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl">
                      <p className="text-sm text-foreground leading-relaxed">
                        After confirming your booking, we&apos;ll send a secure payment link
                        on WhatsApp. {outbound ? 'Your seats are reserved' : 'Your car is reserved'} while
                        we coordinate payment. Online card payment (Viva Wallet) is launching soon.
                      </p>
                    </div>

                    <Separator />

                    {/* Terms & Conditions */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="terms" className="text-sm cursor-pointer">
                          I agree to the{' '}
                          <Link href="/terms" className="text-primary hover:underline">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link
                            href="/privacy"
                            className="text-primary hover:underline"
                          >
                            Privacy Policy
                          </Link>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By confirming this booking, you agree to the{' '}
                          {outbound ? 'ferry operator' : 'car rental supplier'}&apos;s terms and
                          TravelBeez&apos;s booking conditions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit error display */}
                {state.submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Booking could not be completed</AlertTitle>
                    <AlertDescription>{state.submitError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                  {/* Travel insurance upsell (A1) — opt-in boş başlar (AB Madde 22).
                      Hata olursa bölüm sessizce gizlenir; checkout kırılmaz. */}
                  {/* Insurance upsell is travel/ferry-only — hidden for car-only. */}
                  {outbound && !insFailed && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground leading-tight">{tIns('heading')}</h3>
                            <p className="text-xs text-muted-foreground">{tIns('subheading')}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground">
                          <CheckCircle className="h-3 w-3" /> {tIns('schengenBadge')}
                        </span>

                        {insLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-11 w-full" />
                            <Skeleton className="h-11 w-full" />
                            <Skeleton className="h-11 w-full" />
                          </div>
                        ) : (
                          <RadioGroup
                            value={insuranceItem ? String(insuranceItem.tariffId) : (insuranceChoiceMade ? 'none' : '')}
                            onValueChange={handleInsuranceChange}
                            className="space-y-2"
                          >
                            {/* Default: opt-in boş (AB Madde 22 — pre-tick yasak) */}
                            <label
                              htmlFor="ins-none"
                              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 cursor-pointer transition-all ${
                                !insuranceItem && insuranceChoiceMade ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                              }`}
                            >
                              <RadioGroupItem value="none" id="ins-none" />
                              <span className="text-sm text-foreground">{tIns('none')}</span>
                            </label>
                            {insTariffs.map((tariff) => {
                              const selected = insuranceItem?.tariffId === tariff.tariffId
                              return (
                                <label
                                  key={tariff.tariffId}
                                  htmlFor={`ins-${tariff.tariffId}`}
                                  className={`flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 cursor-pointer transition-all ${
                                    selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                                  }`}
                                >
                                  <span className="flex items-center gap-3 min-w-0">
                                    <RadioGroupItem value={String(tariff.tariffId)} id={`ins-${tariff.tariffId}`} />
                                    {/* coverageValue gösterilir; tariffName ("Standard") GÖSTERİLMEZ */}
                                    <span className="text-sm font-medium text-foreground">
                                      {tIns('coverLabel', { coverage: tariff.coverageValue.toLocaleString(locale) })}
                                    </span>
                                  </span>
                                  <span className="text-sm font-semibold text-primary whitespace-nowrap">€{tariff.priceAmount}</span>
                                </label>
                              )
                            })}
                          </RadioGroup>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">Order Summary</h3>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          {/* Generic breakdown — one line per item incl. luggage. */}
                          {state.items.map((item, i) => {
                            const row = summarizeItem(item, locale)
                            return (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{row.breakdownLabel}</span>
                                <span className="text-foreground">€{row.amount}</span>
                              </div>
                            )
                          })}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Booking Fee</span>
                            <span className="text-green-600">Free</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between text-lg font-bold">
                          <span className="text-foreground">Total</span>
                          <span className="text-primary">
                            €{selectTotalPrice(state)}
                          </span>
                        </div>

                        <Button
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12"
                          onClick={handleConfirm}
                          disabled={!acceptTerms || isProcessing || insuranceBlocking}
                        >
                          {isProcessing ? (
                            <>
                              <motion.div
                                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirm Booking
                            </>
                          )}
                        </Button>

                        {!acceptTerms && (
                          <p className="text-sm text-muted-foreground text-center">
                            Please accept the terms to continue
                          </p>
                        )}
                        {acceptTerms && insuranceBlocking && (
                          <p className="text-sm text-muted-foreground text-center">
                            {insLoading ? tIns('loadingWait') : tIns('chooseRequired')}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                        <TrustItem icon={CalendarClock} title="Flexible Date Change" desc={outbound ? 'Up to 48 hours before departure' : 'Up to 48 hours before pickup'} />
                        <TrustItem icon={MessageCircle} title="WhatsApp Support" desc="Talk to us anytime" />
                        <TrustItem icon={CheckCircle} title="Instant Confirmation" desc="Reference sent immediately" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function Step({ done, current, label }: { done?: boolean; current?: boolean; label: string }) {
  const circleClass = done
    ? 'bg-primary/20 text-primary'
    : current
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground'
  const labelClass = done || current ? 'text-primary font-medium' : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${circleClass}`}>
        {done ? <CheckCircle className="h-5 w-5" /> : current ? '3' : ''}
      </div>
      <span className={`text-sm ${labelClass}`}>{label}</span>
    </div>
  )
}

function Divider() {
  return <div className="w-8 md:w-12 h-0.5 bg-primary" />
}

function TrustItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-green-500 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
