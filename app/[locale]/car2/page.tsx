'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { Car2Hero } from '@/components/car2/car2-hero'
import { Car2TrustBar } from '@/components/car2/car2-trust-bar'
import { dateDiffInDays } from '@/lib/normalize-car'

// car2 — rebuilt car-rental surface. Unlinked preview route (services.ts still
// points /car-rental at the old page). page.tsx owns the search state; the hero
// form and the (later) fleet grid share it via props.
export default function Car2Page() {
  const t = useTranslations('car2')
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const [pickupDate, setPickupDate] = React.useState('')
  const [dropoffDate, setDropoffDate] = React.useState('')
  const [driverAge, setDriverAge] = React.useState('25+')
  const [searchError, setSearchError] = React.useState<string | null>(null)

  // Inclusive day count, matching the rest of the app (dropoff = pickup + days-1).
  // Same-day (diff 0) is a valid 1-day rental, so the floor is >= 0.
  const datesChosen = !!pickupDate && !!dropoffDate
  const validRange = datesChosen && dateDiffInDays(pickupDate, dropoffDate) >= 0

  // Availability fetch lands with the fleet grid (C3) that consumes it; here we
  // only validate that a usable date range is chosen.
  function handleSearch() {
    if (!validRange) {
      setSearchError(t('selectDatesFirst'))
      return
    }
    setSearchError(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Car2Hero
          pickupDate={pickupDate}
          dropoffDate={dropoffDate}
          driverAge={driverAge}
          todayAthens={todayAthens}
          searchError={searchError}
          onPickupDateChange={setPickupDate}
          onDropoffDateChange={setDropoffDate}
          onDriverAgeChange={setDriverAge}
          onSearch={handleSearch}
        />
        <Car2TrustBar />
        {/* fleet · included · why · destinations · faq · cta — sonraki commit'ler */}
      </main>
      <Footer />
    </div>
  )
}
