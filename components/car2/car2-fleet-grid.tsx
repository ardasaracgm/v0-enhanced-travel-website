'use client'

import { useTranslations } from 'next-intl'
import { Car as CarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CarCardSkeleton, EmptyState } from '@/components/ui/skeleton'
import { buildCar2WhatsAppLink } from '@/lib/car2-contact'
import { Car2FleetCard } from '@/components/car2/car2-fleet-card'
import type { NormalizedCar } from '@/lib/normalize-car'

interface Car2FleetGridProps {
  cars: NormalizedCar[]
  loading: boolean
  locale: string
  seedPickup: string
  seedDropoff: string
  seedNonce: number
  todayAthens: string
  onSelect: (car: NormalizedCar, pickup: string, dropoff: string) => void
}

export function Car2FleetGrid({
  cars,
  loading,
  locale,
  seedPickup,
  seedDropoff,
  seedNonce,
  todayAthens,
  onSelect,
}: Car2FleetGridProps) {
  const t = useTranslations('car2')

  return (
    <section id="car2-fleet" className="w-full scroll-mt-24 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">{t('fleetEyebrow')}</p>
          <h2 className="mb-4 text-3xl font-bold text-blue-950 md:text-4xl">{t('fleetTitle')}</h2>
          <p className="text-lg text-muted-foreground">{t('fleetSubtitle')}</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
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
              <a href={buildCar2WhatsAppLink(locale)} target="_blank" rel="noopener noreferrer">
                <Button>{t('emptyCta')}</Button>
              </a>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {cars.map((car, index) => (
              <Car2FleetCard
                key={car.id || car.model}
                car={car}
                index={index}
                locale={locale}
                seedPickup={seedPickup}
                seedDropoff={seedDropoff}
                seedNonce={seedNonce}
                todayAthens={todayAthens}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
