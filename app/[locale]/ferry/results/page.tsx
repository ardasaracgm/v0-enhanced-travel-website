'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import { Ship, Users, ArrowRight, ChevronLeft, Anchor, CalendarClock } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { BookingStepper } from '@/components/booking/stepper'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import {
  useBooking,
  selectOutboundFerry,
  selectReturnFerry,
  selectTotalPrice,
  type FerryBookingItem,
} from '@/lib/booking-context'
import { searchFerriesWithNearestAction, type FerrySearchResult } from '@/lib/actions/ferry-search'
import type { FerryTrip } from '@/lib/ferry/provider'
import { FerryCard, FerryResultEmpty } from '@/components/ferry/ferry-card'
import { OrderSummaryItems } from '@/components/booking/order-summary-items'
import { formatDateLong } from '@/lib/trip-items/summary'
import { resolvePort } from '@/lib/ferry/ports'

export default function FerryResultsPage() {
  const router = useRouter()
  const t = useTranslations('ferryResults')
  const locale = useLocale()
  const { state, dispatch } = useBooking()
  const [ferries, setFerries] = React.useState<FerryTrip[]>([])
  const [returnFerries, setReturnFerries] = React.useState<FerryTrip[]>([])
  const [outResult, setOutResult] = React.useState<FerrySearchResult | null>(null)
  const [retResult, setRetResult] = React.useState<FerrySearchResult | null>(null)
  const [isSelectingReturn, setIsSelectingReturn] = React.useState(false)
  const outbound = selectOutboundFerry(state)
  const returnF = selectReturnFerry(state)

  // Round-trip aynı firma → tek indirimli round-trip rezervasyonu (ferryPairPrices
  // ile aynı tespit: operator eşitliği). Sadece özet notu için; money-path değil.
  const sameOperatorRoundTrip =
    state.searchParams.tripType === 'round-trip' &&
    !!outbound && !!returnF &&
    outbound.operator === returnF.operator

  // Stale seçim koruması: seçili ferry artık güncel rota/yolcu-sayısıyla
  // eşleşmiyorsa geçersiz → temizle. "0 sefer" rota değişiminde özetin hayalet
  // (eski Kos) veri göstermesini ve fiyat sapmasını kökten engeller. Tek kez
  // temizler: dispatch sonrası item gider → effect tekrar çalışır → out yok → çıkar.
  React.useEffect(() => {
    const out = state.items.find(
      (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
    )
    if (!out) return
    const routeOk = out.ferry.from.id === state.searchParams.from
                 && out.ferry.to.id === state.searchParams.to
    const paxOk = out.passengerCount === state.searchParams.passengers
    if (!routeOk || !paxOk) {
      dispatch({ type: 'CLEAR_FERRY_SELECTION' })
      setIsSelectingReturn(false)
      return
    }
    // Round-trip → one-way downgrade leaves a GHOST return item: route/pax still
    // match, so the guard above doesn't fire, yet the return leg lingers in
    // items[] — summed by selectTotalPrice, shown in the summary, sent to the
    // server, and (since repriceFerryItems keys on items, not tripType) used to
    // price the outbound as a round-trip PAIR. Drop it. One-way only — never
    // touch a live round-trip selection.
    if (
      state.searchParams.tripType === 'one-way' &&
      state.items.some((i) => i.type === 'ferry' && i.leg === 'return')
    ) {
      dispatch({ type: 'CLEAR_RETURN_FERRY' })
      setIsSelectingReturn(false)
    }
  }, [state.items, state.searchParams, dispatch])

  React.useEffect(() => {
    let cancelled = false
    const sp = state.searchParams
    ;(async () => {
      const out = await searchFerriesWithNearestAction({ from: sp.from, to: sp.to, date: sp.date })
      if (cancelled) return
      setFerries(out.trips.map(f => ({ ...f, date: sp.date })))
      setOutResult(out)

      if (sp.tripType === 'round-trip') {
        const ret = await searchFerriesWithNearestAction({ from: sp.to, to: sp.from, date: sp.returnDate || '' })
        if (!cancelled) {
          setReturnFerries(ret.trips.map(f => ({ ...f, date: sp.returnDate || '' })))
          setRetResult(ret)
        }
      } else {
        setReturnFerries([])
        setRetResult(null)
      }
    })()
    return () => { cancelled = true }
  }, [state.searchParams])

  const handleSelectFerry = (ferry: FerryTrip) => {
    dispatch({ type: 'SELECT_FERRY', payload: ferry })
    
    if (state.searchParams.tripType === 'round-trip') {
      setIsSelectingReturn(true)
    }
  }

  const handleSelectReturnFerry = (ferry: FerryTrip) => {
    if (!outbound) return
    dispatch({ type: 'SELECT_RETURN_FERRY', payload: ferry })
  }

  const handleContinue = () => {
    if (outbound) {
      router.push('/ferry/extras')
    }
  }

  // Görünen liman adı: kanonik katalogdan, locale-öncelikli (portLabel deseni).
  // Katalog dışı slug (ör. marmaris) → ham slug'a fallback, mevcut davranışı korur.
  // Salt gösterim — searchParams/money-path/seçim mantığına dokunmaz.
  const portName = (s: string) => {
    const p = resolvePort(s)
    return p ? (p.name[locale as 'tr' | 'en' | 'el'] ?? p.name.en ?? p.name.tr) : s
  }
  const fromCity = portName(state.searchParams.from)
  const toCity = portName(state.searchParams.to)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/ferry">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span>{fromCity}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{toCity}</span>
                    {state.searchParams.tripType === 'round-trip' && (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        <span>{fromCity}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-primary-foreground/80">
                    {state.searchParams.date} · {t('passengers', { count: state.searchParams.passengers })}
                    {state.searchParams.tripType === 'round-trip' && ` · ${t('returnPrefix')} ${state.searchParams.returnDate}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-primary-foreground/80">{t('totalPrice')}</p>
                  <p className="text-2xl font-bold">€{selectTotalPrice(state)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Steps */}
        <BookingStepper flow="ferry" current="selectFerry" />

        {/* Results */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Ferry List */}
              <div className="lg:col-span-2 space-y-6">
                {!isSelectingReturn ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground">
                        {t('outboundHeading', { from: fromCity, to: toCity })}
                      </h2>
                      <Badge variant="secondary">{t('ferriesFound', { count: ferries.length })}</Badge>
                    </div>
                    
                    {ferries.length === 0 ? (
                      <FerryResultEmpty
                        result={outResult}
                        selectedId={outbound?.id}
                        onSelectNearest={handleSelectFerry}
                      />
                    ) : (
                      <div className="space-y-4">
                        {ferries.map((ferry, index) => (
                          <motion.div
                            key={ferry.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <FerryCard
                              ferry={ferry}
                              selected={outbound?.id === ferry.id}
                              onSelect={() => handleSelectFerry(ferry)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsSelectingReturn(false)}
                          className="text-muted-foreground"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          {t('backToOutbound')}
                        </Button>
                        <h2 className="text-xl font-bold text-foreground">
                          {t('returnHeading', { to: toCity, from: fromCity })}
                        </h2>
                      </div>
                      <Badge variant="secondary">{t('ferriesFound', { count: returnFerries.length })}</Badge>
                    </div>
                    
                    {returnFerries.length > 0 ? (
                      <div className="space-y-4">
                        {returnFerries.map((ferry, index) => (
                          <motion.div
                            key={ferry.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <FerryCard
                              ferry={ferry}
                              selected={returnF?.id === ferry.id}
                              onSelect={() => handleSelectReturnFerry(ferry)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <FerryResultEmpty
                        result={retResult}
                        selectedId={returnF?.id}
                        onSelectNearest={handleSelectReturnFerry}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">{t('bookingSummary')}</h3>
                      
                      {outbound ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-secondary/50 rounded-xl">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Ship className="h-4 w-4" />
                              <span>{t('outbound')}</span>
                            </div>
                            <p className="font-semibold text-foreground">{outbound.from.name} → {outbound.to.name}</p>
                            <p className="text-sm text-muted-foreground">{formatDateLong(outbound.date, locale)}</p>
                            <p className="text-sm text-muted-foreground">{outbound.departureTime} - {outbound.arrivalTime}</p>
                            <p className="text-sm text-muted-foreground">{outbound.operator}</p>
                          </div>

                          {returnF && (
                            <div className="p-4 bg-secondary/50 rounded-xl">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Ship className="h-4 w-4" />
                                <span>{t('return')}</span>
                              </div>
                              <p className="font-semibold text-foreground">{returnF.from.name} → {returnF.to.name}</p>
                              <p className="text-sm text-muted-foreground">{formatDateLong(returnF.date, locale)}</p>
                              <p className="text-sm text-muted-foreground">{returnF.departureTime} - {returnF.arrivalTime}</p>
                              <p className="text-sm text-muted-foreground">{returnF.operator}</p>
                            </div>
                          )}

                          {/* Ekstralar (car/luggage/transfer) — passenger-details/
                              checkout ile aynı paylaşılan bileşen (tek kaynak); toplama
                              giren her kalem X ile görünür. Ferry bacakları yukarıda. */}
                          {state.items.some((i) => i.type !== 'ferry') && (
                            <div className="space-y-2">
                              <OrderSummaryItems includeFerry={false} />
                            </div>
                          )}

                          <div className="pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-muted-foreground">{t('passengersLabel')}</span>
                              <span className="text-foreground">{state.searchParams.passengers}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-bold">
                              <span className="text-foreground">{t('total')}</span>
                              <span className="text-primary">€{selectTotalPrice(state)}</span>
                            </div>
                            {sameOperatorRoundTrip && (
                              <p className="text-xs text-primary mt-2">{t('sameOperatorDiscount')}</p>
                            )}
                          </div>

                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleContinue}
                            disabled={state.searchParams.tripType === 'round-trip' && !returnF}
                          >
                            {t('continueToExtras')}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>

                          {state.searchParams.tripType === 'round-trip' && !returnF && (
                            <p className="text-sm text-muted-foreground text-center">
                              {t('selectReturnHint')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Anchor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{t('summaryEmpty')}</p>
                        </div>
                      )}
                      
                      <div className="mt-6 pt-6 border-t border-border/50">
                        <div className="flex items-start gap-3">
                          <CalendarClock className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{t('dateChange.title')}</p>
                            <p className="text-xs text-muted-foreground">{t('dateChange.body')}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
