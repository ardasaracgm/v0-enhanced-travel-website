'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { Ship, ChevronLeft, ArrowRight, User, CheckCircle, Shield, AlertCircle } from 'lucide-react'
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
  const outbound = selectOutboundFerry(state)
  const returnF = selectReturnFerry(state)
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
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/ferry/extras">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span>{outbound.from}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{outbound.to}</span>
                  </div>
                  <p className="text-sm text-primary-foreground/80">
                    {state.searchParams.date} · {outbound.departureTime} - {outbound.arrivalTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-primary-foreground/80">{t('totalPrice')}</p>
                  <p className="text-2xl font-bold">€{selectTotalPrice(state)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps */}
        <section className="w-full py-4 border-b border-border/50 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.selectFerry')}</span>
              </div>
              <div className="w-10 h-0.5 bg-primary" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.extras')}</span>
              </div>
              <div className="w-10 h-0.5 bg-primary" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm font-medium text-primary">{t('steps.passengers')}</span>
              </div>
              <div className="w-10 h-0.5 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.payment')}</span>
              </div>
            </div>
          </div>
        </section>

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
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">{t('summary.title')}</h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-secondary/50 rounded-xl">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Ship className="h-4 w-4" />
                            <span>{t('summary.outbound')}</span>
                          </div>
                          <p className="font-semibold text-foreground">{outbound.from} → {outbound.to}</p>
                          <p className="text-sm text-muted-foreground">{state.searchParams.date}</p>
                          <p className="text-sm text-muted-foreground">{outbound.departureTime} - {outbound.arrivalTime}</p>
                          <p className="text-sm text-muted-foreground">{outbound.operator}</p>
                        </div>
                        
                        {returnF && (
                          <div className="p-4 bg-secondary/50 rounded-xl">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Ship className="h-4 w-4" />
                              <span>{t('summary.return')}</span>
                            </div>
                            <p className="font-semibold text-foreground">{returnF.from} → {returnF.to}</p>
                            <p className="text-sm text-muted-foreground">{state.searchParams.returnDate}</p>
                            <p className="text-sm text-muted-foreground">{returnF.departureTime} - {returnF.arrivalTime}</p>
                            <p className="text-sm text-muted-foreground">{returnF.operator}</p>
                          </div>
                        )}
                        
                        <div className="pt-4 border-t border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground">{t('summary.passengers')}</span>
                            <span className="text-foreground">{state.searchParams.passengers}</span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-muted-foreground">{t('summary.ferryTickets')}</span>
                            <span className="text-foreground">€{selectTotalPrice(state)}</span>
                          </div>
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
