import 'server-only'

import { TRANSFER_REGIONS, type TransferRegionId } from '@/lib/transfer-rates'

// ============================================================
// TravelBeez · transfer · server-side fiyat hesabı
// ============================================================
// Saf, server-side. Tüm para CENTS (EUR). Asla client'tan fiyat alma —
// client region/route/vehicle id'leri gönderir, toplamı burası hesaplar.
// Round-trip: iki opsiyonel bacak (outbound/return); toplam = seçili
// bacakların prices[vehicleId] toplamı. En az 1 bacak şart.
// ============================================================

export interface TransferLegSelection {
  routeId: string
  vehicleId: string
}

export interface TransferSelection {
  regionId: string
  outbound?: TransferLegSelection
  return?: TransferLegSelection
}

type RegionShape = (typeof TRANSFER_REGIONS)[TransferRegionId]

// Tek bacak → cents. Bölge/rota/araç bilinmiyorsa RangeError.
function legCents(regionId: string, leg: TransferLegSelection): number {
  const region = (TRANSFER_REGIONS as Record<string, RegionShape>)[regionId]
  if (!region) {
    throw new RangeError(`transfer: unknown region "${regionId}"`)
  }
  const route = region.routes.find((r) => r.id === leg.routeId)
  if (!route) {
    throw new RangeError(`transfer: unknown route "${leg.routeId}" in region "${regionId}"`)
  }
  const cents = (route.prices as Record<string, number>)[leg.vehicleId]
  if (cents == null) {
    throw new RangeError(`transfer: vehicle "${leg.vehicleId}" not priced on route "${leg.routeId}"`)
  }
  return cents
}

/**
 * Transfer toplam fiyatı (cents) — round-trip iki-bacak.
 * Toplam = Σ seçili bacakların bacak-fiyatı. En az 1 bacak (outbound|return)
 * zorunlu; aksi halde RangeError (createTrip → 'invalid_transfer').
 */
export function calculateTransferTotalCents(sel: TransferSelection): number {
  if (!sel.outbound && !sel.return) {
    throw new RangeError('transfer: at least one leg (outbound or return) required')
  }
  let total = 0
  if (sel.outbound) total += legCents(sel.regionId, sel.outbound)
  if (sel.return) total += legCents(sel.regionId, sel.return)
  return total
}
