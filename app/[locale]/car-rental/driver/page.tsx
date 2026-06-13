'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { Car, ChevronLeft, ArrowRight, User, Shield, CheckCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { makeDriverSchema, contactSchema } from '@/lib/validation/booking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import {
  useBooking,
  selectCarRental,
  selectTotalPrice,
  type Passenger,
} from '@/lib/booking-context'

export default function CarRentalDriverPage() {
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const t = useTranslations('carRentalDriver')
  const tp = useTranslations('passengerDetails')   // shared field labels + error fragments
  const car = selectCarRental(state)
  // Date input ceilings: bound the year to 4 digits (native date inputs allow 6).
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [birthDate, setBirthDate] = React.useState('')
  const [licenseExpiry, setLicenseExpiry] = React.useState('')
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  function validate(): boolean {
    const driver = makeDriverSchema({ dropoffAt: car?.dropoffAt }).safeParse({
      firstName, lastName, birthDate, licenseExpiry,
    })
    const contact = contactSchema.safeParse({ contactEmail, contactPhone })
    const next: Record<string, string> = {}
    if (!driver.success) {
      for (const issue of driver.error.issues) {
        const key = String(issue.path[0])               // firstName | lastName | birthDate
        if (key && !next[key]) next[key] = tp(`errors.${issue.message}`)
      }
    }
    if (!contact.success) {
      for (const issue of contact.error.issues) {
        const key = String(issue.path[0])               // contactEmail | contactPhone
        if (key && !next[key]) next[key] = tp(`errors.${issue.message}`)
      }
    }
    setErrors(next)
    return driver.success && contact.success
  }

  function handleContinue() {
    if (!validate()) return
    const driver: Passenger = {
      firstName,
      lastName,
      gender: '',
      birthDate,
      passportNumber: '',
      passportExpiryDate: '',
      nationality: '',
      licenseExpiry,
    }
    dispatch({ type: 'SET_PASSENGERS', payload: [driver] })
    dispatch({ type: 'SET_CONTACT', payload: { email: contactEmail, phone: contactPhone } })
    dispatch({ type: 'SET_SEARCH_PARAMS', payload: { passengers: 1, tripType: 'one-way' } })
    router.push('/checkout')
  }

  // No car selected (e.g. direct navigation) — guide back to the fleet.
  if (!car) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">{t('noCar.title')}</h2>
              <p className="text-muted-foreground mb-6">{t('noCar.body')}</p>
              <Link href="/car-rental">
                <Button>{t('noCar.cta')}</Button>
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
                <Link href="/car-rental">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Car className="h-5 w-5" />
                    <span>{car.model}</span>
                  </div>
                  <p className="text-sm text-primary-foreground/80">
                    {car.pickupAt} → {car.dropoffAt}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-foreground/80">{t('total')}</p>
                <p className="text-2xl font-bold">€{selectTotalPrice(state)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps — 3 steps (Select Car / Driver / Payment) */}
        <section className="w-full py-4 border-b border-border/50 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.selectCar')}</span>
              </div>
              <div className="w-10 h-0.5 bg-primary" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                <span className="text-sm font-medium text-primary">{t('steps.driver')}</span>
              </div>
              <div className="w-10 h-0.5 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">3</div>
                <span className="text-sm text-muted-foreground">{t('steps.payment')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Driver form + summary */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{t('heading')}</h2>
                  <p className="text-muted-foreground">{t('subheading')}</p>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        {t('driverTitle')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">{tp('labels.firstName')} *</Label>
                          <Input
                            id="firstName"
                            placeholder={tp('placeholders.firstName')}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={errors.firstName ? 'border-destructive' : ''}
                          />
                          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">{tp('labels.lastName')} *</Label>
                          <Input
                            id="lastName"
                            placeholder={tp('placeholders.lastName')}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={errors.lastName ? 'border-destructive' : ''}
                          />
                          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="birthDate">{tp('labels.birthDate')} *</Label>
                          <Input
                            id="birthDate"
                            type="date"
                            min="1900-01-01"
                            max={todayAthens}
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className={errors.birthDate ? 'border-destructive' : ''}
                          />
                          {errors.birthDate
                            ? <p className="text-sm text-destructive">{errors.birthDate}</p>
                            : <p className="text-xs text-muted-foreground">{t('minAgeHint')}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="licenseExpiry">{t('licenseLabel')} *</Label>
                          <Input
                            id="licenseExpiry"
                            type="date"
                            min={todayAthens}
                            max="2099-12-31"
                            value={licenseExpiry}
                            onChange={(e) => setLicenseExpiry(e.target.value)}
                            className={errors.licenseExpiry ? 'border-destructive' : ''}
                          />
                          {errors.licenseExpiry
                            ? <p className="text-sm text-destructive">{errors.licenseExpiry}</p>
                            : <p className="text-xs text-muted-foreground">{t('licenseHint')}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Contact */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="bg-card border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        {tp('contact.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{tp('contact.subtitle')}</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactEmail">{tp('contact.email')} *</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            placeholder={tp('placeholders.email')}
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className={errors.contactEmail ? 'border-destructive' : ''}
                          />
                          {errors.contactEmail && <p className="text-sm text-destructive">{errors.contactEmail}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPhone">{tp('contact.phone')} *</Label>
                          <Input
                            id="contactPhone"
                            type="tel"
                            placeholder={tp('placeholders.phone')}
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className={errors.contactPhone ? 'border-destructive' : ''}
                          />
                          {errors.contactPhone && <p className="text-sm text-destructive">{errors.contactPhone}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">{t('summaryTitle')}</h3>
                      <div className="p-4 bg-secondary/50 rounded-xl mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Car className="h-4 w-4" />
                          <span>{t('rentalLabel')}</span>
                        </div>
                        <p className="font-semibold text-foreground">{car.model}</p>
                        <p className="text-sm text-muted-foreground">{car.pickupAt} → {car.dropoffAt}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('dayCount', { count: car.days })} × €{car.pricePerDay}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-border/50">
                        <span className="text-foreground">{t('total')}</span>
                        <span className="text-primary">€{selectTotalPrice(state)}</span>
                      </div>
                      <Button
                        className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleContinue}
                      >
                        {t('continue')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
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
