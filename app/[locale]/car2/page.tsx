'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { Car2Hero } from '@/components/car2/car2-hero'
import { Car2TrustBar } from '@/components/car2/car2-trust-bar'
import { Car2FleetGrid } from '@/components/car2/car2-fleet-grid'
import { Car2Included } from '@/components/car2/car2-included'
import { Car2WhyUs } from '@/components/car2/car2-why-us'
import { Car2Destinations } from '@/components/car2/car2-destinations'
import { Car2Faq } from '@/components/car2/car2-faq'
import { Car2Cta } from '@/components/car2/car2-cta'
import { Car2FloatingWhatsApp } from '@/components/car2/car2-floating-whatsapp'
import { getAvailableCars } from '@/lib/supabase'
import { normalizeCar, groupByModelKey, dateDiffInDays, type NormalizedCar } from '@/lib/normalize-car'
import { useBooking } from '@/lib/booking-context'

const PICKUP_LOCATION = 'Kos Port'

// car2 — rebuilt car-rental surface. Unlinked preview route. The hero search is
// a "seed": pressing it pushes its dates to every fleet card (via seedNonce) and
// scrolls to the fleet. Each card then owns its dates + availability on its own.
export default function Car2Page() {
  const t = useTranslations('car2')
  const locale = useLocale()
  const router = useRouter()
  const { dispatch } = useBooking()
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const [seedPickup, setSeedPickup] = React.useState('')
  const [seedDropoff, setSeedDropoff] = React.useState('')
  const [seedNonce, setSeedNonce] = React.useState(0)
  const [driverAge, setDriverAge] = React.useState('25+')
  const [searchError, setSearchError] = React.useState<string | null>(null)

  const [cars, setCars] = React.useState<NormalizedCar[]>([])
  const [loading, setLoading] = React.useState(true)

  const seedValid = !!seedPickup && !!seedDropoff && dateDiffInDays(seedPickup, seedDropoff) >= 0

  // Hero carousel card → scroll to that model's grid card (fallback: the grid
  // section). Pure DOM navigation, no selection/booking.
  function handleHeroCardClick(modelKey: string) {
    const el = document.getElementById(`car-${modelKey}`) ?? document.getElementById('car2-fleet')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Real DB cars only — no hardcoded fallback fleet (the old one carried a
  // Citroën Ami that isn't in the pool). Empty DB → grid's empty state.
  React.useEffect(() => {
    async function fetchCars() {
      setLoading(true)
      const { data, isEmpty } = await getAvailableCars()
      setCars(isEmpty || !data || data.length === 0 ? [] : groupByModelKey(data.map(normalizeCar)))
      setLoading(false)
    }
    fetchCars()
  }, [])

  // Hero "Search" = seed all cards with these dates (bump the nonce so every
  // card re-adopts them, discarding per-card overrides) + scroll to the fleet.
  // No availability call here — each card queries its own dates.
  function handleSearch() {
    if (!seedValid) {
      setSearchError(t('selectDatesFirst'))
      return
    }
    setSearchError(null)
    setSeedNonce((n) => n + 1)
    document.getElementById('car2-fleet')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Card passes its own (independent) dates; payload fields are identical to
  // car-rental/page.tsx — only the date source changed (page state → card).
  function handleSelect(car: NormalizedCar, pickup: string, dropoff: string) {
    dispatch({
      type: 'SET_CAR_RENTAL',
      payload: {
        modelKey: car.id,
        model: car.model,
        pricePerDay: car.price,
        days: dateDiffInDays(pickup, dropoff) + 1,
        pickupLocation: PICKUP_LOCATION,
        dropoffLocation: PICKUP_LOCATION,
        pickupAt: pickup,
        dropoffAt: dropoff,
      },
    })
    router.push('/car-rental/driver')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Car2Hero
          pickupDate={seedPickup}
          dropoffDate={seedDropoff}
          driverAge={driverAge}
          todayAthens={todayAthens}
          searchError={searchError}
          onPickupDateChange={setSeedPickup}
          onDropoffDateChange={setSeedDropoff}
          onDriverAgeChange={setDriverAge}
          onSearch={handleSearch}
          cars={cars}
          onCardClick={handleHeroCardClick}
        />
        <Car2TrustBar />
        <Car2FleetGrid
          cars={cars}
          loading={loading}
          locale={locale}
          onSelect={handleSelect}
          seedPickup={seedPickup}
          seedDropoff={seedDropoff}
          seedNonce={seedNonce}
          todayAthens={todayAthens}
        />
        <Car2Included />
        <Car2WhyUs />
        <Car2Destinations />
        <Car2Faq />
        <Car2Cta />
      </main>
      <Footer />
      <Car2FloatingWhatsApp />
    </div>
  )
}
