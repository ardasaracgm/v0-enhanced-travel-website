'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'

// Native date input 6 haneli yıl kabul eder → ilk 4'e kes (wizard :37-40 birebir).
function clampYear(v: string): string {
  const m = /^(\d+)-(\d{2})-(\d{2})$/.exec(v)
  return m && m[1].length > 4 ? `${m[1].slice(0, 4)}-${m[2]}-${m[3]}` : v
}

/**
 * Ana sayfa hero'sunun "Bodrum Transfer" sekmesine gömülen kompakt ön-seçim
 * formu — ortak "hero-inline servis formu" deseninin 4. (son) örneği. Alanlar
 * transfer-wizard step 0'ın birebir kopyası (routeId + vehicleId + iki BAĞIMSIZ
 * tarih), region sabit bodrum. Fiyat CLIENT hesaplanır (transfer-rates.ts
 * client-safe; wizard :95-99) — SALT GÖRÜNTÜ; submit'te server (transfer-pricing,
 * server-only) yeniden hesaplar. Submit → /transfer?…; hedef sayfa iletişim
 * adımına (step 1) atlar. Tarihler bağımsız: tek tarih = 1 leg, iki = 2 leg;
 * sıralama kısıtı yok (wizard :107 ile aynı, return-only mümkün).
 */
const REGION_IDS = Object.keys(TRANSFER_REGIONS) as (keyof typeof TRANSFER_REGIONS)[]

export function TransferHeroSearch() {
  const t = useTranslations('transferPage')
  const locale = useLocale()
  const router = useRouter()
  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })

  const region = TRANSFER_REGIONS[REGION_IDS[0]]

  const [routeId, setRouteId] = React.useState('')
  const [vehicleId, setVehicleId] = React.useState('')
  const [outboundDate, setOutboundDate] = React.useState('')
  const [returnDate, setReturnDate] = React.useState('')

  // Fiyat — wizard :95-99 birebir. legCount = dolu tarih sayısı (round-trip = ×2).
  const route = region.routes.find((r) => r.id === routeId) ?? null
  const perLegEur = route && vehicleId
    ? ((route.prices as Record<string, number>)[vehicleId] ?? 0) / 100
    : 0
  const legCount = (outboundDate ? 1 : 0) + (returnDate ? 1 : 0)
  const totalEur = perLegEur * legCount
  const fmtEur = (n: number) =>
    n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const canContinue = !!routeId && !!vehicleId && legCount >= 1

  const handleSearch = () => {
    if (!canContinue) return
    const params = new URLSearchParams()
    params.set('routeId', routeId)
    params.set('vehicleId', vehicleId)
    if (outboundDate) params.set('outboundDate', outboundDate)
    if (returnDate) params.set('returnDate', returnDate)
    router.push(`/transfer?${params.toString()}`)
  }

  return (
    <div className="w-full space-y-3">
      {/* Fiyat — salt görüntü; seçim tamamlanınca çıkar. h-6 ile yer rezerve →
          TabsContent sm:min-h-[148px] slack'ine oturur, zıplama yok (car badge deseni). */}
      <div className="flex h-6 items-center">
        {canContinue && route && (
          <span className="text-sm font-semibold text-primary">€{fmtEur(totalEur)}</span>
        )}
      </div>

      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
        {/* Varış / buluşma noktası — geniş (uzun rota adları), lg 2 kolon */}
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="tr-hero-route" className="text-xs">{t('route')}</Label>
          <Select value={routeId || undefined} onValueChange={setRouteId}>
            <SelectTrigger id="tr-hero-route" className="h-10 rounded-xl">
              <SelectValue placeholder={t('selectRoute')} />
            </SelectTrigger>
            <SelectContent>
              {region.routes.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Araç — hero barında Select (wizard kartları yerine; değerler aynı id) */}
        <div className="space-y-1.5">
          <Label htmlFor="tr-hero-vehicle" className="text-xs">{t('vehicle')}</Label>
          <Select value={vehicleId || undefined} onValueChange={setVehicleId}>
            <SelectTrigger id="tr-hero-vehicle" className="h-10 rounded-xl">
              <SelectValue placeholder={t('vehicle')} />
            </SelectTrigger>
            <SelectContent>
              {region.vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gidiş tarihi — bağımsız native input (wizard :314-319) */}
        <div className="space-y-1.5">
          <Label htmlFor="tr-hero-out" className="text-xs">{t('outboundDate')}</Label>
          <Input id="tr-hero-out" type="date" min={todayAthens} value={outboundDate}
            className="h-10 rounded-xl"
            onChange={(e) => setOutboundDate(clampYear(e.target.value))} />
        </div>

        {/* Dönüş tarihi — bağımsız native input (wizard :320-325) */}
        <div className="space-y-1.5">
          <Label htmlFor="tr-hero-ret" className="text-xs">{t('returnDate')}</Label>
          <Input id="tr-hero-ret" type="date" min={todayAthens} value={returnDate}
            className="h-10 rounded-xl"
            onChange={(e) => setReturnDate(clampYear(e.target.value))} />
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={!canContinue}
            className="h-10 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {t('nav.next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
