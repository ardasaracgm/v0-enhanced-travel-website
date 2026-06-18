'use server'

/**
 * Server action: checkModelAvailability
 * =====================================
 * server-only müsaitlik motorunu ('use server' olmayan car-availability.ts,
 * service-role) client'a açan ince köprü — submitBooking ile aynı kalıp.
 * Client yalnız pickupDate + days yollar; envanter kararı server'da.
 * Dönen Record model_key → o havuzdaki müsait aktif plaka sayısı.
 */

import { getModelAvailability } from '@/lib/car-availability'

export async function checkModelAvailability(
  pickupDate: string,
  days: number,
): Promise<
  | { ok: true; availability: Record<string, number> }
  | { ok: false; error: string }
> {
  try {
    const availability = await getModelAvailability(pickupDate, days)
    return { ok: true, availability }
  } catch (err) {
    console.error('[checkModelAvailability] failed:', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Availability check failed' }
  }
}
