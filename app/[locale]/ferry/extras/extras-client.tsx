'use client'

import * as React from 'react'
import Image from 'next/image'
import { Link, useRouter } from '@/i18n/routing'
import { Car, ChevronLeft, ChevronRight, ArrowRight, CheckCircle, AlertCircle, Fuel, Users, Settings, Luggage, Info, X, Bus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

import { BookingStepper } from '@/components/booking/stepper'
import { DateRangeField } from '@/components/ferry/date-range-field'
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
  type CarRentalBookingItem,
  type LuggageBookingItem,
  type TransferBookingItem,
} from '@/lib/booking-context'
import { dateDiffInDays, type NormalizedCar } from '@/lib/normalize-car'
import { summarizeItem } from '@/lib/trip-items/summary'
import { LUGGAGE_RATES_EUR, type LuggageCounts } from '@/lib/luggage-rates'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'
import { isServiceAvailable } from '@/lib/service-availability'
import { checkModelAvailability } from '@/lib/actions/car-availability-action'
import { serviceVisual, transferVehicleVisual, luggageVisual, type ServiceTone } from '@/lib/service-theme'

const DEFAULT_PICKUP_LOCATION = 'Kos Port'

// UI'da gösterilen boyutlar — 'bag' enum'u kasıtlı dışarıda (small'a eşit, gizli).
const LUGGAGE_SIZES = ['small', 'medium', 'large'] as const
type LuggageDisplaySize = (typeof LUGGAGE_SIZES)[number]

// Özet kutusu sol kenar tone şeridi — checkout OrderSummaryItems diliyle aynı.
// Class literal'i burada (extras taranır); none = görünmez (hizalama korunur).
const SUMMARY_TONE_BORDER: Record<ServiceTone, string> = {
  ferry: 'border-blue-400',
  transfer: 'border-green-400',
  car: 'border-purple-400',
  luggage: 'border-amber-400',
  none: 'border-transparent',
}

// Özet kutusu pastel zemini — checkout TONE_BG ile birebir (app/ taranır,
// purge-safe). Sol şeridin üstüne hizmet rengi zemin.
const SUMMARY_TONE_BG: Record<ServiceTone, string> = {
  ferry: 'bg-blue-50/60',
  transfer: 'bg-green-50/60',
  car: 'bg-purple-50/60',
  luggage: 'bg-amber-50/60',
  none: 'bg-secondary/50',
}

interface ExtrasClientProps {
  cars: NormalizedCar[]
}

export default function ExtrasClient({ cars }: ExtrasClientProps) {
  const router = useRouter()
  const { state, dispatch } = useBooking()
  const t = useTranslations('extrasPage')
  const locale = useLocale()
  const [selectedModelKey, setSelectedModelKey] = React.useState<string | null>(null)
  // Kiralama tarihleri — iki date seçici (standalone /car-rental ile aynı desen).
  // Alış ön-dolu (= gidiş feribotu); teslim round-trip'te dönüş, one-way'de boş
  // (zorunlu seçim). days = dateDiff(pickup,dropoff)+1 (inclusive) — aşağıda türer.
  const [pickupDate, setPickupDate] = React.useState('')
  const [dropoffDate, setDropoffDate] = React.useState('')
  // Date input min'i için bugün (Atina TZ) — standalone ile aynı.
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
  // Tarih-bazlı müsaitlik: server'dan { model_key: müsait_plaka_sayısı }. null = henüz gelmedi.
  const [availability, setAvailability] = React.useState<Record<string, number> | null>(null)
  const [availLoading, setAvailLoading] = React.useState(false)
  // Araç slider yatay scroll ref'i — ok butonları scrollBy ile kullanır (state değil)
  const carScrollRef = React.useRef<HTMLDivElement>(null)

  // Luggage UI state (display); cart state reducer'da.
  const luggageItem = state.items.find(
    (i): i is LuggageBookingItem => i.type === 'luggage'
  ) ?? null
  const [luggageCounts, setLuggageCounts] = React.useState<LuggageCounts>({ small: 0, medium: 0, large: 0 })
  const [sizeTipOpen, setSizeTipOpen] = React.useState(false)  // (i) boyut rehberi; mobil tap

  // Transfer (Bodrum kalkış) UI state; cart state reducer'da. region = kalkış portu.
  const transferItem = state.items.find(
    (i): i is TransferBookingItem => i.type === 'transfer'
  ) ?? null
  const transferRegionId = (state.searchParams.from || '').toLowerCase()
  const transferRegion = TRANSFER_REGIONS[transferRegionId as keyof typeof TRANSFER_REGIONS] ?? null
  const [transferRouteId, setTransferRouteId] = React.useState<string | null>(null)
  const [transferVehicleId, setTransferVehicleId] = React.useState<string | null>(null)
  const [transferOutbound, setTransferOutbound] = React.useState(true)   // gidiş varsayılan açık
  const [transferReturn, setTransferReturn] = React.useState(false)

  const outboundItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
  ) ?? null
  const returnItem = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return'
  ) ?? null
  const carBookingItem = state.items.find(
    (i): i is CarRentalBookingItem => i.type === 'car_rental'
  ) ?? null

  const outbound = selectOutboundFerry(state)
  const returnF  = selectReturnFerry(state)

  // Redirect if the user lands here without an outbound ferry selected
  React.useEffect(() => {
    if (!outboundItem) {
      router.replace('/ferry/results')
    }
  }, [outboundItem, router])

  // Hydrate selection + kiralama tarihlerini context'ten kur ya da varsayılan ver (mount).
  React.useEffect(() => {
    const existing = selectCarRental(state)
    if (existing) {
      setSelectedModelKey(existing.modelKey)
      setPickupDate(existing.pickupAt)
      setDropoffDate(existing.dropoffAt)
    } else if (outboundItem) {
      // Alış = gidiş feribotu (mantıklı başlangıç). Round-trip: teslim = dönüş
      // (tam pencere ön-dolu). One-way: teslim boş → zorunlu seçim (forced choice).
      setPickupDate(outboundItem.date)
      setDropoffDate(
        state.searchParams.tripType === 'round-trip' ? (returnItem?.date ?? '') : ''
      )
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

  // Transfer seçimini context'ten hydrate et (back-navigation).
  React.useEffect(() => {
    const existing = state.items.find(
      (i): i is TransferBookingItem => i.type === 'transfer'
    )
    if (existing) {
      const leg = existing.outbound ?? existing.return
      if (leg) {
        setTransferRouteId(leg.routeId)
        setTransferVehicleId(leg.vehicleId)
      }
      setTransferOutbound(existing.outbound != null)
      setTransferReturn(existing.return != null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hizmet görünürlük gate'i — varış adasına göre (searchParams.to, lowercase).
  const dest = state.searchParams.to
  const carAvailable = isServiceAvailable('car_rental', dest)
  const luggageAvailable = isServiceAvailable('luggage', dest)
  // Transfer kalkış-tarafı (origin = searchParams.from); region anahtarından gate.
  const transferAvailable = isServiceAvailable('transfer', dest, state.searchParams.from)

  // Rota artık bu hizmeti sunmuyorsa sepetten temizle (gizli ama sepette kalmış
  // item checkout'a gitmesin). dispatch stable + flag'ler to'dan türer (extras
  // içinde sabit) → tek temizlik, döngü yok. Çoklu ada (ferry API) ile asıl önem.
  React.useEffect(() => {
    if (!carAvailable) dispatch({ type: 'SET_CAR_RENTAL', payload: null })
    if (!luggageAvailable) dispatch({ type: 'REMOVE_LUGGAGE' })
    if (!transferAvailable) dispatch({ type: 'REMOVE_TRANSFER' })
  }, [carAvailable, luggageAvailable, transferAvailable, dispatch])

  const isRoundTrip = state.searchParams.tripType === 'round-trip'

  // Kiralama günü tarihlerden türer (inclusive): days = dateDiff(pickup,dropoff)+1.
  // İki tarih de seçili ve teslim ≥ alış ise geçerli; aksi halde araç eklenemez
  // (one-way'de teslim boş → forced choice). Gün/fiyat sunucuda yeniden hesaplanır.
  const validRange =
    !!pickupDate && !!dropoffDate && dateDiffInDays(pickupDate, dropoffDate) >= 0
  const days = validRange ? dateDiffInDays(pickupDate, dropoffDate) + 1 : 0
  const dayChosen = validRange

  // Ferry penceresi ÖNERİ (advisory): alış < gidiş veya teslim > dönüş ise yumuşak
  // uyarı; engelleme YOK (uzun konaklama bilinçli olabilir, sunucu da zorlamaz).
  const outsideWindow =
    !!outboundItem &&
    ((!!pickupDate && pickupDate < outboundItem.date) ||
      (!!dropoffDate && !!returnItem && dropoffDate > returnItem.date))

  // Pickup tarihi / gün sayısı değişince müsaitliği server'dan çek. Race koruması:
  // hızlı gün değişiminde eski cevap yenisini ezmesin (cancelled flag).
  React.useEffect(() => {
    if (!carAvailable || !validRange) return
    let cancelled = false
    setAvailLoading(true)
    checkModelAvailability(pickupDate, days)
      .then(res => {
        if (cancelled) return
        if (res.ok) setAvailability(res.availability)
      })
      .finally(() => { if (!cancelled) setAvailLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDate, days, carAvailable, validRange])

  // Seçili araç bu tarihlerde dolduysa seçimi geri al (context'ten de çıkar).
  React.useEffect(() => {
    if (!availability || !selectedModelKey) return
    if (availability[selectedModelKey] === 0) {
      setSelectedModelKey(null)
      dispatch({ type: 'SET_CAR_RENTAL', payload: null })
    }
  }, [availability, selectedModelKey, dispatch])

  // Liste sırası: müsaitler önce, içlerinde server fiyat sırası (ucuz→pahalı) korunur.
  // availability null iken (tarih seçilmemiş/yüklenmemiş) cars'ı AYNEN bırak — zıplama yok.
  // Karşılaştırıcı SADECE müsaitlik (eşitse 0) → JS Array.sort stable (ES2019+) → fiyat
  // sırası ikincil korunur, fiyatı TEKRAR sıralama. qty undefined (fallback filo / aktif
  // plaka yok) === 0 değildir → müsait grupta kalır (isUnavailable mantığıyla tutarlı).
  const sortedCars = React.useMemo(() => {
    return [...cars].sort((a, b) => {
      // coming-soon HER ZAMAN sona — DB flag'i, availability'den bağımsız (car2 paritesi).
      const aCs = a.comingSoon ? 1 : 0
      const bCs = b.comingSoon ? 1 : 0
      if (aCs !== bCs) return aCs - bCs
      // sonra müsaitlik (yalnız yüklendiğinde anlamlı); eşitse 0 → stable sort fiyatı korur.
      if (availability == null) return 0
      const aUnavail = availability[a.id] === 0 ? 1 : 0
      const bUnavail = availability[b.id] === 0 ? 1 : 0
      return aUnavail - bUnavail
    })
  }, [cars, availability])

  if (!outboundItem || !outbound) return null

  // Luggage türetilmiş: canlı toplam fiyat (1 gün; display-only). Başlıkta koşulsuz gösterilir.
  const luggageTotalPrice = LUGGAGE_SIZES.reduce((sum, s) => sum + luggageCounts[s] * LUGGAGE_RATES_EUR[s], 0)

  // Özet satırı için çok-boyut kırılımı, ör. "2× Küçük, 1× Büyük" (cart'taki item'dan).
  const luggageBreakdown = luggageItem
    ? LUGGAGE_SIZES.filter(s => luggageItem.counts[s] > 0)
        .map(s => `${luggageItem.counts[s]}× ${t(`luggage.size.${s}`)}`)
        .join(', ')
    : ''

  // Seçili araç + geçerli tarih aralığı → sepete upsert. pickupAt/dropoffAt gerçek
  // seçili tarihler; days = dateDiff+1 (inclusive). Sunucu fiyatı tarihten yeniden
  // hesaplar (client days display-only). Geçersiz aralıkta no-op.
  function syncCar(carId: string, pAt: string, dAt: string) {
    const car = cars.find(c => c.id === carId)
    if (!car || !pAt || !dAt || dateDiffInDays(pAt, dAt) < 0) return
    const dayCount = dateDiffInDays(pAt, dAt) + 1
    dispatch({
      type: 'SET_CAR_RENTAL',
      payload: {
        modelKey: car.id, // grouped: car.id === model_key
        model: car.model,
        pricePerDay: car.price,
        days: dayCount,
        pickupLocation: DEFAULT_PICKUP_LOCATION,
        dropoffLocation: DEFAULT_PICKUP_LOCATION,
        pickupAt: pAt,
        dropoffAt: dAt,
      },
    })
  }

  // Tarih değişiminde seçili aracı sepetle uyumla: geçerli → upsert, geçersiz →
  // sepetten çıkar (vurgu kalır; tarih tekrar geçerli olunca yeniden eklenir).
  function reconcileCar(carId: string | null, pAt: string, dAt: string) {
    if (!carId) return
    if (!!pAt && !!dAt && dateDiffInDays(pAt, dAt) >= 0) syncCar(carId, pAt, dAt)
    else dispatch({ type: 'SET_CAR_RENTAL', payload: null })
  }

  function handleSelectCar(car: NormalizedCar) {
    if (selectedModelKey === car.id) {
      setSelectedModelKey(null)
      dispatch({ type: 'SET_CAR_RENTAL', payload: null })
      return
    }
    setSelectedModelKey(car.id)
    // Geçerli aralık yoksa (ör. one-way'de teslim seçilmemiş): yalnız vurgula,
    // sepete ekleme (forced choice). Tarih seçilince reconcileCar ekler.
    if (validRange) syncCar(car.id, pickupDate, dropoffDate)
  }

  // Özet'teki × — aracı sepetten kaldır: vurguyu da temizle (handleSelectCar
  // toggle-off ile birebir aynı). Tarih seçicileri korunur — yeniden seçimde
  // kullanılır; ferry-window advisory yalnız araç date-picker'ında görünür,
  // araç seçili değilken zararsız. Başka yan etki yok.
  function handleRemoveCar() {
    setSelectedModelKey(null)
    dispatch({ type: 'SET_CAR_RENTAL', payload: null })
  }

  function handlePickupChange(v: string) {
    setPickupDate(v)
    reconcileCar(selectedModelKey, v, dropoffDate)
  }
  function handleDropoffChange(v: string) {
    setDropoffDate(v)
    reconcileCar(selectedModelKey, pickupDate, v)
  }

  function handleContinue() {
    if (selectedModelKey != null && !dayChosen) return  // guard: must pick valid dates
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

  // Kutu üst köşe × — tek boyutu 0'a sıfırla. handleCycleLuggageSize ile BİREBİR
  // aynı zincir (yalnız next = [size]:0): setLuggageCounts + (Σ≥1 ? dispatchLuggage
  // : REMOVE_LUGGAGE) → dispatchLuggage priceAmount/title'ı yeni counts'tan yeniden
  // hesaplar, böylece toplam/özet/payload tutarlı kalır.
  function handleResetLuggageSize(size: LuggageDisplaySize) {
    const next = { ...luggageCounts, [size]: 0 }
    setLuggageCounts(next)
    const total = LUGGAGE_SIZES.reduce((sum, s) => sum + next[s], 0)
    if (total >= 1) dispatchLuggage(next)
    else dispatch({ type: 'REMOVE_LUGGAGE' })
  }

  const selectedCar = cars.find(c => c.id === selectedModelKey) ?? null

  // Fiyat formatı — kart-içi tutarlı 2 ondalık, locale ayraçlı (TR €37,50 / €28,00).
  const fmtEur = (n: number) =>
    n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Transfer canlı fiyat (display-only; sunucu calculateTransferTotalCents ile re-price).
  const transferRoute = transferRegion?.routes.find((r) => r.id === transferRouteId) ?? null
  const transferPerLegEur =
    transferRoute && transferVehicleId
      ? ((transferRoute.prices as Record<string, number>)[transferVehicleId] ?? 0) / 100
      : 0
  const transferLegCount = (transferOutbound ? 1 : 0) + (transferReturn ? 1 : 0)
  const transferTotalPrice = transferPerLegEur * transferLegCount

  // Seçili araca göre sol flush thumbnail; araç seçilene dek null → görsel gizli.
  const transferVehicleSrc = transferVehicleVisual(transferVehicleId)
  // Aktif boyutlardan (adet>0) sol flush thumbnail; boyut seçilene dek null → gizli.
  const luggageThumbSrc = luggageVisual(LUGGAGE_SIZES.filter(s => luggageCounts[s] > 0))
  // Alt feribot barı thumbnail — gidiş rotasından (serviceVisual ferry → ülke çifti).
  const ferryBarSrc = outboundItem ? serviceVisual(outboundItem).src : null

  // Seçili rota+araç, açık bacak(lar)a kopyalanır → outbound/return. Geçersizse
  // (rota/araç yok ya da iki toggle kapalı) sepetten çıkar. Model iki-bacak kalır.
  function syncTransfer(routeId: string | null, vehicleId: string | null, outOn: boolean, retOn: boolean) {
    if (!transferRegion || !routeId || !vehicleId || (!outOn && !retOn)) {
      dispatch({ type: 'REMOVE_TRANSFER' })
      return
    }
    const leg = { routeId, vehicleId }
    const route = transferRegion.routes.find((r) => r.id === routeId)
    const perLegCents = route ? ((route.prices as Record<string, number>)[vehicleId] ?? 0) : 0
    const legCount = (outOn ? 1 : 0) + (retOn ? 1 : 0)
    dispatch({
      type: 'SET_TRANSFER',
      payload: {
        regionId: transferRegionId,
        outbound: outOn ? leg : undefined,
        return: retOn ? leg : undefined,
        title: `${transferRegion.pickupLabel} ↔ ${route?.label ?? routeId}`,
        priceAmount: (perLegCents * legCount) / 100, // display-only
      },
    })
  }

  function handleTransferRoute(routeId: string) {
    setTransferRouteId(routeId)
    syncTransfer(routeId, transferVehicleId, transferOutbound, transferReturn)
  }
  function handleTransferVehicle(vehicleId: string) {
    setTransferVehicleId(vehicleId)
    syncTransfer(transferRouteId, vehicleId, transferOutbound, transferReturn)
  }
  function handleTransferOutbound(on: boolean) {
    setTransferOutbound(on)
    syncTransfer(transferRouteId, transferVehicleId, on, transferReturn)
  }
  function handleTransferReturn(on: boolean) {
    setTransferReturn(on)
    syncTransfer(transferRouteId, transferVehicleId, transferOutbound, on)
  }
  function handleRemoveTransfer() {
    setTransferRouteId(null)
    setTransferVehicleId(null)
    setTransferOutbound(true)
    setTransferReturn(false)
    dispatch({ type: 'REMOVE_TRANSFER' })
  }

  // Üst hizmet rozetleri — yalnız gate-açık hizmetler; active = sepette mi (salt OKUMA).
  // tone literal'leri SUMMARY_TONE_* üzerinden (purge-safe). id'ler scroll hedefi.
  const serviceBadges: { id: string; Icon: typeof Car; label: string; active: boolean; tone: ServiceTone }[] = []
  if (carAvailable) serviceBadges.push({ id: 'svc-car', Icon: Car, label: t('serviceBadge.car'), active: !!carBookingItem, tone: 'car' })
  if (luggageAvailable) serviceBadges.push({ id: 'svc-luggage', Icon: Luggage, label: t('serviceBadge.luggage'), active: !!luggageItem, tone: 'luggage' })
  if (transferAvailable && transferRegion) serviceBadges.push({ id: 'svc-transfer', Icon: Bus, label: t('serviceBadge.transfer'), active: !!transferItem, tone: 'transfer' })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Header Bar */}
        <section className="w-full py-4 bg-primary text-primary-foreground">
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
                    <span>{outbound.from.name}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{outbound.to.name}</span>
                  </div>
                  <p className="text-sm text-primary-foreground/80">
                    {state.searchParams.date} · {t('passengerCount', { count: state.searchParams.passengers })}
                    {isRoundTrip && ` · ${t('returnPrefix')} ${state.searchParams.returnDate}`}
                  </p>
                </div>
              </div>

              {/* Hizmet rozetleri — bar ortası; gate-açık. Alınmış: tone pastel dolu (koyu yazı,
                  mavi üstünde okunur). Alınmamış: beyaz-translucent ghost (mavi bar bağlamı).
                  scrollIntoView salt navigasyon — logic AYNEN. */}
              {serviceBadges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 md:flex-1">
                  {serviceBadges.map(({ id, Icon, label, active, tone }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-medium transition-colors ${
                        active
                          ? `${SUMMARY_TONE_BG[tone]} ${SUMMARY_TONE_BORDER[tone]} text-foreground`
                          : 'bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground/90 hover:bg-primary-foreground/20'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {active && <CheckCircle className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-right">
                <p className="text-sm text-primary-foreground/80">{t('totalPrice')}</p>
                <p className="text-2xl font-bold">€{selectTotalPrice(state)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Bar — 4 steps */}
        <BookingStepper flow="ferry" current="extras" />

        {/* ANA GRID — sol col-span-3: araç grid ÜSTTE, valiz+transfer ALTTA |
            sağ col-span-1 (1/4): özet sticky, sayfa boyunca sol içeriğin yanında. */}
        <section className="w-full pt-8 md:pt-12 pb-8 md:pb-12">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* SOL (3/4) — araç grid üstte, valiz+transfer altta (dikey akış) */}
              <div className="min-w-0 lg:col-span-3 space-y-8">

                {/* Araç grid — eski alt full-width section'dan taşındı (içerik aynen) */}
                {carAvailable && (
            <div id="svc-car" className="space-y-6 scroll-mt-24">
                {/* Başlık SOLDA + tarih satırı SAĞDA aynı hizada (md+); mobilde alt alta.
                    windowWarning tam-genişlik altta kalır (space-y-3'ün 2. child'ı). */}
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Sol — başlık + tek-cümle açıklama */}
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-1">{t('heading')}</h2>
                      <p className="text-sm text-muted-foreground">
                        {t('subheading', { location: DEFAULT_PICKUP_LOCATION })}
                      </p>
                    </div>

                    {/* Sağ — tek alan tarih picker (DateRangeField, car2-hero paterni) + gün.
                        ⚠️ onChange handler'ları handlePickupChange/handleDropoffChange (reconcileCar
                        sepet senkronu) — düz setPickupDate/setDropoffDate DEĞİL. */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
                      <div className="w-64">
                        <DateRangeField
                          mode="range"
                          date={pickupDate}
                          returnDate={dropoffDate}
                          onDateChange={handlePickupChange}
                          onReturnDateChange={handleDropoffChange}
                          minDate={todayAthens}
                          locale={locale}
                          placeholder={t('dateRangePlaceholder')}
                          alignOffset={4}
                        />
                      </div>
                      {validRange && (
                        <span className="text-lg font-bold text-blue-950 whitespace-nowrap">
                          {t('dayCount', { count: days })}
                        </span>
                      )}
                    </div>
                  </div>

                  {outsideWindow && returnItem && (
                    <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      {t('windowWarning', { from: outboundItem.date, to: returnItem.date })}
                    </p>
                  )}
                </div>

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

                {/* Car slider — tek satır yatay scroll (native snap) + desktop ok'ları */}
                <div className="relative">
                  {/* sol/sağ ok — yalnız desktop (lg); scrollBy bir kart (304px = w-72 + gap) */}
                  <button
                    type="button"
                    aria-label="Scroll cars left"
                    onClick={() => carScrollRef.current?.scrollBy({ left: -304, behavior: 'smooth' })}
                    className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll cars right"
                    onClick={() => carScrollRef.current?.scrollBy({ left: 304, behavior: 'smooth' })}
                    className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div
                    ref={carScrollRef}
                    className={`flex min-w-0 gap-4 overflow-x-auto snap-x snap-mandatory py-2 scrollbar-hide ${availLoading ? 'opacity-60 transition-opacity' : ''}`}
                  >
                  {sortedCars.map((car, index) => {
                    const isSelected = selectedModelKey === car.id
                    const lineTotal = car.price * days
                    const qty = availability?.[car.id]
                    const isUnavailable = availability != null && qty === 0
                    // coming-soon ve müsait-değil AYRI sebepler; ikisi de seçilemez.
                    // comingSoon öncelikli (daha kalıcı durum).
                    const blocked = car.comingSoon || isUnavailable
                    return (
                      <motion.div
                        key={car.id}
                        className="shrink-0 w-72 snap-start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Card
                          className={`group bg-card border-2 transition-all h-full ${
                            blocked
                              ? 'opacity-50 cursor-not-allowed pointer-events-none border-border/50'
                              : isSelected
                                ? 'border-purple-300 shadow-lg cursor-pointer hover:shadow-lg'
                                : 'border-border/50 hover:border-primary/50 cursor-pointer hover:shadow-lg'
                          }`}
                          onClick={() => { if (!blocked) handleSelectCar(car) }}
                        >
                          <CardContent className="p-0">
                            <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-muted">
                              <Image
                                src={car.image}
                                alt={car.model}
                                fill
                                className="object-cover transition-all duration-300 lg:group-hover:object-contain"
                                sizes="(max-width: 640px) 100vw, 50vw"
                              />
                              {car.badge && (
                                <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                                  {car.badge}
                                </Badge>
                              )}
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-400 flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                                </div>
                              )}
                              {car.comingSoon ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                                  <Badge variant="secondary" className="bg-amber-400 text-blue-950 gap-1">
                                    {t('car.comingSoon')}
                                  </Badge>
                                </div>
                              ) : isUnavailable ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                                  <Badge variant="secondary" className="bg-background/90 text-foreground gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {t('car.unavailable')}
                                  </Badge>
                                </div>
                              ) : null}
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
                                  className={isSelected ? 'bg-purple-400 text-white hover:bg-purple-500' : ''}
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
            </div>
                )}

                {/* Valiz + transfer — araç altında, yan yana */}
                {(luggageAvailable || (transferAvailable && transferRegion)) && (
              <div className="grid sm:grid-cols-2 gap-6">
                {luggageAvailable && (
            <Card id="svc-luggage" className="bg-amber-50/60 border-2 border-border/50 overflow-hidden scroll-mt-24">
              <CardContent className="p-5 space-y-4">
                {/* HEADER tam genişlik (görselin üstünde) — içerik aynen */}
                <div className="flex items-start justify-between gap-3 min-h-[5rem]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Luggage className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-foreground leading-tight">{t('luggage.heading')}</h2>
                      <p className="text-xs text-muted-foreground">{t('luggage.subheading')}</p>
                    </div>
                  </div>

                  {/* Sağ grup: canlı toplam (koşulsuz, Toplam: €0'dan başlar) + (i) boyut rehberi */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {t('total')}: <span className="text-lg font-bold text-blue-950">€{luggageTotalPrice}</span>
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
                  {luggageItem && (
                    <button
                      type="button"
                      aria-label={t('luggage.removeAria')}
                      onClick={handleRemoveLuggage}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  </div>
                </div>

                {/* Ölçü bilgisi — header altı (transfer toggle konumu). Görsel hizası için
                    min-h transfer toggle ile EŞİT. cm evrensel (i18n yok), ad mevcut key;
                    değerler (i) boyut rehberi popover'ı ile aynı. */}
                <div className="min-h-[3.5rem] flex flex-col justify-center gap-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{t('luggage.size.small')}</span>
                    <span className="text-muted-foreground">55×40×25 cm</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{t('luggage.size.medium')}</span>
                    <span className="text-muted-foreground">70×45×30 cm</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{t('luggage.size.large')}</span>
                    <span className="text-muted-foreground">80×55×35+ cm</span>
                  </div>
                </div>

                {/* Görsel HEP görünür (header altı, grid üstü) — seçim yokken karışık
                    sizes fallback. 3:2 alan + cover → boşluksuz, kırpmasız tam doldurur. */}
                <div className="relative w-full aspect-[3/2] overflow-hidden rounded-lg bg-white/70">
                  <Image src={luggageThumbSrc ?? '/services/luggage-sizes.webp'} alt="Luggage storage" fill sizes="(max-width: 768px) 100vw, 50vw" quality={90} className="object-cover" />
                </div>
                {/* 3'lü grid (Küçük|Orta|Büyük) — tık=+1 döngü (handleCycleLuggageSize AYNEN);
                    ×N rozet kutu İÇİNDE; üst köşe × = o boyutu 0'a sıfırla (handleResetLuggageSize). */}
                <div className="grid grid-cols-3 gap-3">
                  {LUGGAGE_SIZES.map(size => {
                    const count = luggageCounts[size]
                    const selected = count >= 1
                    return (
                      <div key={size} className="relative">
                        {/* Üst köşe × — yalnız count≥1; cycle'ı TETİKLEMEZ (kardeş buton + stopPropagation) */}
                        {count >= 1 && (
                          <button
                            type="button"
                            aria-label={t('luggage.removeAria')}
                            onClick={e => { e.stopPropagation(); handleResetLuggageSize(size) }}
                            className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive flex items-center justify-center shadow-sm transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCycleLuggageSize(size)}
                          className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 w-full rounded-xl border-2 px-2 py-2.5 transition-all ${
                            selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                          }`}
                        >
                          <span className="text-sm font-medium text-foreground leading-tight">{t(`luggage.size.${size}`)}</span>
                          <span className="text-xs font-semibold text-primary whitespace-nowrap">
                            €{LUGGAGE_RATES_EUR[size]}<span className="font-normal text-muted-foreground">{t('perDay')}</span>
                          </span>
                          {/* ×N rozeti satır içi yatay (×1 dahil) */}
                          {count >= 1 && (
                            <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                              ×{count}
                            </span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
                )}
                {transferAvailable && transferRegion && (
            <Card id="svc-transfer" className="bg-green-50/60 border-2 border-border/50 overflow-hidden scroll-mt-24">
              <CardContent className="p-5 space-y-4">
                {/* HEADER tam genişlik (görselin üstünde) — içerik aynen */}
                <div className="flex items-start justify-between gap-3 min-h-[5rem]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-foreground leading-tight">{t('transfer.heading')}</h2>
                      <p className="text-xs text-muted-foreground">{t('transfer.subheading')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {t('total')}: <span className="inline-block min-w-[4.5rem] text-right text-lg font-bold text-blue-950">€{fmtEur(transferTotalPrice)}</span>
                    </span>
                    {/* × hep render — yer-rezerve; transferItem yoksa görünmez+tıklanmaz
                        (belirince/kaybolunca başlık itilmez). Tıklama handler'ı aynen. */}
                    <button
                      type="button"
                      aria-label={t('transfer.removeAria')}
                      aria-hidden={!transferItem}
                      tabIndex={transferItem ? undefined : -1}
                      onClick={handleRemoveTransfer}
                      className={`shrink-0 text-muted-foreground hover:text-destructive transition-colors ${transferItem ? '' : 'invisible pointer-events-none'}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Gidiş/Dönüş toggle — görselin ÜSTÜNDE, 2'li grid (mantık aynen) */}
                <div className="grid grid-cols-2 gap-2 min-h-[3.5rem] items-center">
                  <label className="flex items-center gap-2 cursor-pointer rounded-xl border-2 border-border/50 px-3 py-2">
                    <Switch checked={transferOutbound} onCheckedChange={handleTransferOutbound} />
                    <span className="text-sm text-foreground">{t('transfer.outbound')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer rounded-xl border-2 border-border/50 px-3 py-2">
                    <Switch checked={transferReturn} onCheckedChange={handleTransferReturn} />
                    <span className="text-sm text-foreground">{t('transfer.return')}</span>
                  </label>
                </div>

                {/* ANA GÖRSEL — seçime göre (vito/sprinter), seçilmeden hero; hep görünür.
                    w-full 3:2 cover (valiz paterni). */}
                <div className="relative w-full aspect-[3/2] overflow-hidden rounded-lg bg-white/70">
                  <Image src={transferVehicleSrc ?? '/services/transfer-hero.webp'} alt="Transfer" fill sizes="(max-width: 768px) 100vw, 50vw" quality={90} className="object-cover" />
                </div>

                {/* Görsel altı: rota dropdown (label yok, placeholder yeter) + Vito/Sprinter 2'li grid */}
                <div className="space-y-3">
                  <Select value={transferRouteId ?? ''} onValueChange={handleTransferRoute}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('transfer.selectRoute')} />
                    </SelectTrigger>
                    <SelectContent>
                      {transferRegion.routes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-2">
                    {transferRegion.vehicles.map((v) => {
                      const selected = transferVehicleId === v.id
                      const priceEur = transferRoute
                        ? ((transferRoute.prices as Record<string, number>)[v.id] ?? 0) / 100
                        : null
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleTransferVehicle(v.id)}
                          className={`flex flex-col items-start w-full rounded-xl border-2 px-3 py-1.5 transition-all ${
                            selected ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                          }`}
                        >
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">{v.label}</span>
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />{t('seatCount', { count: v.capacity })}
                            {priceEur != null && (
                              <span className="text-primary font-semibold ml-1">€{fmtEur(priceEur)}{t('transfer.perLeg')}</span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
                )}
              </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-lg font-bold text-foreground">{t('bookingSummary')}</h3>

                      {/* Ferry lines */}
                      <div className={`p-3 rounded-xl border-l-2 ${SUMMARY_TONE_BG.ferry} ${SUMMARY_TONE_BORDER.ferry}`}>
                        <p className="text-xs text-muted-foreground mb-1">{t('outboundFerry')}</p>
                        <p className="font-medium text-foreground text-sm">{outbound.from.name} → {outbound.to.name}</p>
                        <p className="text-xs text-muted-foreground">{outbound.departureTime} · {outbound.operator}</p>
                      </div>

                      {returnF && (
                        <div className={`p-3 rounded-xl border-l-2 ${SUMMARY_TONE_BG.ferry} ${SUMMARY_TONE_BORDER.ferry}`}>
                          <p className="text-xs text-muted-foreground mb-1">{t('returnFerry')}</p>
                          <p className="font-medium text-foreground text-sm">{returnF.from.name} → {returnF.to.name}</p>
                          <p className="text-xs text-muted-foreground">{returnF.departureTime} · {returnF.operator}</p>
                        </div>
                      )}

                      {/* Selected car — × ile kaldır (valiz/transfer ile aynı desen) */}
                      {selectedCar && dayChosen && (
                        <div className={`p-3 rounded-xl border-l-2 ${SUMMARY_TONE_BG.car} ${SUMMARY_TONE_BORDER.car}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">{t('carRental')}</p>
                              <p className="font-medium text-foreground text-sm">{selectedCar.model}</p>
                              <p className="text-xs text-muted-foreground">
                                {carBookingItem
                                  ? summarizeItem(carBookingItem, locale).detail
                                  : t('dayCount', { count: days })}
                              </p>
                              <p className="text-primary text-sm font-semibold mt-1">€{selectedCar.price * days}</p>
                            </div>
                            <button
                              type="button"
                              aria-label={t('carRentalRemoveAria')}
                              onClick={handleRemoveCar}
                              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Valiz emaneti — cart'taki item'dan; × ile komple kaldır */}
                      {luggageItem && (
                        <div className={`p-3 rounded-xl border-l-2 ${SUMMARY_TONE_BG.luggage} ${SUMMARY_TONE_BORDER.luggage}`}>
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

                      {/* Bodrum transfer — cart'taki item'dan; × ile kaldır */}
                      {transferItem && (
                        <div className={`p-3 rounded-xl border-l-2 ${SUMMARY_TONE_BG.transfer} ${SUMMARY_TONE_BORDER.transfer}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">{t('transfer.summaryLabel')}</p>
                              <p className="font-medium text-foreground text-sm">{summarizeItem(transferItem, locale).title}</p>
                              <p className="text-xs text-muted-foreground">
                                {t('transfer.legCount', { count: (transferItem.outbound ? 1 : 0) + (transferItem.return ? 1 : 0) })}
                              </p>
                              <p className="text-primary text-sm font-semibold mt-1">€{fmtEur(transferItem.priceAmount)}</p>
                            </div>
                            <button
                              type="button"
                              aria-label={t('transfer.removeAria')}
                              onClick={handleRemoveTransfer}
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
                        disabled={selectedModelKey != null && !dayChosen}
                      >
                        {t('continueToPassengers')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      {selectedModelKey != null && !dayChosen && (
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

        {/* Alt feribot özeti — gidiş+dönüş tek kompakt bar; "değiştir" → results.
            Üst header'dan bağımsız, salt görünüm (eş bilgiyi bilinçli tekrar eder). */}
        <section className="w-full py-6">
          <div className="container px-4 md:px-6">
            <Card className="overflow-hidden border-2 border-border/50">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {ferryBarSrc && (
                    <div className="relative w-24 shrink-0 self-stretch overflow-hidden bg-white/70">
                      <Image src={ferryBarSrc} alt="Ferry" fill sizes="192px" quality={90} className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{outbound.from.name} ↔ {outbound.to.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('outboundPrefix')} {outboundItem?.date} {outbound.departureTime}
                        {returnF && returnItem && (
                          <> · {t('returnPrefix')} {returnItem.date} {returnF.departureTime}</>
                        )}
                      </p>
                    </div>
                    <Link href="/ferry/results">
                      <Button variant="outline" size="sm" className="shrink-0">{t('editFerryDetails')}</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
