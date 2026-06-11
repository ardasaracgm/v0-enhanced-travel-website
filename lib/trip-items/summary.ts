/**
 * Trip Item summary — client-safe display facet of the registry
 * ============================================================
 * Maps a client BookingItem to a normalized summary row for the checkout
 * page. This is the CLIENT-SAFE companion to the registry: the main registry
 * (resolve/clientSchema) transitively imports `server-only` (luggage-pricing),
 * so it cannot be pulled into a client component. Display config lives here,
 * keyed by the same BookableItemType (single source of the type list).
 *
 * Strings are intentionally the page's existing hardcoded English — checkout
 * is not internationalized today, and changing ferry/car wording would be a
 * regression. Full checkout i18n is a separate task. The luggage row uses the
 * same English style ("Luggage storage", matching extrasPage.luggage key).
 */

import { assertNever } from './types'
import type {
  BookingItem,
  FerryBookingItem,
  CarRentalBookingItem,
  LuggageBookingItem,
  InsuranceBookingItem,
} from '@/lib/booking-context'

export interface ItemSummaryRow {
  /** Label in the detailed "Your Trip" card (e.g. "Outbound", "Car Rental"). */
  label: string
  /** Main line (e.g. "Bodrum → Kos", "Fiat Panda · 4 days"). */
  title: string
  /** Optional sub line (e.g. "2026-07-10 · 09:00 - 10:00", "Pickup: Kos Port"). */
  detail?: string
  /** Compact label in the "Order Summary" breakdown (e.g. "Outbound (2×)"). */
  breakdownLabel: string
  /** EUR amount (= item.priceAmount, same value selectTotalPrice sums). */
  amount: number
}

function ferryRow(item: FerryBookingItem): ItemSummaryRow {
  const label = item.leg === 'outbound' ? 'Outbound' : 'Return'
  return {
    label,
    title: `${item.ferry.from} → ${item.ferry.to}`,
    detail: `${item.date} · ${item.ferry.departureTime} - ${item.ferry.arrivalTime}`,
    breakdownLabel: `${label} (${item.passengerCount}×)`,
    amount: item.priceAmount,
  }
}

// "YYYY-MM-DD" + n gün (UTC, tz kaymasız). carRow drop-off türetimi için.
function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// Locale-aware kısa tarih ("12 Haz" / "12 Jun"), UTC sabit.
function fmtDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

function carRow(item: CarRentalBookingItem, locale: string): ItemSummaryRow {
  const name = item.brand ? `${item.brand} ${item.model}` : item.model
  const isTr = locale === 'tr'
  const dayWord = isTr ? 'gün' : item.days === 1 ? 'day' : 'days'
  // dropoffAt one-way'de pickup'a eşit (placeholder); inclusive gün sayısından türet
  // → her iki akışta da doğru. days/fiyat DEĞİŞMEZ, yalnız görünüm.
  const dropoff = addDaysISO(item.pickupAt, item.days - 1)
  return {
    label: 'Car Rental',
    title: name,
    detail: isTr
      ? `Alış: ${fmtDate(item.pickupAt, locale)} · Teslim: ${fmtDate(dropoff, locale)} · ${item.days} ${dayWord}`
      : `Pickup: ${fmtDate(item.pickupAt, locale)} · Drop-off: ${fmtDate(dropoff, locale)} · ${item.days} ${dayWord}`,
    breakdownLabel: `Car (${item.days}d)`,
    amount: item.priceAmount,
  }
}

function luggageRow(item: LuggageBookingItem): ItemSummaryRow {
  const pieces = item.counts.small + item.counts.medium + item.counts.large
  return {
    label: 'Luggage storage',
    title: `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`,
    detail: `${item.dropOffDate} → ${item.pickupDate}`,
    breakdownLabel: 'Luggage storage',
    amount: item.priceAmount,
  }
}

// coverageValue gösterilir (35.000€/100.000€), tariffName ("Standard") DEĞİL —
// upsell kartındaki coverLabel ile tutarlı, locale-aware. tariffName kayıtta kalır.
function insuranceRow(item: InsuranceBookingItem, locale: string): ItemSummaryRow {
  const coverage = item.coverageValue.toLocaleString(locale)
  return {
    label: 'Travel insurance',
    title: locale === 'tr' ? `${coverage}€ teminat` : `€${coverage} cover`,
    detail: `${item.touristCount} ${item.touristCount === 1 ? 'traveller' : 'travellers'}`,
    breakdownLabel: 'Insurance',
    amount: item.priceAmount,
  }
}

// Registry of per-type summary formatters — exhaustive over BookableItemType.
const ITEM_SUMMARY = {
  ferry: ferryRow,
  car_rental: carRow,
  luggage: luggageRow,
  insurance: insuranceRow,
}

/**
 * Dispatch a BookingItem to its summary row. The switch narrows the union so
 * each formatter gets its exact type; assertNever closes it — a new item type
 * without a row fails at compile time.
 */
export function summarizeItem(item: BookingItem, locale: string = 'en'): ItemSummaryRow {
  switch (item.type) {
    case 'ferry':
      return ITEM_SUMMARY.ferry(item)
    case 'car_rental':
      return ITEM_SUMMARY.car_rental(item, locale)
    case 'luggage':
      return ITEM_SUMMARY.luggage(item)
    case 'insurance':
      return ITEM_SUMMARY.insurance(item, locale)
    default:
      return assertNever(item, 'summary booking item')
  }
}
