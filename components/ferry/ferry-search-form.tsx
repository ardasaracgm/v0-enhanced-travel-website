'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/routing'
import { ArrowLeftRight, Minus, Plus } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useBooking } from '@/lib/booking-context'
import { getDeparturePortsAction, getArrivalPortsAction, type CatalogPort } from '@/lib/actions/ferry-catalog'
import { getRouteScheduleAction, type RouteAvailability } from '@/lib/actions/ferry-search'
import { PortCombobox } from '@/components/ferry/port-combobox'
import { DateRangeField } from '@/components/ferry/date-range-field'

// Yolcu üst sınırı: Dentur'da sabit per-rezervasyon cap YOK (paxlimit probe ile
// kanıtlandı — 8 pax/390 koltuk kabul); tavan sefer kotası. 11 = makul üst sınır
// (Ferryhopper 9 / Yeşil Marmaris 10 referans). Insurance MAX_TRAVELLERS=9'dan
// AYRI bilinçli (farklı domain). Fiyat lineer → money-path etkilenmez.
const FERRY_MIN_PAX = 1
const FERRY_MAX_PAX = 11
const clampPax = (n: number) =>
  Math.min(FERRY_MAX_PAX, Math.max(FERRY_MIN_PAX, Number.isFinite(n) ? n : FERRY_MIN_PAX))

interface FerrySearchFormProps {
  /** <Card>'a eklenir — çağıran bağlamın (ferry sayfası / hero) stil farkı. */
  className?: string
  /** Form açılış değerleri. Verilmezse bugünkü default (bodrum/kos/''/2/one-way).
   *  Yalnız MOUNT anında okunur (useState initializer) — sonradan değişmesi için
   *  çağıran taraf key ile remount eder. Routes "Book" butonu from/to ön-doldurmak
   *  için kullanır. Prop verilmeyince davranış birebir bugünküyle aynı. */
  initial?: Partial<{
    from: string; to: string; date: string; passengers: string
    tripType: 'one-way' | 'round-trip'; returnDate: string; returnTo: string
  }>
  /** true → <Card>/<CardContent> sarmalayıcıyı atla, sadece iç içeriği (başlık
   *  satırı + grid) bir <div className={cn('p-6 md:p-8', className)}> içinde render
   *  et. Hero gibi kendi kartı olan bir kabın içine çift-kart/çift-padding olmadan
   *  gömmek için (Parça 2b tüketir). Verilmezse bugünkü <Card> çıktısı birebir. */
  bare?: boolean
}

/**
 * Ferry arama formu — ferry/page.tsx'ten extract (Parça 1, saf refactor).
 * Tek kaynak: hem ferry sayfası hem ana sayfa hero kullanır. Davranış birebir;
 * RESET_CART → SET_SEARCH_PARAMS → push('/ferry/results') zinciri değişmez.
 */
export function FerrySearchForm({ className, initial, bare }: FerrySearchFormProps) {
  const t = useTranslations('ferryPage')
  const locale = useLocale()
  const router = useRouter()
  const { dispatch } = useBooking()
  const [tripType, setTripType] = React.useState<'one-way' | 'round-trip'>(initial?.tripType ?? 'one-way')
  const [from, setFrom] = React.useState(initial?.from ?? 'bodrum')
  const [to, setTo] = React.useState(initial?.to ?? 'kos')
  const [date, setDate] = React.useState(initial?.date ?? '')
  const [returnDate, setReturnDate] = React.useState(initial?.returnDate ?? '')
  const [returnTo, setReturnTo] = React.useState(initial?.returnTo ?? '')
  const [passengers, setPassengers] = React.useState(initial?.passengers ?? '2')
  const [departures, setDepartures] = React.useState<CatalogPort[]>([])
  const [arrivals, setArrivals] = React.useState<CatalogPort[]>([])
  // Dönüş varış kataloğu: kalkışı = outbound varışı ('to'). Adım 2 deseni.
  const [returnArrivals, setReturnArrivals] = React.useState<CatalogPort[]>([])
  // Sefer-availability: seçili OUTBOUND hat (from→to) sezon takvimi.
  const [availability, setAvailability] = React.useState<RouteAvailability | null>(null)

  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  // Display name by locale, with en→tr fallback (el may be a TODO in ports.ts).
  const portLabel = React.useCallback(
    (p: CatalogPort) => p.name[locale as 'tr' | 'en' | 'el'] ?? p.name.en ?? p.name.tr,
    [locale],
  )

  // Load the live departure catalog once.
  React.useEffect(() => {
    let alive = true
    getDeparturePortsAction().then((d) => { if (alive) setDepartures(d) })
    return () => { alive = false }
  }, [])

  // Dependent arrivals: refetch when departure changes; reset a now-invalid 'to'.
  React.useEffect(() => {
    let alive = true
    getArrivalPortsAction(from).then((a) => {
      if (!alive) return
      setArrivals(a)
      setTo((prev) => (a.some((p) => p.slug === prev) ? prev : a[0]?.slug ?? ''))
    })
    return () => { alive = false }
  }, [from])

  // Açık-jaw dönüş varışları: dönüş kalkışı = outbound varışı ('to').
  // Default seçim = outbound kalkışı ('from') → klasik gidiş-dönüş (byte-identical).
  React.useEffect(() => {
    if (tripType !== 'round-trip' || !to) { setReturnArrivals([]); return }
    let alive = true
    getArrivalPortsAction(to).then((a) => {
      if (!alive) return
      setReturnArrivals(a)
      setReturnTo((prev) => {
        const want = prev || from
        return a.some((p) => p.slug === want) ? want : a[0]?.slug ?? ''
      })
    })
    return () => { alive = false }
  }, [tripType, to, from])

  // Sefer-availability: seçili OUTBOUND hat (from→to) için sezon takvimi — sefersiz
  // günler kapatılır. Eager (arrivals deseni gibi) from/to değişince çeker; server
  // 5-dk cache. Round-trip MVP: dönüş bacağı ayrı hat olsa da takvim outbound'u
  // kısıtlar (dönüş rafine sonra; nearest-fallback dönüşte devrede). SALT GÖRÜNTÜ.
  React.useEffect(() => {
    if (!from || !to) { setAvailability(null); return }
    let alive = true
    getRouteScheduleAction(from, to).then((a) => { if (alive) setAvailability(a) })
    return () => { alive = false }
  }, [from, to])

  // availability → DateRangeField.disabledDates. Yokken (loading / rota yok) boş Set
  // → tüm günler açık (Adım 1 davranışı). Money-path dışı, salt takvim kısıtı.
  const disabledDateSet = React.useMemo(
    () => new Set(availability?.disabledDates ?? []),
    [availability],
  )

  // Dönüş kalkışı = outbound varışı ('to'); ayrı alan yerine returnTo etiketinde
  // satır-içi gösterilir (tek-satır form). Salt görüntü — handleSearch returnFrom'u
  // doğrudan 'to'dan türetir, money-path değişmez.
  const toName = (() => {
    const p = arrivals.find((x) => x.slug === to)
    return p ? portLabel(p) : to
  })()

  // Catalog still loading (departures empty) or no valid arrival picked → block search.
  // Round-trip → dönüş varışı da seçili olmalı (açık-jaw veya klasik).
  const canSearch =
    departures.length > 0 && !!from && !!to &&
    // Round-trip → dönüş varışı VE dönüş tarihi zorunlu (yarım-range engeli:
    // gidiş seçilip dönüş seçilmemiş aralıkla aramayı bloke eder).
    (tripType !== 'round-trip' || (!!returnTo && !!returnDate))

  const swapPorts = () => {
    // from↔to çevir; arrivals / returnArrivals / availability effect'leri (from/to
    // deps) otomatik yeniden çalışır → katalog + takvim doğru refetch. Money-path
    // dışı — yalnız mevcut UI setter'ları.
    setFrom(to)
    setTo(from)
  }

  const handleSearch = () => {
    if (!canSearch) return
    // Gerçek yeni arama → eski sepeti at (stale ferry/ekstra birikmesin). Yalnız
    // burada; adımlar arası ve results-içi gezinme sepeti korur.
    dispatch({ type: 'RESET_CART' })
    dispatch({
      type: 'SET_SEARCH_PARAMS',
      payload: {
        from,
        to,
        date,
        passengers: parseInt(passengers),
        tripType,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        // returnFrom = outbound varışı (hep), returnTo = kullanıcı seçimi.
        // Klasik gidiş-dönüş: returnTo === from → results swap'ıyla byte-identical.
        returnFrom: tripType === 'round-trip' ? to : undefined,
        returnTo: tripType === 'round-trip' ? returnTo : undefined,
      },
    })
    router.push('/ferry/results')
  }

  // İç içerik tek yerde (DRY) — sarmalayıcı bare'e göre değişir, JSX kopyalanmaz.
  const inner = (
    <>
        <div className={bare
          ? 'flex flex-col md:flex-row md:items-center md:justify-end gap-4 mb-3'
          : 'flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6'}>
          {!bare && <h2 className="text-xl font-bold text-foreground">{t('searchTitle')}</h2>}
          <RadioGroup
            value={tripType}
            onValueChange={(value) => setTripType(value as 'one-way' | 'round-trip')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="one-way" id="one-way" />
              <Label htmlFor="one-way" className="cursor-pointer">{t('oneWay')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="round-trip" id="round-trip" />
              <Label htmlFor="round-trip" className="cursor-pointer flex items-center gap-1">
                <ArrowLeftRight className="h-4 w-4" />
                {t('roundTrip')}
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className={bare
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4'}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('fromPort')}</label>
            <PortCombobox
              ports={departures}
              value={from}
              onChange={setFrom}
              placeholder={t('fromPlaceholder')}
              portLabel={portLabel}
              defaultOpenCountry="TR"
              countryLabels={{ TR: t('countryTurkey'), GR: t('countryGreece') }}
            />
          </div>
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-foreground">{t('toPort')}</label>
            {/* from↔to swap — md+ (yan yana) görünür. Mobil dikey stack'te
                swap, merged route box ile (Commit B) gelecek. Salt UI state. */}
            <button
              type="button"
              onClick={swapPorts}
              aria-label={t('swapPorts')}
              className="hidden md:flex absolute -left-6 top-8 z-10 h-8 w-8 items-center justify-center rounded-full border border-input bg-background shadow-sm hover:bg-accent"
            >
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <PortCombobox
              ports={arrivals}
              value={to}
              onChange={setTo}
              placeholder={t('toPlaceholder')}
              portLabel={portLabel}
              defaultOpenCountry="GR"
              countryLabels={{ TR: t('countryTurkey'), GR: t('countryGreece') }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {tripType === 'round-trip'
                ? t('roundTripDates')
                : t('departDate')}
            </label>
            <DateRangeField
              mode={tripType === 'round-trip' ? 'range' : 'single'}
              date={date}
              returnDate={returnDate}
              onDateChange={setDate}
              onReturnDateChange={setReturnDate}
              minDate={todayAthens}
              locale={locale}
              placeholder={t('departDate')}
              disabledDates={disabledDateSet}
            />
          </div>
          {/* Dönüş varışı slot — kolonu HER ZAMAN işgal eder (one-way'de boş
              yer tutar) → tek-yön↔gidiş-dönüş toggle'da ortak 5 alan (Kalkış/
              Varış/Tarih/Yolcu/Ara) aynı pikselde sabit kalır. İçerik sadece
              round-trip'te; dönüş kalkışı (=to) etikette satır-içi. İleride
              multi-leg için doğal slot. Money-path değişmez. */}
          <div className="space-y-2 min-w-0">
            {tripType === 'round-trip' && (
              <>
                <label className="block text-sm font-medium text-foreground truncate">
                  <span className="font-normal text-muted-foreground">{toName} → </span>
                  {t('returnToPort')}
                </label>
                <PortCombobox
                  ports={returnArrivals}
                  value={returnTo}
                  onChange={setReturnTo}
                  placeholder={t('toPlaceholder')}
                  portLabel={portLabel}
                  defaultOpenCountry="GR"
                  countryLabels={{ TR: t('countryTurkey'), GR: t('countryGreece') }}
                />
              </>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('passengersLabel')}</label>
            {/* Stepper: elle yazılabilir + -/+ . min 1, max FERRY_MAX_PAX.
                setPassengers string besler (mevcut sözleşme; handleSearch
                parseInt eder → searchParams.passengers number). Money-path
                değişmez — sadece değer aralığı 5→11. */}
            <div className="flex h-10 items-stretch rounded-md border border-input bg-background">
              <button
                type="button"
                aria-label={t('passengersDecrease')}
                onClick={() => setPassengers(String(clampPax(parseInt(passengers || '1', 10) - 1)))}
                disabled={parseInt(passengers || '1', 10) <= FERRY_MIN_PAX}
                className="flex w-9 shrink-0 items-center justify-center rounded-l-md text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={passengers}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setPassengers(raw === '' ? '' : String(clampPax(parseInt(raw, 10))))
                }}
                onBlur={() => { if (passengers === '') setPassengers(String(FERRY_MIN_PAX)) }}
                className="w-full min-w-0 border-x border-input bg-transparent text-center text-sm focus:outline-none"
              />
              <button
                type="button"
                aria-label={t('passengersIncrease')}
                onClick={() => setPassengers(String(clampPax(parseInt(passengers || '1', 10) + 1)))}
                disabled={parseInt(passengers || '1', 10) >= FERRY_MAX_PAX}
                className="flex w-9 shrink-0 items-center justify-center rounded-r-md text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">&nbsp;</label>
            <Button
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSearch}
              disabled={!canSearch}
            >
              {t('searchButton')}
            </Button>
          </div>
        </div>
    </>
  )

  // bare: kendi kartı olan kabın (hero) içine düz gömme — padding korunur,
  // Card/CardContent chrome atlanır. className padding'i de override edebilir (twMerge).
  if (bare) {
    return <div className={cn('p-4 md:p-5', className)}>{inner}</div>
  }

  return (
    <Card className={cn('border-0 shadow-2xl bg-card', className)}>
      <CardContent className="p-6 md:p-8">{inner}</CardContent>
    </Card>
  )
}
