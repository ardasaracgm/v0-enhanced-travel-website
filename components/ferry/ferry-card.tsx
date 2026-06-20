'use client'

import { useTranslations } from 'next-intl'
import { Ship, Clock, CheckCircle, AlertCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ferryUnitFare, formatDuration } from '@/lib/ferry/display'
import type { FerryTrip } from '@/lib/ferry/provider'
import type { FerrySearchResult } from '@/lib/actions/ferry-search'

/** One sailing card. Single source for the list rows AND the nearest-date card. */
export function FerryCard({
  ferry, selected, onSelect,
}: { ferry: FerryTrip; selected: boolean; onSelect: () => void }) {
  const t = useTranslations('ferryResults')
  return (
    <Card
      className={`bg-card border-2 transition-all cursor-pointer hover:shadow-lg ${
        selected ? 'border-primary shadow-lg' : 'border-border/50 hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ship className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{ferry.operator}</p>
              <p className="text-sm text-muted-foreground">{ferry.vessel}</p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{ferry.departureTime}</p>
              <p className="text-sm text-muted-foreground">{ferry.from.name}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-8 h-0.5 bg-border" />
                <Clock className="h-4 w-4" />
                <span className="text-sm">{formatDuration(ferry.durationMinutes)}</span>
                <div className="w-8 h-0.5 bg-border" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('direct')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{ferry.arrivalTime}</p>
              <p className="text-sm text-muted-foreground">{ferry.to.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">€{ferryUnitFare(ferry)}</p>
              <p className="text-sm text-muted-foreground">{t('perPerson')}</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant={ferry.passengerSeatsAvailable > 20 ? 'secondary' : 'destructive'} className="text-xs">
                {t('seatsLeft', { count: ferry.passengerSeatsAvailable })}
              </Badge>
              <Button size="sm" className={selected ? 'bg-primary' : 'bg-primary/80'}>
                {selected ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t('selected')}
                  </>
                ) : (
                  t('select')
                )}
              </Button>
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
        />
      </div>
    )
  }

  // no_trips_in_window (or null/unknown)
  return <EmptyCard title={t('noTripsInWindow.title')} body={t('noTripsInWindow.body')} />
}
