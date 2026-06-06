'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Ship, Clock, Users, ArrowRight, ChevronLeft, CheckCircle, Anchor, AlertCircle, CalendarClock } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'
import { TrustBar } from '@/components/islandbee/trust-bar'
import {
  useBooking,
  getFerriesForRoute,
  selectOutboundFerry,
  selectReturnFerry,
  selectTotalPrice,
  type FerryRoute,
  type FerryBookingItem,
} from '@/lib/booking-context'

const cityNames: Record<string, string> = {
  bodrum: 'Bodrum',
  turgutreis: 'Turgutreis',
  marmaris: 'Marmaris',
  kusadasi: 'Kusadasi',
  kos: 'Kos',
  rhodes: 'Rhodes',
  samos: 'Samos',
}

export default function FerryResultsPage() {
  const router = useRouter()
  const t = useTranslations('ferryResults')
  const { state, dispatch } = useBooking()
  const [ferries, setFerries] = React.useState<FerryRoute[]>([])
  const [returnFerries, setReturnFerries] = React.useState<FerryRoute[]>([])
  const [isSelectingReturn, setIsSelectingReturn] = React.useState(false)
  const outbound = selectOutboundFerry(state)
  const returnF = selectReturnFerry(state)

  // Özet/fiyat tek kaynağı: seçili ferry BOOKING ITEM'ları (priceAmount +
  // passengerCount saklı). Özet satırı bunlardan beslenir → Total ile her zaman
  // tutarlı (selectTotalPrice de priceAmount'ı toplar).
  const outboundItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
  ) ?? null
  const returnItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return'
  ) ?? null

  // Stale seçim koruması: seçili ferry artık güncel rota/yolcu-sayısıyla
  // eşleşmiyorsa geçersiz → temizle. "0 sefer" rota değişiminde özetin hayalet
  // (eski Kos) veri göstermesini ve fiyat sapmasını kökten engeller. Tek kez
  // temizler: dispatch sonrası item gider → effect tekrar çalışır → out yok → çıkar.
  React.useEffect(() => {
    const out = state.items.find(
      (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
    )
    if (!out) return
    const routeOk = out.ferry.from.toLowerCase() === state.searchParams.from
                 && out.ferry.to.toLowerCase() === state.searchParams.to
    const paxOk = out.passengerCount === state.searchParams.passengers
    if (!routeOk || !paxOk) {
      dispatch({ type: 'CLEAR_FERRY_SELECTION' })
      setIsSelectingReturn(false)
    }
  }, [state.items, state.searchParams, dispatch])

  React.useEffect(() => {
    const outboundFerries = getFerriesForRoute(state.searchParams.from, state.searchParams.to)
    setFerries(outboundFerries.map(f => ({ ...f, date: state.searchParams.date })))
    
    if (state.searchParams.tripType === 'round-trip') {
      const returnFerryList = getFerriesForRoute(state.searchParams.to, state.searchParams.from)
      setReturnFerries(returnFerryList.map(f => ({ ...f, date: state.searchParams.returnDate || '' })))
    }
  }, [state.searchParams])

  const handleSelectFerry = (ferry: FerryRoute) => {
    dispatch({ type: 'SELECT_FERRY', payload: ferry })
    
    if (state.searchParams.tripType === 'round-trip') {
      setIsSelectingReturn(true)
    }
  }

  const handleSelectReturnFerry = (ferry: FerryRoute) => {
    if (!outbound) return
    dispatch({ type: 'SELECT_RETURN_FERRY', payload: ferry })
  }

  const handleContinue = () => {
    if (outbound) {
      router.push('/ferry/extras')
    }
  }

  const fromCity = cityNames[state.searchParams.from] || state.searchParams.from
  const toCity = cityNames[state.searchParams.to] || state.searchParams.to

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
        <section className="w-full py-4 border-b border-border/50 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="text-sm font-medium text-primary">{t('steps.selectFerry')}</span>
              </div>
              <div className="w-10 h-0.5 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.extras')}</span>
              </div>
              <div className="w-10 h-0.5 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.passengers')}</span>
              </div>
              <div className="w-10 h-0.5 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.payment')}</span>
              </div>
            </div>
          </div>
        </section>

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
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-8 text-center">
                          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">{t('noFerries.title')}</h3>
                          <p className="text-muted-foreground mb-4">{t('noFerries.body')}</p>
                          <Link href="/ferry">
                            <Button variant="outline">{t('noFerries.cta')}</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {ferries.map((ferry, index) => (
                          <motion.div
                            key={ferry.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card 
                              className={`bg-card border-2 transition-all cursor-pointer hover:shadow-lg ${
                                outbound?.id === ferry.id
                                  ? 'border-primary shadow-lg'
                                  : 'border-border/50 hover:border-primary/50'
                              }`}
                              onClick={() => handleSelectFerry(ferry)}
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
                                      <p className="text-sm text-muted-foreground">{ferry.from}</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <div className="w-8 h-0.5 bg-border" />
                                        <Clock className="h-4 w-4" />
                                        <span className="text-sm">{ferry.duration}</span>
                                        <div className="w-8 h-0.5 bg-border" />
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">{t('direct')}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-2xl font-bold text-foreground">{ferry.arrivalTime}</p>
                                      <p className="text-sm text-muted-foreground">{ferry.to}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-2xl font-bold text-primary">{ferry.price}</p>
                                      <p className="text-sm text-muted-foreground">{t('perPerson')}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                      <Badge variant={ferry.availableSeats > 20 ? 'secondary' : 'destructive'} className="text-xs">
                                        {t('seatsLeft', { count: ferry.availableSeats })}
                                      </Badge>
                                      <Button 
                                        size="sm" 
                                        className={outbound?.id === ferry.id ? 'bg-primary' : 'bg-primary/80'}
                                      >
                                        {outbound?.id === ferry.id ? (
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
                    
                    <div className="space-y-4">
                      {returnFerries.map((ferry, index) => (
                        <motion.div
                          key={ferry.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card 
                            className={`bg-card border-2 transition-all cursor-pointer hover:shadow-lg ${
                              returnF?.id === ferry.id
                                ? 'border-primary shadow-lg'
                                : 'border-border/50 hover:border-primary/50'
                            }`}
                            onClick={() => handleSelectReturnFerry(ferry)}
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
                                    <p className="text-sm text-muted-foreground">{ferry.from}</p>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <div className="w-8 h-0.5 bg-border" />
                                      <Clock className="h-4 w-4" />
                                      <span className="text-sm">{ferry.duration}</span>
                                      <div className="w-8 h-0.5 bg-border" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Direct</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-foreground">{ferry.arrivalTime}</p>
                                    <p className="text-sm text-muted-foreground">{ferry.to}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-primary">{ferry.price}</p>
                                    <p className="text-sm text-muted-foreground">{t('perPerson')}</p>
                                  </div>
                                  <div className="flex flex-col gap-2 items-end">
                                    <Badge variant={ferry.availableSeats > 20 ? 'secondary' : 'destructive'} className="text-xs">
                                      {t('seatsLeft', { count: ferry.availableSeats })}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      className={returnF?.id === ferry.id ? 'bg-primary' : 'bg-primary/80'}
                                    >
                                      {returnF?.id === ferry.id ? (
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
                        </motion.div>
                      ))}
                    </div>
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
                            <p className="font-semibold text-foreground">{outbound.from} → {outbound.to}</p>
                            <p className="text-sm text-muted-foreground">{outbound.departureTime} - {outbound.arrivalTime}</p>
                            <p className="text-sm text-muted-foreground">{outbound.operator}</p>
                            <p className="text-primary font-medium mt-2">€{outboundItem!.ferry.price} × {outboundItem!.passengerCount} = €{outboundItem!.priceAmount}</p>
                          </div>

                          {returnF && (
                            <div className="p-4 bg-secondary/50 rounded-xl">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Ship className="h-4 w-4" />
                                <span>{t('return')}</span>
                              </div>
                              <p className="font-semibold text-foreground">{returnF.from} → {returnF.to}</p>
                              <p className="text-sm text-muted-foreground">{returnF.departureTime} - {returnF.arrivalTime}</p>
                              <p className="text-sm text-muted-foreground">{returnF.operator}</p>
                              <p className="text-primary font-medium mt-2">€{returnItem!.ferry.price} × {returnItem!.passengerCount} = €{returnItem!.priceAmount}</p>
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
                          </div>

                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleContinue}
                            disabled={state.searchParams.tripType === 'round-trip' && !returnF}
                          >
                            {t('continueToPassengers')}
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
