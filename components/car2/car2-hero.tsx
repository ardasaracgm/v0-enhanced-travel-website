'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Car, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'

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

// Kos coastline (same Greek-sea shot the homepage hero uses); no local harbor
// asset exists yet. images.unsplash.com is whitelisted in next.config.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=1920&q=80'

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
}: Car2HeroProps) {
  const t = useTranslations('car2')

  return (
    <section className="relative w-full overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0">
        <Image src={HERO_IMAGE} alt={t('heroTitle')} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/50 via-foreground/25 to-transparent" />
      </div>

      <div className="container relative px-4 md:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Copy */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Car className="h-4 w-4" />
              {t('heroBadge')}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-balance text-4xl font-bold text-white md:text-5xl lg:text-6xl"
            >
              {t('heroTitle')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-pretty text-lg text-white/90 md:text-xl"
            >
              {t('heroSubtitle')}
            </motion.p>
          </div>

          {/* Search card */}
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('searchPickupDateLabel')}</label>
                    <Input
                      type="date"
                      className="h-10"
                      min={todayAthens}
                      max={dropoffDate || '2099-12-31'}
                      value={pickupDate}
                      onChange={(e) => onPickupDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('searchReturnDateLabel')}</label>
                    <Input
                      type="date"
                      className="h-10"
                      min={pickupDate || todayAthens}
                      max="2099-12-31"
                      value={dropoffDate}
                      onChange={(e) => onDropoffDateChange(e.target.value)}
                    />
                  </div>
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
      </div>
    </section>
  )
}
