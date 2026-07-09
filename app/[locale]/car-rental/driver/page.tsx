'use client'

import * as React from 'react'
import Image from 'next/image'
import { Link, useRouter } from '@/i18n/routing'
import { Car, ChevronLeft, ArrowRight, User, Shield, AlertCircle, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'

import { makeDriverSchema, contactSchema } from '@/lib/validation/booking'
import { buildCar2WhatsAppLink } from '@/lib/car2-contact'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getCompanionPrefillContext,
  getCompanionForDriverPrefill,
  type CompanionOption,
} from '@/lib/actions/companion-prefill'

import { BookingStepper } from '@/components/booking/stepper'
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
  const locale = useLocale()
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
  const [companions, setCompanions] = React.useState<CompanionOption[]>([])
  // The companion this form is currently filled from ('' = typed by hand).
  const [assignment, setAssignment] = React.useState('')
  const [licenseWarning, setLicenseWarning] = React.useState(false)

  // Signed-in owners: load their saved people (name-only) + contact defaults. A
  // server action reads the cookie session, so no browser auth client is needed;
  // a guest gets signedIn:false, keeps an empty list, and sees no selector at all.
  // Contact fields fill only if still empty, so a late response can't clobber typing.
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
    return () => {
      cancelled = true
    }
  }, [])

  // Fill the whole form from a saved person. Names are already uppercased at the
  // Hub boundary, so nothing is transformed here. A licence that expires before
  // drop-off is NOT copied in — the field stays empty and the block warns, the
  // same shape as the ferry step's expired-passport rule.
  const handlePrefill = async (companionId: string) => {
    const data = await getCompanionForDriverPrefill(companionId)
    if (!data) return
    const expired =
      !!data.licenseExpiry && !!car?.dropoffAt && data.licenseExpiry < car.dropoffAt
    setFirstName(data.firstName)
    setLastName(data.lastName)
    setBirthDate(data.birthDate)
    setLicenseExpiry(expired ? '' : data.licenseExpiry)
    setLicenseWarning(expired)
    setAssignment(companionId)
  }

  // Manual edit while the form holds a companion's data. Editing WHO the driver is
  // (name / birth date) detaches: the other identity fields are cleared so a typed
  // name can never end up carrying someone else's licence. Editing the licence
  // expiry does NOT detach — that is the very correction the expired-licence
  // warning asks for, and it belongs to the same person.
  const updateDriver = (field: 'firstName' | 'lastName' | 'birthDate', value: string) => {
    if (assignment) {
      setFirstName(field === 'firstName' ? value : '')
      setLastName(field === 'lastName' ? value : '')
      setBirthDate(field === 'birthDate' ? value : '')
      setLicenseExpiry('')
      setAssignment('')
      setLicenseWarning(false)
      return
    }
    if (field === 'firstName') setFirstName(value)
    else if (field === 'lastName') setLastName(value)
    else setBirthDate(value)
  }

  const updateLicenseExpiry = (value: string) => {
    setLicenseExpiry(value)
    if (value) setLicenseWarning(false)
  }
  // Car image derived from the convention (/cars/<modelKey>.webp); no payload
  // change. Falls back to a neutral shot if the file 404s or modelKey is absent.
  const [imgError, setImgError] = React.useState(false)

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
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md mx-auto rounded-3xl border-border/50 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-7 w-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-blue-950 mb-2">{t('noCar.title')}</h2>
              <p className="text-muted-foreground mb-6">{t('noCar.body')}</p>
              <Link href="/car-rental">
                <Button className="rounded-full">{t('noCar.cta')}</Button>
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
        {/* Context header — car2 idiom: white bg, amber eyebrow, blue-950 title.
            Functional (not a marketing hero): no background image, stays compact. */}
        <section className="w-full border-b border-border/50 bg-white py-5">
          <div className="container px-4 md:px-6">
            <Link
              href="/car-rental"
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-blue-950 hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('noCar.cta')}
            </Link>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-blue-950">
                  <Car className="h-4 w-4" />
                  {t('eyebrow')}
                </span>
                <h1 className="text-3xl font-bold text-blue-950 md:text-4xl">{car.model}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {car.pickupAt} → {car.dropoffAt}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-muted-foreground">{t('total')}</p>
                <p className="text-3xl font-bold text-primary">€{selectTotalPrice(state)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps — 3 steps (Select Car / Driver / Confirm) */}
        <BookingStepper flow="car" current="driver" />

        {/* Driver form + summary */}
        <section className="w-full py-6 md:py-8">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Form */}
              <div className="lg:col-span-2 space-y-5">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <Card className="rounded-3xl border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg text-blue-950">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-amber-600" />
                        </div>
                        {t('driverTitle')}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{t('subheading')}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Guests have no companions → no selector, form unchanged. */}
                      {companions.length > 0 && (
                        <div className="space-y-2 md:max-w-xs">
                          <Label htmlFor="companion">{tp('companionPrefill.label')}</Label>
                          <Select value={assignment} onValueChange={handlePrefill}>
                            <SelectTrigger id="companion">
                              <SelectValue placeholder={tp('companionPrefill.placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {companions.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.isSelf ? tp('companionPrefill.self') : c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {licenseWarning && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>{t('companionLicenseWarning')}</span>
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">{tp('labels.firstName')} *</Label>
                          <Input
                            id="firstName"
                            placeholder={tp('placeholders.firstName')}
                            value={firstName}
                            onChange={(e) => updateDriver('firstName', e.target.value)}
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
                            onChange={(e) => updateDriver('lastName', e.target.value)}
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
                            onChange={(e) => updateDriver('birthDate', e.target.value)}
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
                            onChange={(e) => updateLicenseExpiry(e.target.value)}
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
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                  <Card className="rounded-3xl border-border/50 bg-blue-50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg text-blue-950">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        {tp('contact.title')}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{tp('contact.subtitle')}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                  <Card className="overflow-hidden rounded-3xl border-border/50 shadow-sm">
                    {/* Car image — derived from /cars/<modelKey>.webp convention */}
                    <div className="relative h-40 bg-gradient-to-br from-muted to-muted/50">
                      <Image
                        src={imgError || !car.modelKey ? '/cars/koscar.webp' : `/cars/${car.modelKey}.webp`}
                        alt={car.model}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover"
                        onError={() => setImgError(true)}
                      />
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-blue-950 mb-6">{t('summaryTitle')}</h3>
                      <div className="p-4 bg-secondary/50 rounded-2xl mb-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Car className="h-4 w-4 text-primary" />
                          <span>{t('rentalLabel')}</span>
                        </div>
                        <p className="font-semibold text-blue-950">{car.model}</p>
                        <p className="text-sm text-muted-foreground">{car.pickupAt} → {car.dropoffAt}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('dayCount', { count: car.days })} × €{car.pricePerDay}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-border/50">
                        <span className="text-blue-950">{t('total')}</span>
                        <span className="text-primary">€{selectTotalPrice(state)}</span>
                      </div>
                      <Button
                        className="w-full mt-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleContinue}
                      >
                        {t('continue')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      <a
                        href={buildCar2WhatsAppLink(locale)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block"
                      >
                        <Button className="w-full rounded-full bg-[#25D366] text-white hover:bg-[#25D366]/90">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {t('whatsappHelp')}
                        </Button>
                      </a>
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
