'use client'

import * as React from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Fuel, Settings, Users, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DateRangeField } from '@/components/ferry/date-range-field'
import { buildCar2WhatsAppLink } from '@/lib/car2-contact'
import { getCachedModelAvailability } from '@/lib/car2-availability-cache'
import { dateDiffInDays, type NormalizedCar } from '@/lib/normalize-car'

interface Car2FleetCardProps {
  car: NormalizedCar
  index: number
  locale: string
  seedPickup: string
  seedDropoff: string
  seedNonce: number
  todayAthens: string
  onSelect: (car: NormalizedCar, pickup: string, dropoff: string) => void
}

export function Car2FleetCard({
  car,
  index,
  locale,
  seedPickup,
  seedDropoff,
  seedNonce,
  todayAthens,
  onSelect,
}: Car2FleetCardProps) {
  const t = useTranslations('car2')
  const [pickup, setPickup] = React.useState(seedPickup)
  const [dropoff, setDropoff] = React.useState(seedDropoff)
  const [availabilityCount, setAvailabilityCount] = React.useState<number | null>(null)
  const lastQueried = React.useRef('')

  // Re-seed on each hero search (nonce bump): adopt seed dates, drop any
  // per-card override. Intentionally keyed on the nonce only.
  React.useEffect(() => {
    setPickup(seedPickup)
    setDropoff(seedDropoff)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedNonce])

  // Auto-availability for THIS card's dates. Invalid/empty range → no query
  // (a freshly-mounted empty card never hits the server). The shared cache
  // dedupes the identical calls fired when all cards re-seed at once.
  React.useEffect(() => {
    const valid = !!pickup && !!dropoff && dateDiffInDays(pickup, dropoff) >= 0
    if (!valid) {
      setAvailabilityCount(null)
      lastQueried.current = ''
      return
    }
    const days = dateDiffInDays(pickup, dropoff) + 1
    const key = `${pickup}_${days}`
    if (lastQueried.current === key) return
    setAvailabilityCount(null) // stale clear until the new result lands

    let cancelled = false
    const timer = setTimeout(async () => {
      const res = await getCachedModelAvailability(pickup, days)
      if (cancelled) return
      lastQueried.current = key
      setAvailabilityCount(res.ok ? (res.availability[car.id] ?? 0) : null)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pickup, dropoff, car.id])

  const valid = !!pickup && !!dropoff && dateDiffInDays(pickup, dropoff) >= 0
  const soldOut = availabilityCount === 0
  const selectable = valid && availabilityCount != null && availabilityCount > 0

  return (
    <motion.div
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
              {car.specs.ac && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {t('acLabel')}
                </div>
              )}
            </div>
            <div className="mt-auto space-y-3 border-t border-border/50 pt-4">
              {/* price + Seç yan yana */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">€{car.price}</span>
                  <span className="text-sm text-muted-foreground">{t('perDay')}</span>
                </div>
                <Button
                  onClick={() => onSelect(car, pickup, dropoff)}
                  disabled={!selectable}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t('selectButton')}
                </Button>
              </div>
              {/* bağımsız tarih aralığı */}
              <DateRangeField
                mode="range"
                date={pickup}
                returnDate={dropoff}
                onDateChange={setPickup}
                onReturnDateChange={setDropoff}
                minDate={todayAthens}
                locale={locale}
                placeholder={t('searchDatesPlaceholder')}
              />
              {/* müsaitlik — yalnız etiket, sayı YOK */}
              <div className="text-center text-xs">
                {!valid ? (
                  <span className="text-muted-foreground">{t('selectDatesHint')}</span>
                ) : availabilityCount == null ? (
                  <span className="text-muted-foreground">…</span>
                ) : soldOut ? (
                  <span className="font-medium text-destructive">{t('unavailableButton')}</span>
                ) : (
                  <span className="font-medium text-green-600">{t('availableLabel')}</span>
                )}
              </div>
              <a href={buildCar2WhatsAppLink(locale)} target="_blank" rel="noopener noreferrer" className="block">
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
}
