'use client'

import * as React from 'react'
import Image from 'next/image'
import { Link, useRouter } from '@/i18n/routing'
import { Car, ChevronLeft, ArrowRight, CheckCircle, AlertCircle, Fuel, Users, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

import {
  useBooking,
  selectOutboundFerry,
  selectReturnFerry,
  selectCarRental,
  selectTotalPrice,
  type FerryBookingItem,
} from '@/lib/booking-context'
import { dateDiffInDays, type NormalizedCar } from '@/lib/normalize-car'

const DEFAULT_PICKUP_LOCATION = 'Kos Port'

interface ExtrasClientProps {
  cars: NormalizedCar[]
}

export default function ExtrasClient({ cars }: ExtrasClientProps) {
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const t = useTranslations('extrasPage')
  const [selectedCarId, setSelectedCarId] = React.useState<string | null>(null)
  const [oneWayDays, setOneWayDays] = React.useState(3)

  const outboundItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
  ) ?? null
  const returnItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return'
  ) ?? null

  const outbound = selectOutboundFerry(state)
  const returnF  = selectReturnFerry(state)

  // Redirect if the user lands here without an outbound ferry selected
  React.useEffect(() => {
    if (!outboundItem) {
      router.replace('/ferry/results')
    }
  }, [outboundItem, router])

  // Hydrate selection from context on mount (handles back-navigation)
  React.useEffect(() => {
    const existing = selectCarRental(state)
    if (existing) {
      setSelectedCarId(existing.carId)
      if (state.searchParams.tripType !== 'round-trip') {
        setOneWayDays(Math.max(1, existing.days))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!outboundItem || !outbound) return null

  const isRoundTrip = state.searchParams.tripType === 'round-trip'
  const days = isRoundTrip
    ? Math.max(1, dateDiffInDays(outboundItem.date, returnItem?.date ?? outboundItem.date))
    : Math.max(1, oneWayDays)

  function dispatchCarSelection(car: NormalizedCar, dayCount: number) {
    dispatch({
      type: 'SET_CAR_RENTAL',
      payload: {
        carId: car.id,
        model: car.model,
        pricePerDay: car.price,
        days: dayCount,
        pickupLocation: DEFAULT_PICKUP_LOCATION,
        dropoffLocation: DEFAULT_PICKUP_LOCATION,
        pickupAt: outboundItem!.date,
        dropoffAt: returnItem?.date ?? outboundItem!.date,
      },
    })
  }

  function handleSelectCar(car: NormalizedCar) {
    if (selectedCarId === car.id) {
      setSelectedCarId(null)
      dispatch({ type: 'SET_CAR_RENTAL', payload: null })
      return
    }
    setSelectedCarId(car.id)
    dispatchCarSelection(car, days)
  }

  function handleDaysChange(newDays: number) {
    setOneWayDays(newDays)
    if (selectedCarId) {
      const car = cars.find(c => c.id === selectedCarId)
      if (car) dispatchCarSelection(car, newDays)
    }
  }

  function handleContinue() {
    router.push('/ferry/passenger-details')
  }

  function handleSkip() {
    dispatch({ type: 'SET_CAR_RENTAL', payload: null })
    router.push('/ferry/passenger-details')
  }

  const selectedCar = cars.find(c => c.id === selectedCarId) ?? null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/ferry/results">
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
                    {state.searchParams.date} · {t('passengerCount', { count: state.searchParams.passengers })}
                    {isRoundTrip && ` · ${t('returnPrefix')} ${state.searchParams.returnDate}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-foreground/80">{t('totalPrice')}</p>
                <p className="text-2xl font-bold">€{selectTotalPrice(state)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Bar — 4 steps */}
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
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-primary">{t('steps.extras')}</span>
              </div>
              <div className="w-10 h-0.5 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.passengers')}</span>
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

        {/* Car Grid */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">

              {/* Left: heading + day selector + car cards */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">{t('heading')}</h2>
                  <p className="text-muted-foreground">
                    {t('subheading', { location: DEFAULT_PICKUP_LOCATION })}
                  </p>
                </div>

                {/* One-way day selector */}
                {!isRoundTrip && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{t('howManyDays')}</span>
                    <Select
                      value={String(oneWayDays)}
                      onValueChange={v => handleDaysChange(Number(v))}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 14 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {t('dayCount', { count: n })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Round-trip: computed days, read-only */}
                {isRoundTrip && returnItem && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('rentalDuration')}</span>
                    <span className="font-medium text-foreground">
                      {t('dayCount', { count: days })}
                      <span className="font-normal text-muted-foreground ml-1">
                        ({outboundItem.date} → {returnItem.date})
                      </span>
                    </span>
                  </div>
                )}

                {/* Empty state */}
                {cars.length === 0 && (
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">{t('noCarsTitle')}</h3>
                      <p className="text-muted-foreground mb-4">{t('noCarsBody')}</p>
                      <Button onClick={handleSkip} variant="outline">{t('continueWithoutCar')}</Button>
                    </CardContent>
                  </Card>
                )}

                {/* Car cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {cars.map((car, index) => {
                    const isSelected = selectedCarId === car.id
                    const lineTotal = car.price * days
                    return (
                      <motion.div
                        key={car.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Card
                          className={`bg-card border-2 transition-all cursor-pointer hover:shadow-lg ${
                            isSelected
                              ? 'border-primary shadow-lg'
                              : 'border-border/50 hover:border-primary/50'
                          }`}
                          onClick={() => handleSelectCar(car)}
                        >
                          <CardContent className="p-0">
                            <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                              <Image
                                src={car.image}
                                alt={car.model}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                              {car.badge && (
                                <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                                  {car.badge}
                                </Badge>
                              )}
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="p-4 space-y-3">
                              <div>
                                <p className="font-semibold text-foreground">{car.model}</p>
                                <p className="text-xs text-muted-foreground">{car.type}</p>
                              </div>

                              {/* Spec chips */}
                              <div className="flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground">
                                  <Fuel className="h-3 w-3" />
                                  {car.specs.fuel}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground">
                                  <Users className="h-3 w-3" />
                                  {t('seatCount', { count: Number(car.specs.seats) })}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground">
                                  <Settings className="h-3 w-3" />
                                  {car.specs.transmission}
                                </span>
                              </div>

                              {/* Pricing */}
                              <div className="flex items-end justify-between pt-1">
                                <div>
                                  <p className="text-xl font-bold text-primary">€{car.price}<span className="text-sm font-normal text-muted-foreground">{t('perDay')}</span></p>
                                  <p className="text-xs text-muted-foreground">
                                    {t('dayCount', { count: days })} = <span className="font-medium text-foreground">€{lineTotal}</span>
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={isSelected ? 'default' : 'outline'}
                                  className={isSelected ? 'bg-primary text-primary-foreground' : ''}
                                  onClick={e => { e.stopPropagation(); handleSelectCar(car) }}
                                >
                                  {isSelected ? (
                                    <><CheckCircle className="h-3.5 w-3.5 mr-1" />{t('added')}</>
                                  ) : (
                                    <><Car className="h-3.5 w-3.5 mr-1" />{t('add')}</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-bold text-foreground">{t('bookingSummary')}</h3>

                      {/* Ferry lines */}
                      <div className="p-3 bg-secondary/50 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">{t('outboundFerry')}</p>
                        <p className="font-medium text-foreground text-sm">{outbound.from} → {outbound.to}</p>
                        <p className="text-xs text-muted-foreground">{outbound.departureTime} · {outbound.operator}</p>
                      </div>

                      {returnF && (
                        <div className="p-3 bg-secondary/50 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">{t('returnFerry')}</p>
                          <p className="font-medium text-foreground text-sm">{returnF.from} → {returnF.to}</p>
                          <p className="text-xs text-muted-foreground">{returnF.departureTime} · {returnF.operator}</p>
                        </div>
                      )}

                      {/* Selected car */}
                      {selectedCar && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">{t('carRental')}</p>
                          <p className="font-medium text-foreground text-sm">{selectedCar.model}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('dayCount', { count: days })} · {DEFAULT_PICKUP_LOCATION}
                          </p>
                          <p className="text-primary text-sm font-semibold mt-1">€{selectedCar.price * days}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span className="text-foreground">{t('total')}</span>
                          <span className="text-primary">€{selectTotalPrice(state)}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleContinue}
                      >
                        {t('continueToPassengers')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full text-muted-foreground hover:text-foreground"
                        onClick={handleSkip}
                      >
                        {t('skipNoCar')}
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
