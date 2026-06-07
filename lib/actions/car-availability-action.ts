'use server'

/**
 * Server action: checkCarAvailability
 * ===================================
 * server-only müsaitlik motorunu ('use server' olmayan car-availability.ts,
 * service-role) client'a açan ince köprü — submitBooking ile aynı kalıp.
 * Client yalnız pickupDate + days yollar; envanter kararı server'da.
 */

import { getAvailabilityForDates } from '@/lib/car-availability'

export async function checkCarAvailability(
  pickupDate: string,
  days: number,
): Promise<
  | { ok: true; availability: Record<string, number> }
  | { ok: false; error: string }
> {
  try {
    const availability = await getAvailabilityForDates(pickupDate, days)
    return { ok: true, availability }
  } catch (err) {
    console.error('[checkCarAvailability] failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Availability check failed' }
  }
}
