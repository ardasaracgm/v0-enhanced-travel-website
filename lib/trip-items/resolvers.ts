/**
 * Trip Item resolvers — pure transform functions
 * ==============================================
 * The SINGLE production implementation of "resolved context → trip item"
 * for each bookable type. Extracted verbatim from the inline branches that
 * used to live in lib/actions/submit-booking.ts; submit-booking now builds
 * the context (I/O: getFerryById, cars fetch, authorizedDays) and calls
 * these. There is exactly ONE copy of the assembly logic — these functions.
 *
 * PURE: no I/O, no DB, no network. Same input → same output. The snapshot
 * harness generates its golden from these (single source — no separate
 * transcription to drift), and the registry binds resolve() to them.
 *
 * priceAmount is EUR decimal — matches the existing createTrip contract.
 */

import { ferryUnitFare, ferryFaresTotal } from '@/lib/ferry/display'
import { calculateLuggageTotalCents } from '@/lib/luggage-pricing'
import { calculateTransferTotalCents } from '@/lib/transfer-pricing'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'
import type {
  ResolvedTripItem,
  FerryResolveCtx,
  CarResolveCtx,
  LuggageResolveCtx,
  InsuranceResolveCtx,
  TransferResolveCtx,
} from './types'

// date: "2026-06-15", time: "09:00" → "2026-06-15T09:00:00+03:00"
// Greece timezone (EET, +03 in summer). (was: submit-booking combineDateAndTime)
function combineDateAndTime(date: string, time: string): string {
  return `${date}T${time}:00+03:00`
}

export function resolveFerryItem(ctx: FerryResolveCtx): ResolvedTripItem {
  const { item, ferry, passengerCount, passengerTypes } = ctx
  return {
    type: 'ferry',
    title: `${ferry.from.name} → ${ferry.to.name} (${ferry.operator})`,
    scheduledAt: combineDateAndTime(item.date, ferry.departureTime),
    endsAt: combineDateAndTime(item.date, ferry.arrivalTime),
    passengerCount,
    // Authoritative: sum each passenger's own-type fare (adult/child/infant),
    // not adult × count. This is the amount that flows to trips.total_amount → Viva.
    priceAmount: ferryFaresTotal(ferry, passengerTypes),
    priceCurrency: 'EUR',
    metadata: {
      from_port: ferry.from.name,
      to_port: ferry.to.name,
      operator: ferry.operator,
      vessel: ferry.vessel,
      departure_time: ferry.departureTime,
      arrival_time: ferry.arrivalTime,
      ferry_id: ferry.id,
      // Persist the leg so reserveFerry can rebuild the outbound/return request
      // after payment (the booking input's leg is otherwise lost at this point).
      direction: item.leg,
      // adult "from" reference fare — NOT the per-passenger amount paid (mixed
      // types pay their own fare; see priceAmount via ferryFaresTotal).
      per_passenger_price: ferryUnitFare(ferry),
    },
  }
}

export function resolveCarRentalItem(ctx: CarResolveCtx): ResolvedTripItem {
  const { item, car, authorizedDays, authorizedDropoff, passengerCount } = ctx
  const carName = [car.brand, car.model].filter(Boolean).join(' ') || 'Car rental'
  const pricePerDay = Number(car.price_per_day ?? 0)
  // Drop-off is the SERVER-authorized value (not raw client item.dropoffAt), so the
  // hold (car_bookings.end_date) and metadata.dropoff_at share one source of truth.
  return {
    type: 'car_rental',
    title: `${carName} (${authorizedDays} ${authorizedDays === 1 ? 'day' : 'days'})`,
    scheduledAt: item.pickupAt ?? null,
    endsAt: authorizedDropoff,
    passengerCount,
    priceAmount: pricePerDay * authorizedDays,
    priceCurrency: 'EUR',
    metadata: {
      car_id: car.id,
      model: carName,
      days: authorizedDays,
      per_day_price: pricePerDay,
      pickup_at: item.pickupAt,
      dropoff_at: authorizedDropoff,
    },
  }
}

/**
 * Luggage. calculateLuggageTotalCents is pure but THROWS (RangeError) on
 * invalid input (pickup<dropOff, bad date, count out of 0..5, Σ<1). The
 * caller (submit-booking) keeps its try/catch to surface 'invalid_luggage'
 * — behavior unchanged from when this lived inline.
 */
export function resolveLuggageItem(ctx: LuggageResolveCtx): ResolvedTripItem {
  const { item } = ctx
  const totalCents = calculateLuggageTotalCents(item.counts, item.dropOffDate, item.pickupDate)
  const totalPieces = item.counts.small + item.counts.medium + item.counts.large
  return {
    type: 'luggage',
    title: `Luggage drop-off — ${totalPieces} ${totalPieces === 1 ? 'piece' : 'pieces'}`,
    scheduledAt: `${item.dropOffDate}T00:00:00+03:00`,
    endsAt: `${item.pickupDate}T00:00:00+03:00`,
    passengerCount: 1,
    // cents → EUR decimals (rates are whole euros so this division is exact).
    priceAmount: totalCents / 100,
    priceCurrency: 'EUR',
    metadata: {
      count_small: item.counts.small,
      count_medium: item.counts.medium,
      count_large: item.counts.large,
      drop_off_date: item.dropOffDate,
      pickup_date: item.pickupDate,
      location: item.location,
    },
  }
}

/**
 * Insurance (Auras). PURE — fiyat ctx.quoteAmount'tan (submit-booking
 * getInsuranceQuote ile getirir; A0'da mock 0). Fiyat mantığı yazılı, değer
 * mock. Gerçek poliçe verisi Kademe B (add_contract). scheduledAt/endsAt
 * +03:00 deseni resolveLuggageItem ile aynı.
 */
export function resolveInsuranceItem(ctx: InsuranceResolveCtx): ResolvedTripItem {
  const { item, quoteAmount, coverageId, coverageValue, dateFrom, dateTo } = ctx
  return {
    type: 'insurance',
    title: `Travel insurance — ${item.tariffName}`,
    scheduledAt: `${dateFrom}T00:00:00+03:00`,
    endsAt: `${dateTo}T00:00:00+03:00`,
    passengerCount: item.touristCount,
    priceAmount: quoteAmount, // A0: mock 0
    priceCurrency: 'EUR',
    metadata: {
      policy_type: 'travel',
      starts_at: dateFrom,
      ends_at: dateTo,
      insurer: 'Auras',
      tariff_id: item.tariffId,
      tariff_name: item.tariffName,
      tourist_count: item.touristCount,
      coverage_id: coverageId,
      coverage_value: coverageValue,
    },
  }
}

/**
 * Transfer (Bodrum kalkış). PURE — fiyat calculateTransferTotalCents'ten
 * (round-trip iki bacağı toplar). RangeError (no leg / unknown region/route/
 * vehicle) caller'da (submit-booking) 'invalid_transfer'a çevrilir. Client
 * priceAmount yok sayılır — luggage deseni. Etiketler statik TRANSFER_REGIONS'tan
 * (saf veri; I/O yok). Title düz İngilizce — diğer resolver'larla tutarlı.
 */
export function resolveTransferItem(ctx: TransferResolveCtx): ResolvedTripItem {
  const { item } = ctx
  const totalCents = calculateTransferTotalCents({
    regionId: item.regionId,
    outbound: item.outbound,
    return: item.return,
  })
  const region = TRANSFER_REGIONS[item.regionId as keyof typeof TRANSFER_REGIONS]
  const pickupLabel = region?.pickupLabel ?? item.regionId
  const firstLeg = item.outbound ?? item.return
  const routeLabel =
    region?.routes.find((r) => r.id === firstLeg?.routeId)?.label ?? firstLeg?.routeId ?? ''
  const legCount = (item.outbound ? 1 : 0) + (item.return ? 1 : 0)
  // Standalone'da bacak tarihleri var → trip start/end dolsun (admin/Hub/WhatsApp
  // koordinasyonu günü gösterir). Ferry-extras bacakları date'siz → null kalır
  // (geriye uyumlu). +03:00 deseni diğer resolver'larla aynı.
  const atMidnight = (d?: string) => (d ? `${d}T00:00:00+03:00` : null)
  const outDate = item.outbound?.date
  const retDate = item.return?.date
  const scheduledAt = atMidnight(outDate ?? retDate)             // ilk gün (gidiş yoksa dönüş)
  const endsAt = outDate && retDate ? atMidnight(retDate) : null // round-trip → bitiş = dönüş günü
  return {
    type: 'transfer',
    title: `Transfer — ${pickupLabel} ↔ ${routeLabel} (${legCount} ${legCount === 1 ? 'leg' : 'legs'})`,
    scheduledAt,
    endsAt,
    passengerCount: 1, // "kaç trip kalemi" — kişi-bazlı değil (araç-bazlı). Yolcu sayısı bilgi.
    // cents → EUR decimals (tarifeler tam euro/yarım euro; bölme kayıpsız).
    priceAmount: totalCents / 100,
    priceCurrency: 'EUR',
    metadata: {
      region_id: item.regionId,
      outbound: item.outbound
        ? { route_id: item.outbound.routeId, vehicle_id: item.outbound.vehicleId, ...(item.outbound.date ? { date: item.outbound.date } : {}) }
        : undefined,
      return: item.return
        ? { route_id: item.return.routeId, vehicle_id: item.return.vehicleId, ...(item.return.date ? { date: item.return.date } : {}) }
        : undefined,
      pickup_location: pickupLabel,
      dropoff_location: routeLabel,
      total_cents: totalCents,
      ...(item.passengerCount ? { passenger_count_info: item.passengerCount } : {}),
    },
  }
}
