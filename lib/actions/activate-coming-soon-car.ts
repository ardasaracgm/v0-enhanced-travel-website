'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/lib/audit/log'
import { clientIp } from '@/lib/auth/rate-limit'
import { headers } from 'next/headers'

export interface ActivateComingSoonCarResult {
  ok: boolean
  error?: string
}

// SQL'le girilmiş coming-soon aracı plakayla aktifleştirir (028'in koddaki karşılığı).
// ÜÇ gate'i birden çevirir: coming_soon=false + status='active' + plate. Neden hepsi:
// assignPlate & getModelAvailability status='active' arar (sadece coming_soon=false
// yetmez); plate=NULL aktif araç ise getModelAvailability onu müsait sayar → plakasız
// bozuk rezervasyon. WHERE id + .eq('coming_soon', true): tek satır hedefi + defense
// (bayat UI aktif aracı yeniden plakalayamaz; 0 satır → net hata).
export async function activateComingSoonCar(
  carId: string,
  plate: string,
): Promise<ActivateComingSoonCarResult> {
  // Gate — self-auth + is_admin (set-car-status.ts:22-33).
  const auth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return { ok: false, error: 'Not authorized.' }
  const { data: profile } = await auth
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return { ok: false, error: 'Not authorized.' }

  const value = plate?.trim()
  if (!value) return { ok: false, error: 'Plate is required.' }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('cars')
    .update({ coming_soon: false, status: 'active', plate: value })
    .eq('id', carId)
    .eq('coming_soon', true)
    .select('id')

  if (error) {
    // cars_plate_uniq (019) ihlali → SQLSTATE 23505.
    if (error.code === '23505' || /duplicate key|cars_plate_uniq/i.test(error.message))
      return { ok: false, error: `Plate ${value} is already registered.` }
    return { ok: false, error: 'Activation failed.' }
  }
  if (!data || data.length === 0)
    return { ok: false, error: 'Car is not coming-soon (or not found).' }

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: 'car.activate',
    targetType: 'car',
    targetId: carId,
    details: { plate: value },
    ip: clientIp(await headers()),
  })

  revalidatePath('/[locale]/admin/cars', 'page')
  return { ok: true }
}
