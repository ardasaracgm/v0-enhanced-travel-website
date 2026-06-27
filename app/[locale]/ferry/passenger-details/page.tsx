'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { Ship, ChevronLeft, ArrowRight, User, CheckCircle, Shield, AlertCircle, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { makePassengerFormSchema } from '@/lib/validation/booking'
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

import { BookingStepper } from '@/components/booking/stepper'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import {
  useBooking,
  selectOutboundFerry,
  selectReturnFerry,
  selectTotalPrice,
  type Passenger,
} from '@/lib/booking-context'
import { OrderSummaryItems, useRemoveBookingItem } from '@/components/booking/order-summary-items'
import type { ServiceTone } from '@/lib/service-theme'

// Servis tone→class — results/extras ile BİREBİR (app/ taranır, purge-safe;
// lib/'e class literal konmaz). Ferry detay kartları bu map'ten ferry-mavi alır.
const SUMMARY_TONE_BG: Record<ServiceTone, string> = {
  ferry: 'bg-blue-50',
  transfer: 'bg-green-50',
  car: 'bg-purple-50',
  luggage: 'bg-amber-50',
  none: 'bg-secondary',
}
const SUMMARY_TONE_BORDER: Record<ServiceTone, string> = {
  ferry: 'border-blue-400',
  transfer: 'border-green-400',
  car: 'border-purple-400',
  luggage: 'border-amber-400',
  none: 'border-transparent',
}

const nationalities = [
  'Turkey',
  'Germany',
  'United Kingdom',
  'Netherlands',
  'France',
  'Belgium',
  'Austria',
  'Switzerland',
  'Italy',
  'Spain',
  'Greece',
  'United States',
  'Other',
]

// Maps a Zod schema field name → the error-key suffix the JSX reads.
// Identity for most; only the two passport fields differ.
const FIELD_TO_KEY: Record<string, string> = {
  firstName: 'firstName',
  lastName: 'lastName',
  gender: 'gender',
  birthDate: 'birthDate',
  passportNumber: 'passport',
  passportExpiryDate: 'passportExpiry',
  nationality: 'nationality',
}

// Zod issue path → the flat error-state key the JSX reads.
//   ['passengers', 0, 'firstName'] → 'passenger-0-firstName'
//   ['contactEmail']               → 'contactEmail'
function pathToErrorKey(path: (string | number)[]): string | null {
  if (path[0] === 'passengers' && typeof path[1] === 'number') {
    const suffix = FIELD_TO_KEY[String(path[2])]
    return suffix ? `passenger-${path[1]}-${suffix}` : null
  }
  if (path[0] === 'contactEmail') return 'contactEmail'
  if (path[0] === 'contactPhone') return 'contactPhone'
  return null
}

export default function PassengerDetailsPage() {
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const t = useTranslations('passengerDetails')
  // Date input ceilings: bound the year to 4 digits (native date inputs allow 6).
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
  const outbound = selectOutboundFerry(state)
  const returnF = selectReturnFerry(state)
  // The return ferry BookingItem (not just the FerryTrip) — needed to remove
  // it via the shared remove logic (CLEAR_RETURN_FERRY + one-way reset).
  const returnFerryItem = state.items.find(i => i.type === 'ferry' && i.leg === 'return')
  const removeItem = useRemoveBookingItem()
  // YYYY-MM-DD travel dates for the validation factory. `|| undefined` so an
  // empty searchParams.date degrades to a "valid through today" floor rather
  // than ''-lenient (see makePassengerSchema). Age banding is server-side.
  const outboundDate = state.searchParams.date || undefined
  const returnDate = state.searchParams.returnDate || undefined
  const [passengers, setPassengers] = React.useState<Passenger[]>([])
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    // Initialize passenger forms based on number of passengers
    const initialPassengers: Passenger[] = Array.from(
      { length: state.searchParams.passengers },
      () => ({
        firstName: '',
        lastName: '',
        gender: '',
        birthDate: '',
        passportNumber: '',
        passportExpiryDate: '',
        nationality: '',
      })
    )
    setPassengers(initialPassengers)
  }, [state.searchParams.passengers])

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers]
    updated[index] = { ...updated[index], [field]: value }
    setPassengers(updated)
  }

  const validateForm = () => {
    const schema = makePassengerFormSchema({ outboundDate, returnDate })
    const result = schema.safeParse({ passengers, contactEmail, contactPhone })

    if (result.success) {
      setErrors({})
      return true
    }

    const newErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = pathToErrorKey(issue.path)
      // First issue per field wins; issue.message is an i18n fragment
      // like 'firstName.required' → resolved under passengerDetails.errors.
      if (key && !newErrors[key]) {
        newErrors[key] = t(`errors.${issue.message}`)
      }
    }
    setErrors(newErrors)
    return false
  }

  const handleContinue = () => {
    if (validateForm()) {
      dispatch({ type: 'SET_PASSENGERS', payload: passengers })
      dispatch({ type: 'SET_CONTACT', payload: { email: contactEmail, phone: contactPhone } })
      router.push('/checkout')
    }
  }

  if (!outbound) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">{t('noFerry.title')}</h2>
              <p className="text-muted-foreground mb-6">{t('noFerry.body')}</p>
              <Link href="/ferry">
                <Button>{t('noFerry.cta')}</Button>
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
        {/* Header Bar — foto banner (desktop) / mavi gradient (mobil), beyaz metin.
            results/page.tsx ile birebir görsel dil; içerik passenger-details'e özgü. */}
        <section className="relative w-full overflow-hidden bg-gradient-to-r from-blue-950 to-blue-800 py-6 text-white">
          {/* Görsel yalnız desktop; mobilde alt gradient görünür. bg-right → odak sağda. */}
          <div
            className="absolute inset-0 hidden bg-cover bg-right md:block"
            style={{ backgroundImage: "url('/services/ferry-results-banner.webp')" }}
          />
          {/* Okunabilirlik perdesi — soldan koyu, sağa şeffaf (görsel sağda kalır). */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-blue-950/85 via-blue-950/50 to-transparent md:block" />
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <Link href="/ferry/extras">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{t('eyebrow')}</p>
                  <div className="flex flex-wrap items-center gap-2 text-2xl font-bold md:text-3xl">
                    <span>{outbound.from.name}</span>
                    <ArrowRight className="h-5 w-5 text-amber-300" />
                    <span>{outbound.to.name}</span>
                    {returnF && (
                      <>
                        <ArrowRight className="h-5 w-5 text-amber-300" />
                        <span>{returnF.to.name}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-white/80">
                    {state.searchParams.date} · {outbound.departureTime} - {outbound.arrivalTime}
                  </p>
                </div>
              </div>
              <div className="rounded-3xl bg-white/15 px-6 py-4 backdrop-blur-md md:min-w-[180px]">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{t('totalPrice')}</p>
                <p className="text-3xl font-bold">€{selectTotalPrice(state)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps */}
        <BookingStepper flow="ferry" current="passengers" />

        {/* Passenger Forms */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Forms */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t('heading')}</h2>
                  <p className="text-muted-foreground">{t('subheading')}</p>
                </div>
                
                {passengers.map((passenger, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-card border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-lg">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          {t('passengerNumber', { number: index + 1 })}{index === 0 ? ` ${t('leadPassenger')}` : ''}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Row 1 — First + Last name */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`firstName-${index}`}>{t('labels.firstName')} *</Label>
                            <Input
                              id={`firstName-${index}`}
                              placeholder={t('placeholders.firstName')}
                              value={passenger.firstName}
                              onChange={(e) => updatePassenger(index, 'firstName', e.target.value)}
                              className={errors[`passenger-${index}-firstName`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-firstName`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-firstName`]}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`lastName-${index}`}>{t('labels.lastName')} *</Label>
                            <Input
                              id={`lastName-${index}`}
                              placeholder={t('placeholders.lastName')}
                              value={passenger.lastName}
                              onChange={(e) => updatePassenger(index, 'lastName', e.target.value)}
                              className={errors[`passenger-${index}-lastName`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-lastName`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-lastName`]}</p>
                            )}
                          </div>
                        </div>
                        {/* Row 2 — Date of Birth + Gender */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`birthDate-${index}`}>{t('labels.birthDate')} *</Label>
                            <Input
                              id={`birthDate-${index}`}
                              type="date"
                              min="1900-01-01"
                              max={todayAthens}
                              value={passenger.birthDate}
                              onChange={(e) => updatePassenger(index, 'birthDate', e.target.value)}
                              className={errors[`passenger-${index}-birthDate`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-birthDate`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-birthDate`]}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`gender-${index}`}>{t('labels.gender')} *</Label>
                            <Select
                              value={passenger.gender}
                              onValueChange={(value) => updatePassenger(index, 'gender', value)}
                            >
                              <SelectTrigger
                                id={`gender-${index}`}
                                className={errors[`passenger-${index}-gender`] ? 'border-destructive' : ''}
                              >
                                <SelectValue placeholder={t('labels.genderPlaceholder')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">{t('labels.genderMale')}</SelectItem>
                                <SelectItem value="female">{t('labels.genderFemale')}</SelectItem>
                                <SelectItem value="unspecified">{t('labels.genderUnspecified')}</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors[`passenger-${index}-gender`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-gender`]}</p>
                            )}
                          </div>
                        </div>
                        {/* Row 3 — Passport Number + Passport Expiry (optional) */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`passport-${index}`}>{t('labels.passportNumber')} *</Label>
                            <Input
                              id={`passport-${index}`}
                              placeholder={t('placeholders.passport')}
                              value={passenger.passportNumber}
                              onChange={(e) => updatePassenger(index, 'passportNumber', e.target.value)}
                              className={errors[`passenger-${index}-passport`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-passport`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-passport`]}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`passportExpiry-${index}`}>{t('labels.passportExpiry')}</Label>
                            <Input
                              id={`passportExpiry-${index}`}
                              type="date"
                              max="2099-12-31"
                              value={passenger.passportExpiryDate ?? ''}
                              onChange={(e) => updatePassenger(index, 'passportExpiryDate', e.target.value)}
                              className={errors[`passenger-${index}-passportExpiry`] ? 'border-destructive' : ''}
                            />
                            {errors[`passenger-${index}-passportExpiry`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-passportExpiry`]}</p>
                            )}
                          </div>
                        </div>
                        {/* Row 4 — Nationality */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`nationality-${index}`}>{t('labels.nationality')} *</Label>
                            <Select
                              value={passenger.nationality}
                              onValueChange={(value) => updatePassenger(index, 'nationality', value)}
                            >
                              <SelectTrigger className={errors[`passenger-${index}-nationality`] ? 'border-destructive' : ''}>
                                <SelectValue placeholder={t('labels.nationalityPlaceholder')} />
                              </SelectTrigger>
                              <SelectContent>
                                {nationalities.map((nat) => (
                                  <SelectItem key={nat} value={nat}>{t(`nationalities.${nat}`)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`passenger-${index}-nationality`] && (
                              <p className="text-sm text-destructive">{errors[`passenger-${index}-nationality`]}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: passengers.length * 0.1 }}
                >
                  <Card className="bg-card border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        {t('contact.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {t('contact.subtitle')}
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactEmail">{t('contact.email')} *</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            placeholder={t('placeholders.email')}
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className={errors['contactEmail'] ? 'border-destructive' : ''}
                          />
                          {errors['contactEmail'] && (
                            <p className="text-sm text-destructive">{errors['contactEmail']}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPhone">{t('contact.phone')} *</Label>
                          <Input
                            id="contactPhone"
                            type="tel"
                            placeholder={t('placeholders.phone')}
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className={errors['contactPhone'] ? 'border-destructive' : ''}
                          />
                          {errors['contactPhone'] && (
                            <p className="text-sm text-destructive">{errors['contactPhone']}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">{t('summary.title')}</h3>
                      
                      <div className="space-y-4">
                        <div className={`p-4 rounded-xl border-l-2 ${SUMMARY_TONE_BG.ferry} ${SUMMARY_TONE_BORDER.ferry}`}>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Ship className="h-4 w-4" />
                            <span>{t('summary.outbound')}</span>
                          </div>
                          <p className="font-semibold text-foreground">{outbound.from.name} → {outbound.to.name}</p>
                          <p className="text-sm text-muted-foreground">{state.searchParams.date}</p>
                          <p className="text-sm text-muted-foreground">{outbound.departureTime} - {outbound.arrivalTime}</p>
                          <p className="text-sm text-muted-foreground">{outbound.operator}</p>
                        </div>
                        
                        {returnF && (
                          <div className={`p-4 rounded-xl border-l-2 ${SUMMARY_TONE_BG.ferry} ${SUMMARY_TONE_BORDER.ferry}`}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Ship className="h-4 w-4" />
                                <span>{t('summary.return')}</span>
                              </div>
                              {returnFerryItem && (
                                <button
                                  type="button"
                                  aria-label="Remove return ferry"
                                  onClick={() => removeItem(returnFerryItem)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <p className="font-semibold text-foreground">{returnF.from.name} → {returnF.to.name}</p>
                            <p className="text-sm text-muted-foreground">{state.searchParams.returnDate}</p>
                            <p className="text-sm text-muted-foreground">{returnF.departureTime} - {returnF.arrivalTime}</p>
                            <p className="text-sm text-muted-foreground">{returnF.operator}</p>
                          </div>
                        )}
                        
                        <div className="pt-4 border-t border-border/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('summary.passengers')}</span>
                            <span className="text-foreground">{state.searchParams.passengers}</span>
                          </div>
                          {/* Per-item breakdown (transfer / luggage / car / insurance)
                              with remove. Ferry shown as detail cards above. */}
                          <OrderSummaryItems includeFerry={false} />
                          <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-border/50">
                            <span className="text-foreground">{t('summary.total')}</span>
                            <span className="text-primary">€{selectTotalPrice(state)}</span>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={handleContinue}
                        >
                          {t('summary.continue')}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{t('trust.secureBooking')}</p>
                            <p className="text-xs text-muted-foreground">{t('trust.ssl')}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{t('trust.instantConfirmation')}</p>
                            <p className="text-xs text-muted-foreground">{t('trust.ticketsEmail')}</p>
                          </div>
                        </div>
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
