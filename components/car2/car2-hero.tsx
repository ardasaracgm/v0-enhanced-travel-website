'use client'

import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Car, MapPin, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Car2HeroCarousel } from '@/components/car2/car2-hero-carousel'
import { DateRangeField } from '@/components/ferry/date-range-field'
import type { NormalizedCar } from '@/lib/normalize-car'

// Textless Kos harbor shot (no cars/text), provided for the car2 hero.
const HERO_IMAGE = '/cars/kos-hero.webp'

interface Car2HeroProps {
  pickupDate: string
  dropoffDate: string
  driverAge: string
  todayAthens: string
  searching: boolean
  searchError: string | null
  onPickupDateChange: (v: string) => void
  onDropoffDateChange: (v: string) => void
  onDriverAgeChange: (v: string) => void
  onSearch: () => void
  cars: NormalizedCar[]
  onCardClick: (modelKey: string) => void
}

export function Car2Hero({
  pickupDate,
  dropoffDate,
  driverAge,
  todayAthens,
  searching,
  searchError,
  onPickupDateChange,
  onDropoffDateChange,
  onDriverAgeChange,
  onSearch,
  cars,
  onCardClick,
}: Car2HeroProps) {
  const t = useTranslations('car2')
  const locale = useLocale()

  return (
    <section className="relative w-full overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0">
        <Image src={HERO_IMAGE} alt={t('heroTitle')} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/20" />
      </div>

      <div className="container relative px-4 md:px-6">
        <div className="grid items-stretch gap-10 lg:grid-cols-2">
          {/* Left: copy + search card */}
          <div className="max-w-xl space-y-8">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-blue-950"
              >
                <Car className="h-4 w-4" />
                {t('heroBadge')}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 text-balance text-4xl font-bold text-blue-950 md:text-5xl lg:text-6xl"
              >
                {t('heroTitle')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-pretty text-lg text-blue-950/80 md:text-xl"
              >
                {t('heroSubtitle')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-950 px-4 py-2 text-sm font-semibold text-white"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                {t('heroFleetYear')}
              </motion.div>
            </div>

            {/* Search card — content unchanged, relocated to the left column */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-2xl">
                <CardContent className="grid gap-4 p-6 md:p-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('searchPickupLabel')}</label>
                    <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span>{t('searchPickupValue')}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('searchDatesLabel')}</label>
                    <DateRangeField
                      mode="range"
                      date={pickupDate}
                      returnDate={dropoffDate}
                      onDateChange={onPickupDateChange}
                      onReturnDateChange={onDropoffDateChange}
                      minDate={todayAthens}
                      locale={locale}
                      placeholder={t('searchDatesPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('searchAgeLabel')}</label>
                    <Select value={driverAge} onValueChange={onDriverAgeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="21-24">{t('searchAge2124')}</SelectItem>
                        <SelectItem value="25+">{t('searchAge25plus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={onSearch} disabled={searching} className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {t('searchButton')}
                  </Button>
                  {searchError && <p className="text-sm text-destructive">{searchError}</p>}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right: car carousel — vertically centered in the stretched column
              so its controls roughly bottom-align with the search card */}
          <div className="flex h-full flex-col justify-end">
            <Car2HeroCarousel cars={cars} onCardClick={onCardClick} />
          </div>
        </div>
      </div>
    </section>
  )
}
