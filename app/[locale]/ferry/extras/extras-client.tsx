'use client'

import * as React from 'react'
import Image from 'next/image'
import { Link, useRouter } from '@/i18n/routing'
import { Car, ChevronLeft, ArrowRight, CheckCircle, AlertCircle, Fuel, Users, Settings, Luggage, Info, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'

import {
  useBooking,
  selectOutboundFerry,
  selectReturnFerry,
  selectCarRental,
  selectTotalPrice,
  type FerryBookingItem,
  type LuggageBookingItem,
} from '@/lib/booking-context'
import { dateDiffInDays, type NormalizedCar } from '@/lib/normalize-car'
import { LUGGAGE_RATES_EUR, type LuggageCounts } from '@/lib/luggage-rates'
import { isServiceAvailable } from '@/lib/service-availability'
import { checkCarAvailability } from '@/lib/actions/car-availability-action'

const DEFAULT_PICKUP_LOCATION = 'Kos Port'

// UI'da gösterilen boyutlar — 'bag' enum'u kasıtlı dışarıda (small'a eşit, gizli).
const LUGGAGE_SIZES = ['small', 'medium', 'large'] as const
type LuggageDisplaySize = (typeof LUGGAGE_SIZES)[number]

interface ExtrasClientProps {
  cars: NormalizedCar[]
}

export default function ExtrasClient({ cars }: ExtrasClientProps) {
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const t = useTranslations('extrasPage')
  const [selectedCarId, setSelectedCarId] = React.useState<string | null>(null)
  // One-way: no default — user must pick (forced choice). null = not yet chosen.
  const [oneWayDays, setOneWayDays] = React.useState<number | null>(null)
  // Tarih-bazlı müsaitlik: server'dan { carId: kalan_adet }. null = henüz gelmedi.
  const [availability, setAvailability] = React.useState<Record<string, number> | null>(null)
  const [availLoading, setAvailLoading] = React.useState(false)

  // Luggage UI state (display); cart state reducer'da.
  const luggageItem = state.items.find(
    (i): i is LuggageBookingItem => i.type === 'luggage'
  ) ?? null
  const [luggageCounts, setLuggageCounts] = React.useState<LuggageCounts>({ small: 0, medium: 0, large: 0 })
  const [sizeTipOpen, setSizeTipOpen] = React.useState(false)  // (i) boyut rehberi; mobil tap

  const outboundItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
  ) ?? null
  const returnItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return'
  ) ?? null

  const outbound = selectOutboundFerry(state)
  const returnF  = selectReturnFerry(state)

  // Redirect if the user lands here without an outbound ferry selected
  React.useEffect(() => {
    if (!outboundItem) {
      router.replace('/ferry/results')
    }
  }, [outboundItem, router])

  // Hydrate selection from context on mount (handles back-navigation)
  React.useEffect(() => {
    const existing = selectCarRental(state)
    if (existing) {
      setSelectedCarId(existing.carId)
      if (state.searchParams.tripType !== 'round-trip') {
        setOneWayDays(Math.max(1, existing.days))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Luggage seçimini context'ten hydrate et (back-navigation).
  React.useEffect(() => {
    const existing = state.items.find(
      (i): i is LuggageBookingItem => i.type === 'luggage'
    )
    if (existing) {
      setLuggageCounts(existing.counts)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hizmet görünürlük gate'i — varış adasına göre (searchParams.to, lowercase).
  const dest = state.searchParams.to
  const carAvailable = isServiceAvailable('car_rental', dest)
  const luggageAvailable = isServiceAvailable('luggage', dest)

  // Rota artık bu hizmeti sunmuyorsa sepetten temizle (gizli ama sepette kalmış
  // item checkout'a gitmesin). dispatch stable + flag'ler to'dan türer (extras
  // içinde sabit) → tek temizlik, döngü yok. Çoklu ada (ferry API) ile asıl önem.
  React.useEffect(() => {
    if (!carAvailable) dispatch({ type: 'SET_CAR_RENTAL', payload: null })
    if (!luggageAvailable) dispatch({ type: 'REMOVE_LUGGAGE' })
  }, [carAvailable, luggageAvailable, dispatch])

  const isRoundTrip = state.searchParams.tripType === 'round-trip'
  // outboundItem null iken de türetilebilsin diye guard'dan önce; null'da 1
  // (zaten aşağıda return null). round-trip = takvim günü dahil; one-way = seçici.
  const days = !outboundItem
    ? 1
    : isRoundTrip
      ? Math.max(1, dateDiffInDays(outboundItem.date, returnItem?.date ?? outboundItem.date) + 1)
      : Math.max(1, oneWayDays ?? 1)

  // One-way needs an explicit day choice before the car can be added / user proceeds.
  const dayChosen = isRoundTrip || oneWayDays != null

  // Pickup tarihi / gün sayısı değişince müsaitliği server'dan çek. Race koruması:
  // hızlı gün değişiminde eski cevap yenisini ezmesin (cancelled flag).
  React.useEffect(() => {
    if (!outboundItem || !carAvailable) return
    let cancelled = false
    setAvailLoading(true)
    checkCarAvailability(outboundItem.date, days)
      .then(res => {
        if (cancelled) return
        if (res.ok) setAvailability(res.availability)
      })
      .finally(() => { if (!cancelled) setAvailLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outboundItem?.date, days, carAvailable])

  // Seçili araç bu tarihlerde dolduysa seçimi geri al (context'ten de çıkar).
  React.useEffect(() => {
    if (!availability || !selectedCarId) return
    if (availability[selectedCarId] === 0) {
      setSelectedCarId(null)
      dispatch({ type: 'SET_CAR_RENTAL', payload: null })
    }
  }, [availability, selectedCarId, dispatch])

  if (!outboundItem || !outbound) return null

  // Luggage türetilmiş: canlı toplam fiyat (1 gün; display-only). Başlıkta koşulsuz gösterilir.
  const luggageTotalPrice = LUGGAGE_SIZES.reduce((sum, s) => sum + luggageCounts[s] * LUGGAGE_RATES_EUR[s], 0)

  // Özet satırı için çok-boyut kırılımı, ör. "2× Küçük, 1× Büyük" (cart'taki item'dan).
  const luggageBreakdown = luggageItem
    ? LUGGAGE_SIZES.filter(s => luggageItem.counts[s] > 0)
        .map(s => `${luggageItem.counts[s]}× ${t(`luggage.size.${s}`)}`)
        .join(', ')
    : ''

  function dispatchCarSelection(car: NormalizedCar, dayCount: number) {
    dispatch({
      type: 'SET_CAR_RENTAL',
      payload: {
        carId: car.id,
        model: car.model,
        pricePerDay: car.price,
        days: dayCount,
        pickupLocation: DEFAULT_PICKUP_LOCATION,
        dropoffLocation: DEFAULT_PICKUP_LOCATION,
        pickupAt: outboundItem!.date,
        dropoffAt: returnItem?.date ?? outboundItem!.date,
      },
    })
  }

  function handleSelectCar(car: NormalizedCar) {
    if (selectedCarId === car.id) {
      setSelectedCarId(null)
      dispatch({ type: 'SET_CAR_RENTAL', payload: null })
      return
    }
    setSelectedCarId(car.id)
    // One-way w/o a chosen day: highlight only, don't add to cart yet (forced choice).
    if (dayChosen) dispatchCarSelection(car, days)
  }

  function handleDaysChange(newDays: number) {
    setOneWayDays(newDays)
    if (selectedCarId) {
      const car = cars.find(c => c.id === selectedCarId)
      if (car) dispatchCarSelection(car, newDays)
    }
  }

  function handleContinue() {
    if (selectedCarId != null && !dayChosen) return  // guard: must pick rental days
    router.push('/ferry/passenger-details')
  }

  function handleSkip() {
    dispatch({ type: 'SET_CAR_RENTAL', payload: null })
    router.push('/ferry/passenger-details')
  }

  // Tarihsiz: drop = pickup = feribot geliş tarihi, 1 gün. priceAmount display-only
  // (sunucu submitBooking'de calculateLuggageTotalCents ile yeniden hesaplar).
  function dispatchLuggage(counts: LuggageCounts) {
    const total = LUGGAGE_SIZES.reduce((sum, s) => sum + counts[s], 0)
    dispatch({
      type: 'SET_LUGGAGE',
      payload: {
        counts,
        dropOffDate: outboundItem!.date,
        pickupDate: outboundItem!.date,
        location: 'kos_port',
        priceAmount: LUGGAGE_SIZES.reduce((sum, s) => sum + counts[s] * LUGGAGE_RATES_EUR[s], 0),
        title: t('luggage.pieceCount', { count: total }),
      },
    })
  }

  // Chip = 0→1→2→…→5→0 döngü. Auto-sync: Σ≥1 → sepete upsert, Σ=0 → sepetten
  // çıkar (Σ<1 geçersiz). Ayrı "Ekle" butonu yok; chip anında Özet'e yansır.
  function handleCycleLuggageSize(size: LuggageDisplaySize) {
    const next = { ...luggageCounts, [size]: (luggageCounts[size] + 1) % 6 }
    setLuggageCounts(next)
    const total = LUGGAGE_SIZES.reduce((sum, s) => sum + next[s], 0)
    if (total >= 1) dispatchLuggage(next)
    else dispatch({ type: 'REMOVE_LUGGAGE' })
  }

  // Özet'teki × — valizi komple kaldır: chip sayaçlarını da sıfırla, cart'tan çıkar.
  function handleRemoveLuggage() {
    setLuggageCounts({ small: 0, medium: 0, large: 0 })
    dispatch({ type: 'REMOVE_LUGGAGE' })
  }

  const selectedCar = cars.find(c => c.id === selectedCarId) ?? null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Header Bar */}
        <section className="w-full py-6 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/ferry/results">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <span>{outbound.from}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{outbound.to}</span>
                  </div>
                  <p className="text-sm text-primary-foreground/80">
                    {state.searchParams.date} · {t('passengerCount', { count: state.searchParams.passengers })}
                    {isRoundTrip && ` · ${t('returnPrefix')} ${state.searchParams.returnDate}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-foreground/80">{t('totalPrice')}</p>
                <p className="text-2xl font-bold">€{selectTotalPrice(state)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Bar — 4 steps */}
        <section className="w-full py-4 border-b border-border/50 bg-card">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted-foreground">{t('steps.selectFerry')}</span>
              </div>
              <div className="w-10 h-0.5 bg-primary" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-primary">{t('steps.extras')}</span>
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

        {/* Luggage drop-off — yalnız emanet sunulan adalarda (gate); tam genişlik
            (sigorta ödeme adımına taşındı). */}
        {luggageAvailable && (
        <section className="w-full pt-8 md:pt-12">
          <div className="container px-4 md:px-6">
            <div>
              <div>
                <Card className="bg-card border-2 border-border/50">
                  <CardContent className="p-5 space-y-4">
                    {/* Heading + slogan — ince üst; sağ üstte (i) boyut rehberi */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Luggage className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground leading-tight">{t('luggage.heading')}</h2>
                          <p className="text-xs text-muted-foreground">{t('luggage.subheading')}</p>
                        </div>
                      </div>

                      {/* Sağ grup: canlı toplam (koşulsuz, Toplam: €0'dan başlar) + (i) boyut rehberi */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                          {t('total')}: <span className="text-primary">€{luggageTotalPrice}</span>
                        </span>
                      {/* Boyut rehberi — (i) hover (desktop) / tap (mobil); İngilizce hardcode, fiyat YOK */}
                      <Popover open={sizeTipOpen} onOpenChange={setSizeTipOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Luggage size guide"
                            onPointerEnter={e => { if (e.pointerType === 'mouse') setSizeTipOpen(true) }}
                            onPointerLeave={e => { if (e.pointerType === 'mouse') setSizeTipOpen(false) }}
                            className="shrink-0 text-sky-600 hover:text-primary transition-colors"
                          >
                            <Info className="h-5 w-5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="left"
                          align="start"
                          className="w-auto max-w-sm p-0"
                          onOpenAutoFocus={e => e.preventDefault()}
                        >
                          <div className="divide-y divide-border text-xs">
                            <div className="px-3 py-2 font-medium text-foreground">Size guide</div>
                            <div className="px-3 py-2">
                              <p className="font-semibold text-foreground">Small (S)</p>
                              <p className="text-muted-foreground">Cabin bag · 55×40×25 cm · Backpack, carry-on</p>
                            </div>
                            <div className="px-3 py-2">
                              <p className="font-semibold text-foreground">Medium (M)</p>
                              <p className="text-muted-foreground">Checked bag · 70×45×30 cm · 4–7 day suitcase</p>
                            </div>
                            <div className="px-3 py-2">
                              <p className="font-semibold text-foreground">Large (L)</p>
                              <p className="text-muted-foreground">Large checked · 80×55×35+ cm · Family / long-trip case</p>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      </div>
                    </div>

                    {/* Tek satır: boyut segment + adet + ekle (mobilde wrap) */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Boyut chip'leri — yatay, kendi aralarında eşit esner (flex-1); adet/buton sabit */}
                      <div className="flex-1 flex items-center gap-2 min-w-[12rem]">
                        {LUGGAGE_SIZES.map(size => {
                          const count = luggageCounts[size]
                          const selected = count >= 1
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleCycleLuggageSize(size)}
                              className={`relative flex-1 flex flex-col items-center rounded-xl border-2 px-3 py-1.5 transition-all ${
                                selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                              }`}
                            >
                              {/* ×N rozeti ilk parçadan itibaren (×1 dahil) */}
                              {count >= 1 && (
                                <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                  ×{count}
                                </span>
                              )}
                              <span className="text-sm font-medium text-foreground leading-tight whitespace-nowrap">{t(`luggage.size.${size}`)}</span>
                              <span className="text-xs font-semibold text-primary">
                                €{LUGGAGE_RATES_EUR[size]}<span className="font-normal text-muted-foreground">{t('perDay')}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Car Grid */}
        <section className="w-full py-8 md:py-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-8">

              {/* Araç — yalnız araç sunulan adalarda (gate). Sidebar (sağ) hep kalır. */}
              {carAvailable && (
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">{t('heading')}</h2>
                  <p className="text-muted-foreground">
                    {t('subheading', { location: DEFAULT_PICKUP_LOCATION })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{t('dailyRateNotice')}</p>
                </div>

                {/* One-way day selector */}
                {!isRoundTrip && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{t('howManyDays')}</span>
                    <Select
                      value={oneWayDays != null ? String(oneWayDays) : undefined}
                      onValueChange={v => handleDaysChange(Number(v))}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder={t('selectDays')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 14 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {t('dayCount', { count: n })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Round-trip: computed days, read-only */}
                {isRoundTrip && returnItem && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('rentalDuration')}</span>
                    <span className="font-medium text-foreground">
                      {t('dayCount', { count: days })}
                      <span className="font-normal text-muted-foreground ml-1">
                        ({outboundItem.date} → {returnItem.date})
                      </span>
                    </span>
                  </div>
                )}

                {/* Empty state */}
                {cars.length === 0 && (
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">{t('noCarsTitle')}</h3>
                      <p className="text-muted-foreground mb-4">{t('noCarsBody')}</p>
                      <Button onClick={handleSkip} variant="outline">{t('continueWithoutCar')}</Button>
                    </CardContent>
                  </Card>
                )}

                {/* Tüm araçlar bu tarihlerde dolu — boş-state pattern'iyle bilgilendir */}
                {cars.length > 0 && availability != null && cars.every(c => (availability[c.id] ?? 0) === 0) && (
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">{t('car.allRented')}</p>
                      <Button onClick={handleSkip} variant="outline">{t('continueWithoutCar')}</Button>
                    </CardContent>
                  </Card>
                )}

                {/* Car cards */}
                <div className={`grid sm:grid-cols-2 gap-4 ${availLoading ? 'opacity-60 transition-opacity' : ''}`}>
                  {cars.map((car, index) => {
                    const isSelected = selectedCarId === car.id
                    const lineTotal = car.price * days
                    const qty = availability?.[car.id]
                    const isUnavailable = availability != null && qty === 0
                    return (
                      <motion.div
                        key={car.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Card
                          className={`bg-card border-2 transition-all ${
                            isUnavailable
                              ? 'opacity-50 cursor-not-allowed pointer-events-none border-border/50'
                              : isSelected
                                ? 'border-primary shadow-lg cursor-pointer hover:shadow-lg'
                                : 'border-border/50 hover:border-primary/50 cursor-pointer hover:shadow-lg'
                          }`}
                          onClick={() => { if (!isUnavailable) handleSelectCar(car) }}
                        >
                          <CardContent className="p-0">
                            <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                              <Image
                                src={car.image}
                                alt={car.model}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                              {car.badge && (
                                <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                                  {car.badge}
                                </Badge>
                              )}
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                                </div>
                              )}
                              {isUnavailable && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                                  <Badge variant="secondary" className="bg-background/90 text-foreground gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {t('car.unavailable')}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <div className="p-4 space-y-3">
                              <div>
                                <p className="font-semibold text-foreground">{car.model}</p>
                                <p className="text-xs text-muted-foreground">{car.type}</p>
                              </div>

                              {/* Spec chips */}
                              <div className="flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground">
                                  <Fuel className="h-3 w-3" />
                                  {car.specs.fuel}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground">
                                  <Users className="h-3 w-3" />
                                  {t('seatCount', { count: Number(car.specs.seats) })}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full px-2 py-0.5 text-secondary-foreground">
                                  <Settings className="h-3 w-3" />
                                  {car.specs.transmission}
                                </span>
                              </div>

                              {/* Pricing */}
                              <div className="flex items-end justify-between pt-1">
                                <div>
                                  <p className="text-xl font-bold text-primary">€{car.price}<span className="text-sm font-normal text-muted-foreground">{t('perDay')}</span></p>
                                  {dayChosen && (
                                    <p className="text-xs text-muted-foreground">
                                      {t('dayCount', { count: days })} = <span className="font-medium text-foreground">€{lineTotal}</span>
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant={isSelected ? 'default' : 'outline'}
                                  className={isSelected ? 'bg-primary text-primary-foreground' : ''}
                                  onClick={e => { e.stopPropagation(); handleSelectCar(car) }}
                                >
                                  {isSelected ? (
                                    <><CheckCircle className="h-3.5 w-3.5 mr-1" />{t('added')}</>
                                  ) : (
                                    <><Car className="h-3.5 w-3.5 mr-1" />{t('add')}</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
              )}

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-bold text-foreground">{t('bookingSummary')}</h3>

                      {/* Ferry lines */}
                      <div className="p-3 bg-secondary/50 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">{t('outboundFerry')}</p>
                        <p className="font-medium text-foreground text-sm">{outbound.from} → {outbound.to}</p>
                        <p className="text-xs text-muted-foreground">{outbound.departureTime} · {outbound.operator}</p>
                      </div>

                      {returnF && (
                        <div className="p-3 bg-secondary/50 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">{t('returnFerry')}</p>
                          <p className="font-medium text-foreground text-sm">{returnF.from} → {returnF.to}</p>
                          <p className="text-xs text-muted-foreground">{returnF.departureTime} · {returnF.operator}</p>
                        </div>
                      )}

                      {/* Selected car */}
                      {selectedCar && dayChosen && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-1">{t('carRental')}</p>
                          <p className="font-medium text-foreground text-sm">{selectedCar.model}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('dayCount', { count: days })} · {DEFAULT_PICKUP_LOCATION}
                          </p>
                          <p className="text-primary text-sm font-semibold mt-1">€{selectedCar.price * days}</p>
                        </div>
                      )}

                      {/* Valiz emaneti — cart'taki item'dan; × ile komple kaldır */}
                      {luggageItem && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">{t('luggage.summaryLabel')}</p>
                              <p className="font-medium text-foreground text-sm">{luggageBreakdown}</p>
                              <p className="text-primary text-sm font-semibold mt-1">€{luggageItem.priceAmount}</p>
                            </div>
                            <button
                              type="button"
                              aria-label={t('luggage.removeAria')}
                              onClick={handleRemoveLuggage}
                              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span className="text-foreground">{t('total')}</span>
                          <span className="text-primary">€{selectTotalPrice(state)}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleContinue}
                        disabled={selectedCarId != null && !dayChosen}
                      >
                        {t('continueToPassengers')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      {selectedCarId != null && !dayChosen && (
                        <p className="text-sm text-destructive text-center">{t('selectDayWarning')}</p>
                      )}

                      <Button
                        variant="ghost"
                        className="w-full text-muted-foreground hover:text-foreground"
                        onClick={handleSkip}
                      >
                        {t('skipNoCar')}
                      </Button>
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
