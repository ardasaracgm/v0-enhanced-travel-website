import type { BookingItem, Passenger } from '@/lib/booking-context'

/**
 * Content-addressed idempotency key for a booking submit.
 *
 * Derived from the SEMANTIC cart (user-intent fields only) so that:
 *   - re-submitting the SAME cart (double-click, or a return with no changes)
 *     yields the SAME key → createTrip dedupes to the one trip;
 *   - a CHANGED cart yields a DIFFERENT key → a fresh trip, never a stale one.
 *
 * `salt` = the per-session UUID (booking context's idempotencyKey). It namespaces
 * the hash so two different users with byte-identical carts never collide onto one
 * trip (idempotency_key is globally unique). Same session + same cart → same key;
 * different session → different salt → no collision.
 *
 * Only intent fields enter the hash. Every price/derived/display/volatile field is
 * EXCLUDED (priceAmount, pricePerDay, days, the full ferry object, model/brand/
 * tariffName/title labels, legIndex) — else a re-render could shift a price and
 * break double-click dedupe. Optional fields normalize to ONE null sentinel
 * (absent / '' / whitespace all → null) so two paths to the same cart hash alike.
 */

type Contact = { email: string; phone: string }

function normStr(v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  return s === '' ? null : s
}

function canonItem(item: BookingItem): Record<string, unknown> {
  switch (item.type) {
    case 'ferry':
      return { t: 'ferry', leg: item.leg, ferryId: normStr(item.ferryId), date: normStr(item.date), pax: item.passengerCount }
    case 'car_rental':
      return { t: 'car_rental', modelKey: normStr(item.modelKey), pickupLoc: normStr(item.pickupLocation), dropoffLoc: normStr(item.dropoffLocation), pickupAt: normStr(item.pickupAt), dropoffAt: normStr(item.dropoffAt) }
    case 'luggage':
      return { t: 'luggage', small: item.counts.small ?? 0, medium: item.counts.medium ?? 0, large: item.counts.large ?? 0, dropOff: normStr(item.dropOffDate), pickup: normStr(item.pickupDate), location: normStr(item.location) }
    case 'insurance':
      return { t: 'insurance', tariffId: item.tariffId, coverage: item.coverageValue, tourists: item.touristCount, start: normStr(item.startDate), end: normStr(item.endDate) }
    case 'transfer':
      return {
        t: 'transfer',
        regionId: normStr(item.regionId),
        outbound: item.outbound ? { routeId: normStr(item.outbound.routeId), vehicleId: normStr(item.outbound.vehicleId) } : null,
        return: item.return ? { routeId: normStr(item.return.routeId), vehicleId: normStr(item.return.vehicleId) } : null,
      }
  }
}

function canonPassenger(p: Passenger): Record<string, unknown> {
  return {
    first: normStr(p.firstName),
    last: normStr(p.lastName),
    gender: normStr(p.gender),
    birth: normStr(p.birthDate),
    passport: normStr(p.passportNumber),
    passportExp: normStr(p.passportExpiryDate),
    nationality: normStr(p.nationality),
    license: normStr(p.licenseExpiry),
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function computeBookingIdempotencyKey(
  salt: string,
  items: BookingItem[],
  passengers: Passenger[],
  contact: Contact,
): Promise<string> {
  // Items sorted (cart ORDER is not intent) → order-independent. Passengers keep
  // their order (lead = index 0 is positional intent).
  const canonItems = items.map(canonItem)
  canonItems.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  const payload = {
    items: canonItems,
    passengers: passengers.map(canonPassenger),
    contact: { email: normStr(contact.email)?.toLowerCase() ?? null, phone: normStr(contact.phone) },
  }
  return sha256Hex(`${salt} ${JSON.stringify(payload)}`)
}
