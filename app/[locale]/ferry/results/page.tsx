'use client'

import * as React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import { Ship, Users, ArrowRight, ChevronLeft, Anchor, CalendarClock, AlertCircle, Loader2, Car, Luggage, Bus, CheckCircle } from 'lucide-react'
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
import { addDaysISO } from '@/lib/trip-items/summary'
import { qualifiesReturn } from '@/lib/ferry/min-connection'
import type { FerryTrip } from '@/lib/ferry/provider'
import { FerryCard, FerryResultEmpty } from '@/components/ferry/ferry-card'
import { OrderSummaryItems } from '@/components/booking/order-summary-items'
import { formatDateShort } from '@/lib/trip-items/summary'
import { resolvePort } from '@/lib/ferry/ports'
import { isReversePair } from '@/lib/ferry/reverse-pair'
import type { ServiceTone } from '@/lib/service-theme'

// Servis chip tone→class — extras-client SUMMARY_TONE_* ile BİREBİR (app/ taranır,
// purge-safe; lib/'e class literal konmaz). Sepetteki servis kendi opak pastel
// tonunu alır, sepette olmayan TONE_CHIP_INACTIVE (foto banner üstü beyaz-ghost).
const SUMMARY_TONE_BG: Record<ServiceTone, string> = {
  ferry: 'bg-blue-50',
  transfer: 'bg-green-50',
  car: 'bg-purple-50',
  luggage: 'bg-amber-50',
  none: 'bg-secondary',
}
const SUMMARY_TONE_BORDER: Record<ServiceTone, string> = {
  ferry: 'border-blue-400',
  transfer: 'border-green-400',
  car: 'border-purple-400',
  luggage: 'border-amber-400',
  none: 'border-transparent',
}
const TONE_CHIP_INACTIVE = 'bg-white/10 border-white/25 text-white/70'

export default function FerryResultsPage() {
  const router = useRouter()
  const t = useTranslations('ferryResults')
  const locale = useLocale()
  const { state, dispatch } = useBooking()
  const [ferries, setFerries] = React.useState<FerryTrip[]>([])
  const [outResult, setOutResult] = React.useState<FerrySearchResult | null>(null)
  const [isSelectingReturn, setIsSelectingReturn] = React.useState(false)
  const outbound = selectOutboundFerry(state)
  const returnF = selectReturnFerry(state)

  // ── Dönüş çözümü: fiili outbound.date'e re-key + 3h MCT tek kapısı ──────────
  // Aynı-gün niyetinde dönüş, outbound'un FİİLİ gününde aranır (nearest-kayma
  // sonrası bile doğru: 24 seçildi→boş→outbound 25'e kaydıysa dönüş de 25'te
  // aranır, 25'in 14:00/18:00'i bulunur). O gün gate-geçen VARSA gösterilir
  // (advance YOK). Gate-geçen YOKSA (hepsi 3h-altı / o gün boş) → +1 gün advance
  // (farklı gün, MCT yok) + notice. Farklı-gün niyeti returnDate'i korur, gate
  // hep geçer. baseDate asla outbound.date'ten önce olamaz (return<outbound hole).
  const [returnRes, setReturnRes] = React.useState<{
    trips: FerryTrip[]; result: FerrySearchResult; slidDate: string | null
  } | null>(null)
  React.useEffect(() => {
    const sp = state.searchParams
    if (!(sp.tripType === 'round-trip' && isSelectingReturn && outbound)) {
      setReturnRes(null)
      return
    }
    let cancelled = false
    const od = outbound.date.slice(0, 10)
    const sameDayIntent = !!sp.returnDate && sp.date === sp.returnDate
    const intent = (sameDayIntent ? od : (sp.returnDate || od)).slice(0, 10)
    const baseDate = intent < od ? od : intent   // dönüş asla gidişten önce
    const from = sp.returnFrom ?? sp.to, to = sp.returnTo ?? sp.from
    ;(async () => {
      const base = await searchFerriesWithNearestAction({ from, to, date: baseDate })
      if (cancelled) return
      const qualifying = base.trips
        .map((f) => ({ ...f, date: baseDate }))
        .filter((c) => qualifiesReturn(outbound, c))
      if (qualifying.length > 0) {
        setReturnRes({ trips: qualifying, result: base, slidDate: null })
        return
      }
      // baseDate'te gate-geçen yok → +1 gün advance (farklı gün → MCT yok).
      const nextDate = addDaysISO(baseDate, 1)
      const adv = await searchFerriesWithNearestAction({ from, to, date: nextDate })
      if (cancelled) return
      const advTrips = adv.trips
        .map((f) => ({ ...f, date: nextDate }))
        .filter((c) => qualifiesReturn(outbound, c))
      setReturnRes({ trips: advTrips, result: adv, slidDate: nextDate })
    })()
    return () => { cancelled = true }
  }, [state.searchParams, isSelectingReturn, outbound])

  const returnTrips = returnRes?.trips ?? []
  const returnSlidDate = returnRes?.slidDate ?? null

  // İndirimli round-trip = reverse-pair (aynı firma + ters rota), ferryPairPrices &
  // groupFerryLegs ile AYNI tespit. Açık-jaw (Kos→Turgutreis) → false → not yok.
  // Sadece özet notu için; money-path değil.
  const isRoundTripPair =
    state.searchParams.tripType === 'round-trip' &&
    !!outbound && !!returnF &&
    isReversePair(outbound, returnF)

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
      return
    }
    // Round-trip return leg stale-guard: seçili dönüş, güncel returnFrom/returnTo
    // (klasik fallback = to/from) ile eşleşmiyorsa geçersiz → temizle. Açık-jaw
    // rota değişiminde özetin hayalet dönüş bacağı göstermesini engeller.
    if (state.searchParams.tripType === 'round-trip') {
      const ret = state.items.find(
        (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return'
      )
      if (ret) {
        const sp = state.searchParams
        const retOk = ret.ferry.from.id === (sp.returnFrom ?? sp.to)
                   && ret.ferry.to.id === (sp.returnTo ?? sp.from)
        if (!retOk) {
          dispatch({ type: 'CLEAR_RETURN_FERRY' })
          setIsSelectingReturn(false)
        }
      }
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
    })()
    return () => { cancelled = true }
    // Dönüş artık ayrı effect'te (returnRes) — fiili outbound.date'e re-key + MCT.
  }, [state.searchParams])

  const handleSelectFerry = (ferry: FerryTrip) => {
    dispatch({ type: 'SELECT_FERRY', payload: ferry })
    
    if (state.searchParams.tripType === 'round-trip') {
      setIsSelectingReturn(true)
    }
  }

  const handleSelectReturnFerry = (ferry: FerryTrip) => {
    if (!outbound) return
    // Son savunma — TEK KAPI: hangi yoldan gelirse gelsin 3h MCT'den geçmeyen
    // dönüş reserve'e GİREMEZ. Gate liste+nearest'ı süzdüğü için normalde hiç
    // ateşlenmez; UI bir şey kaçırırsa money-path'i korur.
    if (!qualifiesReturn(outbound, ferry)) {
      console.warn('[ferry] return blocked by 3h MCT gate', { obDate: outbound.date, obArr: outbound.arrivalTime, retDate: ferry.date, retDep: ferry.departureTime })
      return
    }
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
  // Açık-jaw dönüş: kalkış = returnFrom (klasik fallback to), varış = returnTo
  // (klasik fallback from). Klasik gidiş-dönüşte returnFromCity=toCity ve
  // returnToCity=fromCity → mevcut gösterimle birebir aynı kalır.
  const returnFromCity = portName(state.searchParams.returnFrom ?? state.searchParams.to)
  const returnToCity = portName(state.searchParams.returnTo ?? state.searchParams.from)

  // Servis chip'leri — extras dili: active = sepette item var. Aşamaya göre eyebrow.
  const serviceChips: { key: string; tone: ServiceTone; Icon: typeof Ship; active: boolean }[] = [
    { key: 'ferry', tone: 'ferry', Icon: Ship, active: !!outbound },
    { key: 'car', tone: 'car', Icon: Car, active: state.items.some((i) => i.type === 'car_rental') },
    { key: 'luggage', tone: 'luggage', Icon: Luggage, active: state.items.some((i) => i.type === 'luggage') },
    { key: 'transfer', tone: 'transfer', Icon: Bus, active: state.items.some((i) => i.type === 'transfer') },
  ]
  const eyebrow = isSelectingReturn ? t('eyebrow.return') : t('eyebrow.outbound')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Header Bar — foto banner (desktop) / mavi gradient (mobil), beyaz metin */}
        <section className="relative w-full overflow-hidden bg-gradient-to-r from-blue-950 to-blue-800 py-6 text-white">
          {/* Görsel yalnız desktop; mobilde alt gradient görünür. bg-right → odak sağda. */}
          <div
            className="absolute inset-0 hidden bg-cover bg-right md:block"
            style={{ backgroundImage: "url('/services/ferry-results-banner.webp')" }}
          />
          {/* Okunabilirlik perdesi — soldan koyu, sağa şeffaf (görsel sağda kalır). */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-blue-950/85 via-blue-950/50 to-transparent md:block" />
          <div className="container relative px-4 md:px-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Link href="/ferry">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{eyebrow}</p>
                  <div className="flex flex-wrap items-center gap-2 text-2xl font-bold md:text-3xl">
                    <span>{fromCity}</span>
                    <ArrowRight className="h-5 w-5 text-amber-300" />
                    <span>{toCity}</span>
                    {state.searchParams.tripType === 'round-trip' && (
                      <>
                        <ArrowRight className="h-5 w-5 text-amber-300" />
                        <span>{returnToCity}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-white/80">
                    {state.searchParams.date} · {t('passengers', { count: state.searchParams.passengers })}
                    {state.searchParams.tripType === 'round-trip' && ` · ${t('returnPrefix')} ${returnF?.date ?? state.searchParams.returnDate}`}
                  </p>
                  {/* Servis chip'leri — extras dili: sepette = kendi tone'u, değilse gri ghost. */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {serviceChips.map(({ key, tone, Icon, active }) => (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-medium ${
                          active
                            ? `${SUMMARY_TONE_BG[tone]} ${SUMMARY_TONE_BORDER[tone]} text-slate-900`
                            : TONE_CHIP_INACTIVE
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t(`services.${key}`)}
                        {active && <CheckCircle className="h-3 w-3" />}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-white/15 px-6 py-4 backdrop-blur-md md:min-w-[180px]">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{t('totalPrice')}</p>
                <p className="text-3xl font-bold">€{selectTotalPrice(state)}</p>
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
                          {t('returnHeading', { to: returnFromCity, from: returnToCity })}
                        </h2>
                      </div>
                      <Badge variant="secondary">{t('ferriesFound', { count: returnTrips.length })}</Badge>
                    </div>

                    {returnRes === null ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : returnTrips.length > 0 ? (
                      <div className="space-y-4">
                        {/* Aynı gün gate-geçen yok → +1 güne kaydık → kullanıcıya neden. */}
                        {returnSlidDate && (
                          <Card className="bg-card border-border/50">
                            <CardContent className="p-6 text-center">
                              <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                              <p className="text-destructive font-medium">{t('noSameDayConnection.title', { date: returnSlidDate })}</p>
                            </CardContent>
                          </Card>
                        )}
                        {returnTrips.map((ferry, index) => (
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
                        result={returnRes.result}
                        selectedId={returnF?.id}
                        onSelectNearest={handleSelectReturnFerry}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-foreground mb-6">{t('bookingSummary')}</h3>
                      
                      {outbound ? (
                        <div className="space-y-4">
                          <div className={`p-3 rounded-xl border-l-2 ${SUMMARY_TONE_BG.ferry} ${SUMMARY_TONE_BORDER.ferry}`}>
                            <p className="text-xs text-muted-foreground mb-1">{t('outbound')}</p>
                            <p className="font-medium text-foreground text-sm">{outbound.from.name} → {outbound.to.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDateShort(outbound.date, locale)} · {outbound.departureTime} · {outbound.operator}</p>
                          </div>

                          {returnF && (
                            <div className={`p-3 rounded-xl border-l-2 ${SUMMARY_TONE_BG.ferry} ${SUMMARY_TONE_BORDER.ferry}`}>
                              <p className="text-xs text-muted-foreground mb-1">{t('return')}</p>
                              <p className="font-medium text-foreground text-sm">{returnF.from.name} → {returnF.to.name}</p>
                              <p className="text-xs text-muted-foreground">{formatDateShort(returnF.date, locale)} · {returnF.departureTime} · {returnF.operator}</p>
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
                            {isRoundTripPair && (
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
