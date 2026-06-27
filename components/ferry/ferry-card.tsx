'use client'

import * as React from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Ship, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ferryUnitFare, formatDuration } from '@/lib/ferry/display'
import { formatDateShort } from '@/lib/trip-items/summary'
import { resolvePort } from '@/lib/ferry/ports'
import type { FerryTrip } from '@/lib/ferry/provider'
import type { FerrySearchResult } from '@/lib/actions/ferry-search'

export type FerryCardDensity = 'hero' | 'comfortable' | 'cozy' | 'compact'

/** Sefer sayısı → density: 1 sefer hero (büyük foto), ≤3 comfortable, ≤6 cozy, ≥7 compact. */
export function densityForCount(n: number): FerryCardDensity {
  if (n <= 1) return 'hero'
  if (n <= 3) return 'comfortable'
  if (n <= 6) return 'cozy'
  return 'compact'
}

// Yön → görsel: kalkış ülkesi → varış ülkesi (resolvePort.country). YALNIZ fiilen
// var olan 3 asset whitelist'te; tr-tr / bilinmeyen slug → null → <Ship> fallback.
// serviceVisual'dan ayrı: o BookingItem alır + her çift için src üretir (tr-tr 404
// riski); burada FerryTrip'ten türetip whitelist ile 404'ü kökten engelliyoruz.
const ROUTE_PHOTO = new Set(['tr-gr', 'gr-tr', 'gr-gr'])
function routePhotoSrc(ferry: FerryTrip): string | null {
  const a = resolvePort(ferry.from.id)?.country?.toLowerCase()
  const b = resolvePort(ferry.to.id)?.country?.toLowerCase()
  if (!a || !b) return null
  const key = `${a}-${b}`
  return ROUTE_PHOTO.has(key) ? `/services/ferry-${key}.webp` : null
}

// density → boyut/font token'ları (ferry mavi tone, car2 değil).
// photo  = MOBİL boyut (base, dokunulmaz). photoMd = desktop genişlik (flush).
// bleed  = desktop negatif margin: CardContent padding'ini iptal edip fotoyu
//          sol+üst+alt kart kenarına yapıştırır (md:items-stretch ile tam yükseklik).
//          bleed değeri d.pad ile eşleşmeli (hero md'de p-6 → -6; diğerleri -5/-4/-3).
const DENSITY: Record<FerryCardDensity, { pad: string; photo: string; photoMd: string; bleed: string; time: string; operator: string }> = {
  hero:        { pad: 'p-5 sm:p-6', photo: 'h-44 w-full', photoMd: 'md:h-auto md:w-[35%]', bleed: 'md:-my-6 md:-ml-6', time: 'text-3xl', operator: 'text-lg' },
  comfortable: { pad: 'p-5',        photo: 'h-20 w-28',   photoMd: 'md:h-auto md:w-[35%]', bleed: 'md:-my-5 md:-ml-5', time: 'text-2xl', operator: 'text-base' },
  cozy:        { pad: 'p-4',        photo: 'h-16 w-20',   photoMd: 'md:h-auto md:w-[35%]', bleed: 'md:-my-4 md:-ml-4', time: 'text-xl',  operator: 'text-sm' },
  compact:     { pad: 'p-3',        photo: 'h-14 w-14',   photoMd: 'md:h-auto md:w-[35%]', bleed: 'md:-my-3 md:-ml-3', time: 'text-lg',  operator: 'text-sm' },
}

/** One sailing card. Single source for the list rows AND the nearest-date card. */
export function FerryCard({
  ferry, selected, onSelect, density = 'comfortable',
}: { ferry: FerryTrip; selected: boolean; onSelect: () => void; density?: FerryCardDensity }) {
  const t = useTranslations('ferryResults')
  const locale = useLocale()
  const d = DENSITY[density]
  const hero = density === 'hero'
  const [imgOk, setImgOk] = React.useState(true)
  const photoSrc = routePhotoSrc(ferry)
  const showPhoto = !!photoSrc && imgOk
  const seatsHealthy = ferry.passengerSeatsAvailable > 20

  // Foto bloğu — görsel ya da Ship-ferry-tone kutu (fallback). onError → ikon.
  const photoBlock = (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-blue-50 rounded-2xl md:self-stretch md:rounded-none ${d.photo} ${d.photoMd} ${d.bleed}`}>
      {showPhoto ? (
        <Image
          src={photoSrc!}
          alt={`${ferry.from.name} → ${ferry.to.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 35vw"
          className="object-cover"
          onError={() => setImgOk(false)}
        />
      ) : (
        <Ship className={hero ? 'h-12 w-12 text-blue-500' : 'h-7 w-7 text-blue-500'} />
      )}
    </div>
  )

  return (
    <Card
      className={`cursor-pointer overflow-hidden rounded-3xl border-2 bg-card transition-all hover:shadow-lg ${
        selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-500/20' : 'border-blue-100 hover:border-blue-300'
      }`}
      onClick={onSelect}
    >
      <CardContent className={d.pad}>
        <div className={hero ? 'flex flex-col gap-5 md:flex-row md:items-stretch' : 'flex items-center gap-4 md:items-stretch'}>
          {photoBlock}

          <div className="flex flex-1 min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            {/* Operator + vessel */}
            <div className="min-w-0 md:shrink-0">
              <p className={`font-semibold text-blue-950 ${d.operator}`}>{ferry.operator}</p>
              <p className="text-xs text-muted-foreground">{ferry.vessel}</p>
            </div>

            {/* Saatler — kompakt: tek satır dep → arr + alt port → port + meta.
                Tek kod yolu (her genişlik). Üç-sütun matrisi kırılgandı (lg/xl
                col-span-2 dar kartta foto %35 + uzun tarih taşırıyordu); kompakt
                her yerde sığar. */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-blue-950 ${d.time}`}>{ferry.departureTime}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-300" />
                <span className={`font-bold text-blue-950 ${d.time}`}>{ferry.arrivalTime}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{ferry.from.name}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span>{ferry.to.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateShort(ferry.date, locale)} · {formatDuration(ferry.durationMinutes)} · {t('direct')}
              </p>
            </div>

            {/* Fiyat + koltuk + Seç */}
            <div className="flex items-center justify-between gap-3 md:shrink-0 md:flex-col md:items-end md:justify-center">
              <div className="text-right">
                <p className={`font-bold text-blue-950 ${hero ? 'text-3xl' : 'text-2xl'}`}>€{ferryUnitFare(ferry)}</p>
                <p className="text-xs text-muted-foreground">{t('perPerson')}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`whitespace-nowrap text-xs ${seatsHealthy ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}`}>
                  {t('seatsLeft', { count: ferry.passengerSeatsAvailable })}
                </Badge>
                <Button size="sm" className={selected ? 'bg-blue-600 text-white hover:bg-blue-600' : 'bg-blue-950 text-white hover:bg-blue-900'}>
                  {selected ? (<><CheckCircle className="mr-1 h-4 w-4" />{t('selected')}</>) : t('select')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyCard({ title, body }: { title: string; body?: string }) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        {body && <p className="text-muted-foreground">{body}</p>}
      </CardContent>
    </Card>
  )
}

/** Empty-list rendering driven by the fallback reason (one leg). */
export function FerryResultEmpty({
  result, selectedId, onSelectNearest,
}: {
  result: FerrySearchResult | null
  selectedId?: string
  onSelectNearest: (ferry: FerryTrip) => void
}) {
  const t = useTranslations('ferryResults')

  if (result?.reason === 'route_not_offered') {
    return <EmptyCard title={t('routeNotOffered.title')} body={t('routeNotOffered.body')} />
  }

  if (result?.reason === 'no_trips_on_date' && result.nearest) {
    const nearest = result.nearest
    return (
      <div className="space-y-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium">{t('noTripsOnDate.title', { date: nearest.date })}</p>
          </CardContent>
        </Card>
        <FerryCard
          ferry={nearest}
          selected={selectedId === nearest.id}
          onSelect={() => onSelectNearest(nearest)}
          density="comfortable"
        />
      </div>
    )
  }

  // no_trips_in_window (or null/unknown)
  return <EmptyCard title={t('noTripsInWindow.title')} body={t('noTripsInWindow.body')} />
}
