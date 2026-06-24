'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Car as CarIcon, Fuel, Settings, Users, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CarCardSkeleton, EmptyState } from '@/components/ui/skeleton'
import { buildCar2WhatsAppLink } from '@/lib/car2-contact'
import type { NormalizedCar } from '@/lib/normalize-car'

interface Car2FleetGridProps {
  cars: NormalizedCar[]
  loading: boolean
  availability: Record<string, number> | null
  validRange: boolean
  locale: string
  onSelect: (car: NormalizedCar) => void
}

export function Car2FleetGrid({ cars, loading, availability, validRange, locale, onSelect }: Car2FleetGridProps) {
  const t = useTranslations('car2')

  return (
    <section id="car2-fleet" className="w-full py-16 md:py-24">
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
            {cars.map((car, index) => {
              // Selectable only after a search (availability map present) and
              // when this model still has stock for the chosen range.
              const soldOut = availability != null && (availability[car.id] ?? 0) === 0
              const selectable = validRange && availability != null && !soldOut
              return (
                <motion.div
                  key={car.id || car.model}
                  id={`car-${car.id}`}
                  className="scroll-mt-24"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Card className="h-full overflow-hidden rounded-3xl border-border/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <CardContent className="flex h-full flex-col p-0">
                      <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50">
                        <Image src={car.image} alt={car.model} fill className="object-cover" />
                        {car.type && (
                          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                            {car.type}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="mb-3 text-xl font-bold text-blue-950">{car.model}</h3>
                        <div className="mb-5 grid grid-cols-2 gap-2 text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-primary" />
                            {car.specs.fuel}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            {t('seatsLabel', { count: Number(car.specs.seats) || 4 })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-primary" />
                            {car.specs.transmission}
                          </div>
                          {/* AC reflects the model spec — hidden when a model has
                              no A/C (e.g. once ops sets specs.ac=false). */}
                          {car.specs.ac && (
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              {t('acLabel')}
                            </div>
                          )}
                        </div>
                        <div className="mt-auto space-y-3 border-t border-border/50 pt-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-primary">€{car.price}</span>
                            <span className="text-sm text-muted-foreground">{t('perDay')}</span>
                          </div>
                          <Button
                            onClick={() => onSelect(car)}
                            disabled={!selectable}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {soldOut ? t('unavailableButton') : t('selectButton')}
                          </Button>
                          <a
                            href={buildCar2WhatsAppLink(locale)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <Button className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90">
                              {t('emptyCta')}
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
