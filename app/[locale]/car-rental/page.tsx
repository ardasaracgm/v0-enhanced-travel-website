'use client'

import * as React from 'react'
import Image from 'next/image'
import { Car, MapPin, CheckCircle, Star, Shield, Fuel, Users, Settings, Zap, AlertCircle, CarIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CarCardSkeleton, EmptyState } from '@/components/ui/skeleton'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import { WhatsAppCTA } from '@/components/islandbee/whatsapp-cta'
import { TrustIndicators, SecurePaymentBanner } from '@/components/islandbee/trust-indicators'
import { getAvailableCars } from '@/lib/supabase'
import { normalizeCar, dateDiffInDays, type NormalizedCar } from '@/lib/normalize-car'
import { useBooking } from '@/lib/booking-context'
import { checkCarAvailability } from '@/lib/actions/car-availability-action'

const DEFAULT_PICKUP_LOCATION = 'Kos Port'

// Fallback data in case database is empty or unavailable
const fallbackCarFleet = [
  { 
    id: 'fallback-1',
    type: 'City Car', 
    model: 'Citroen Ami', 
    price: 19, 
    image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&q=80', 
    features: ['Electric', '2 Seats', 'Auto'],
    specs: { fuel: 'Electric', seats: 2, transmission: 'Automatic', ac: true },
    badge: 'Eco-Friendly',
    description: 'Perfect for couples exploring Kos Town. 100% electric, easy to park, and fun to drive along the coast.',
    available: true,
  },
  { 
    id: 'fallback-2',
    type: 'Economy', 
    model: 'Fiat Panda', 
    price: 25, 
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80', 
    features: ['Petrol', '4 Seats', 'Manual'],
    specs: { fuel: 'Petrol', seats: 4, transmission: 'Manual', ac: true },
    badge: 'Most Popular',
    description: 'Our most popular choice for families. Reliable, fuel-efficient, and perfect for island exploration.',
    available: true,
  },
  { 
    id: 'fallback-3',
    type: 'Compact', 
    model: 'DFSK 500', 
    price: 29, 
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80', 
    features: ['Petrol', '5 Seats', 'Manual'],
    specs: { fuel: 'Petrol', seats: 5, transmission: 'Manual', ac: true },
    badge: 'Best Value',
    description: 'Spacious and comfortable for families or groups. Great luggage space for longer stays.',
    available: true,
  },
]

// Titles/descriptions resolved via t() under carRentalPage.{key}Title/Desc.
const benefits = [
  { icon: <MapPin className="h-6 w-6" />, key: 'benefit1' },
  { icon: <Shield className="h-6 w-6" />, key: 'benefit2' },
  { icon: <Fuel className="h-6 w-6" />, key: 'benefit3' },
  { icon: <Star className="h-6 w-6" />, key: 'benefit4' },
]

// FAQ content lives in i18n (carRentalPage.faq{n}Q / faq{n}A).
const FAQ_COUNT = 6

export default function CarRentalPage() {
  const t = useTranslations('carRentalPage')
  const [cars, setCars] = React.useState<NormalizedCar[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [usingFallback, setUsingFallback] = React.useState(false)
  const [fallbackReason, setFallbackReason] = React.useState<string>('')
  const [pickupDate, setPickupDate] = React.useState('')
  const [dropoffDate, setDropoffDate] = React.useState('')
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
  const router = useRouter()
  const { dispatch } = useBooking()
  const [availability, setAvailability] = React.useState<Record<string, number> | null>(null)
  const [availLoading, setAvailLoading] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  // Rental period — inclusive day count (pickup→dropoff), matching the rest of
  // the app (server clamp + resolver use days where dropoffAt = pickup + days-1).
  // validRange requires dropoff on/after pickup; same-day (dateDiff 0) is a
  // legit 1-day rental, so the floor is >= 0 (never mask a negative as 1 day).
  const datesChosen = !!pickupDate && !!dropoffDate
  const validRange = datesChosen && dateDiffInDays(pickupDate, dropoffDate) >= 0
  const rentalDays = validRange ? dateDiffInDays(pickupDate, dropoffDate) + 1 : 0

  // Dates changed → any prior availability is stale; force a fresh "Ara" before
  // a car can be selected (closes the stale-map hole).
  React.useEffect(() => {
    setAvailability(null)
  }, [pickupDate, dropoffDate])

  async function handleSearch() {
    if (!validRange) { setSearchError(t('selectDatesFirst')); return }
    setSearchError(null)
    setAvailLoading(true)
    const res = await checkCarAvailability(pickupDate, rentalDays)
    setAvailability(res.ok ? res.availability : null)
    setAvailLoading(false)
  }

  // Real DB cars only — fallback fleet ids aren't in `cars`, so booking them
  // would silently drop the item server-side. Fallback keeps the WhatsApp path.
  function handleSelect(car: NormalizedCar) {
    if (!validRange) { setSearchError(t('selectDatesFirst')); return }
    dispatch({
      type: 'SET_CAR_RENTAL',
      payload: {
        carId: car.id,
        model: car.model,
        pricePerDay: car.price,
        days: rentalDays,
        pickupLocation: DEFAULT_PICKUP_LOCATION,
        dropoffLocation: DEFAULT_PICKUP_LOCATION,
        pickupAt: pickupDate,
        dropoffAt: dropoffDate,
      },
    })
    router.push('/car-rental/driver')
  }

  React.useEffect(() => {
    async function fetchCars() {
      setLoading(true)
      setError(null)
      setUsingFallback(false)
      
      const { data, error: fetchError, isEmpty } = await getAvailableCars()
      
      if (fetchError) {
        setError(fetchError.message)
        setCars(fallbackCarFleet.map(normalizeCar) as NormalizedCar[])
        setUsingFallback(true)
        setFallbackReason(`Database error: ${fetchError.message}`)
      } else if (isEmpty || !data || data.length === 0) {
        setCars(fallbackCarFleet.map(normalizeCar) as NormalizedCar[])
        setUsingFallback(true)
        setFallbackReason('No cars found in database. Showing default fleet.')
      } else {
        // Normalize all cars from Supabase
        setCars(data.map(normalizeCar))
      }
      setLoading(false)
    }

    fetchCars()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80"
              alt={t('heroImageAlt')}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
          </div>
          <div className="container relative px-4 md:px-6">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6"
              >
                <Car className="h-4 w-4" />
                {t('heroBadge')}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance"
              >
                {t('title')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-lg md:text-xl mb-8 text-pretty"
              >
                {t('subtitle')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 text-sm text-white/80"
              >
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>{t(`${benefit.key}Title`)}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <section className="w-full py-12 md:py-16 -mt-8 relative z-10">
          <div className="container px-4 md:px-6">
            <Card className="border-0 shadow-2xl bg-card">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">{t('searchTitle')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('pickupLocationLabel')}</label>
                    <Select defaultValue="port">
                      <SelectTrigger>
                        <SelectValue placeholder={t('locationPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="port">{t('locationPort')}</SelectItem>
                        <SelectItem value="airport">{t('locationAirport')}</SelectItem>
                        <SelectItem value="hotel">{t('locationHotel')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('pickupDateLabel')}</label>
                    <Input type="date" className="h-10" min={todayAthens} max={dropoffDate || undefined} value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('returnDateLabel')}</label>
                    <Input type="date" className="h-10" min={pickupDate || todayAthens} value={dropoffDate} onChange={e => setDropoffDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('driverAgeLabel')}</label>
                    <Select defaultValue="25+">
                      <SelectTrigger>
                        <SelectValue placeholder={t('agePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="21-24">{t('age2124')}</SelectItem>
                        <SelectItem value="25+">{t('age25plus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">&nbsp;</label>
                    <Button onClick={handleSearch} disabled={availLoading} className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground">
                      {t('searchButton')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {searchError && <p className="mt-3 text-sm text-destructive">{searchError}</p>}
          </div>
        </section>

        {/* Car Fleet */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('fleetTitle')}</h2>
              <p className="text-muted-foreground text-lg">{t('fleetSubtitle')}</p>
            </div>
            
            {usingFallback && !error && process.env.NODE_ENV === 'development' && (
              <Alert className="mb-8 max-w-2xl mx-auto border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {fallbackReason}
                </AlertDescription>
              </Alert>
            )}
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <CarCardSkeleton key={i} />
                ))}
              </div>
            ) : cars.length === 0 ? (
              <EmptyState
                icon={<CarIcon className="h-8 w-8 text-muted-foreground" />}
                title={t('emptyTitle')}
                description={t('emptyDesc')}
                action={
                  <a href="https://wa.me/302242050008" target="_blank" rel="noopener noreferrer">
                    <Button>{t('emptyCta')}</Button>
                  </a>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {cars.map((car, index) => (
                  <motion.div
                    key={car.id || car.model}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card border-border/50 h-full">
                      <CardContent className="p-0 flex flex-col h-full">
                        <div className="relative h-56 bg-gradient-to-br from-muted to-muted/50">
                          <Image
                            src={car.image}
                            alt={car.model}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                              {car.type}
                            </span>
                            {car.badge && (
                              <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                                {car.badge}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="font-bold text-2xl text-foreground mb-2">{car.model}</h3>
                          <p className="text-muted-foreground text-sm mb-4">{car.description}</p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Fuel className="h-4 w-4 text-primary" />
                              <span>{car.specs?.fuel || 'Petrol'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Users className="h-4 w-4 text-primary" />
                              <span>{t('seatsLabel', { count: car.specs?.seats || 4 })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Settings className="h-4 w-4 text-primary" />
                              <span>{car.specs?.transmission || 'Manual'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <Zap className="h-4 w-4 text-primary" />
                              <span>{t('acLabel')}</span>
                            </div>
                          </div>

                          <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                            <div>
                              <span className="text-3xl font-bold text-primary">&euro;{car.price}</span>
                              <span className="text-muted-foreground text-sm">{t('perDay')}</span>
                            </div>
                            {usingFallback ? (
                              <a href="https://wa.me/302242050008" target="_blank" rel="noopener noreferrer">
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">{t('selectButton')}</Button>
                              </a>
                            ) : (
                              <Button
                                onClick={() => handleSelect(car)}
                                disabled={!validRange || availability == null || (availability[car.id] ?? 0) === 0}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                {availability != null && availability[car.id] === 0 ? t('unavailableButton') : t('selectButton')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* Included Features */}
            <div className="mt-12 p-6 bg-card rounded-2xl border border-border/50">
              <h3 className="font-semibold text-foreground text-center mb-6">{t('includeTitle')}</h3>
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <div key={n} className="flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>{t(`include${n}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <TrustIndicators />

        {/* Why Rent With Us */}
        <section className="w-full py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{t('whyRentTitle')}</h2>
                <div className="space-y-6">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl h-fit">
                        {React.cloneElement(benefit.icon, { className: 'h-6 w-6 text-primary' })}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{t(`${benefit.key}Title`)}</h3>
                        <p className="text-muted-foreground">{t(`${benefit.key}Desc`)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative h-[400px] rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
                  alt={t('exploreImageAlt')}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white text-lg font-semibold">{t('exploreTitle')}</p>
                  <p className="text-white/80 text-sm">{t('exploreDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t('faqTitle')}</h2>
                <p className="text-muted-foreground text-lg">{t('faqSubtitle')}</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n) => (
                  <AccordionItem key={n} value={`item-${n}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {t(`faq${n}Q`)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {t(`faq${n}A`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <SecurePaymentBanner />
        
        <WhatsAppCTA
          title={t('ctaTitle')}
          description={t('ctaDescription')}
        />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
