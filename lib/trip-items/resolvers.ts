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

import { calculateLuggageTotalCents } from '@/lib/luggage-pricing'
import type {
  ResolvedTripItem,
  FerryResolveCtx,
  CarResolveCtx,
  LuggageResolveCtx,
  InsuranceResolveCtx,
} from './types'

// date: "2026-06-15", time: "09:00" → "2026-06-15T09:00:00+03:00"
// Greece timezone (EET, +03 in summer). (was: submit-booking combineDateAndTime)
function combineDateAndTime(date: string, time: string): string {
  return `${date}T${time}:00+03:00`
}

export function resolveFerryItem(ctx: FerryResolveCtx): ResolvedTripItem {
  const { item, ferry, passengerCount } = ctx
  return {
    type: 'ferry',
    title: `${ferry.from} → ${ferry.to} (${ferry.operator})`,
    scheduledAt: combineDateAndTime(item.date, ferry.departureTime),
    endsAt: combineDateAndTime(item.date, ferry.arrivalTime),
    passengerCount,
    priceAmount: ferry.price * passengerCount,
    priceCurrency: 'EUR',
    metadata: {
      from_port: ferry.from,
      to_port: ferry.to,
      operator: ferry.operator,
      vessel: ferry.vessel,
      departure_time: ferry.departureTime,
      arrival_time: ferry.arrivalTime,
      ferry_id: ferry.id,
      per_passenger_price: ferry.price,
    },
  }
}

export function resolveCarRentalItem(ctx: CarResolveCtx): ResolvedTripItem {
  const { item, car, authorizedDays, passengerCount } = ctx
  const carName = [car.brand, car.model].filter(Boolean).join(' ') || 'Car rental'
  const pricePerDay = Number(car.price_per_day ?? 0)
  return {
    type: 'car_rental',
    title: `${carName} (${authorizedDays} ${authorizedDays === 1 ? 'day' : 'days'})`,
    scheduledAt: item.pickupAt ?? null,
    endsAt: item.dropoffAt ?? null,
    passengerCount,
    priceAmount: pricePerDay * authorizedDays,
    priceCurrency: 'EUR',
    metadata: {
      car_id: car.id,
      model: carName,
      days: authorizedDays,
      per_day_price: pricePerDay,
      pickup_at: item.pickupAt,
      dropoff_at: item.dropoffAt,
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
  const { item, quoteAmount, dateFrom, dateTo } = ctx
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
    },
  }
}
