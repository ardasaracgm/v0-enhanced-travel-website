'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { MapPin, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DateRangeField } from '@/components/ferry/date-range-field'

/**
 * Ana sayfa hero'sunun "Araç" sekmesine gömülen kompakt ön-seçim formu —
 * ortak "hero-inline servis formu" deseninin 2. örneği (Vize'yi takip eder).
 *
 * Teslim noktası + sürücü yaşı GÖRSEL/SABİT (car2-hero:100-111 ile birebir:
 * "Kos Limanı" + "21+"), taşınmaz — salt-görüntü. Yalnız TARİH fonksiyonel.
 * Submit → /car-rental?pickup=…&dropoff=… (yalnız DOLU tarihler encode; ikisi
 * de boşsa param'sız). Hedef sayfa useSearchParams ile okuyup seedPickup/
 * seedDropoff + seedNonce'ı besler → fleet o tarihlere göre dolar.
 */
export function CarHeroSearch() {
  const t = useTranslations('car2')
  const locale = useLocale()
  const router = useRouter()
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const [pickup, setPickup] = React.useState('')
  const [dropoff, setDropoff] = React.useState('')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (pickup) params.set('pickup', pickup)
    if (dropoff) params.set('dropoff', dropoff)
    const qs = params.toString()
    router.push(qs ? `/car-rental?${qs}` : '/car-rental')
  }

  return (
    <div className="w-full space-y-3">
      {/* "2026 model" rozeti — car2-hero:82-90 ile aynı markup/ikon/renk/key
          (framer-motion animasyon sarmalayıcısı hariç: bu bileşende motion yok).
          Mevcut dikey slack'e oturur → TabsContent sm:min-h-[148px] değişmez. */}
      <div className="inline-flex items-center gap-2 rounded-full bg-blue-950 px-4 py-2 text-sm font-semibold text-white">
        <Sparkles className="h-4 w-4 text-amber-400" />
        {t('heroFleetYear')}
      </div>
      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
      {/* Teslim noktası — salt-görüntü (sabit "Kos Limanı") */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{t('searchPickupLabel')}</label>
        <div className="flex h-10 cursor-default items-center gap-2 rounded-xl border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{t('searchPickupValue')}</span>
        </div>
      </div>

      {/* Sürücü yaşı — salt-görüntü (sabit "21+", car2-hero:109 ile aynı) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{t('searchAgeLabel')}</label>
        <div className="flex h-10 cursor-default items-center rounded-xl border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
          <span>21+</span>
        </div>
      </div>

      {/* Tarih — tek fonksiyonel alan; geniş olsun diye lg'de 2 kolon */}
      <div className="space-y-1.5 lg:col-span-2">
        <label className="text-xs font-medium text-foreground">{t('searchDatesLabel')}</label>
        <DateRangeField
          mode="range"
          date={pickup}
          returnDate={dropoff}
          onDateChange={setPickup}
          onReturnDateChange={setDropoff}
          minDate={todayAthens}
          locale={locale}
          placeholder={t('searchDatesPlaceholder')}
          align="end"
          alignOffset={0}
          triggerClassName="rounded-xl"
        />
      </div>

      <div className="flex items-end">
        <Button
          onClick={handleSearch}
          className="h-10 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {t('searchButton')}
        </Button>
      </div>
      </div>
    </div>
  )
}
