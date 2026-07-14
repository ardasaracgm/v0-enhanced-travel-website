'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/lib/audit/log'
import { clientIp } from '@/lib/auth/rate-limit'
import { headers } from 'next/headers'

export interface SetCarStatusResult {
  ok: boolean
  error?: string
  status?: 'active' | 'maintenance'
}

// Admin'de plaka arıza toggle'ı: yalnız active↔maintenance. retired'a/retired'dan
// geçiş YOK (retired = arşiv, eski FK için durur). Gate admin-create-reservation ile aynı.
export async function setCarStatus(
  carId: string,
  next: 'active' | 'maintenance',
): Promise<SetCarStatusResult> {
  if (next !== 'active' && next !== 'maintenance') return { ok: false, error: 'Invalid status.' }

  // Gate — self-auth + is_admin (admin-create-reservation.ts:54-62).
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

  const admin = getSupabaseAdmin()
  const { data: car, error: readErr } = await admin
    .from('cars')
    .select('status')
    .eq('id', carId)
    .maybeSingle()
  if (readErr) return { ok: false, error: 'Could not load car.' }
  if (!car) return { ok: false, error: 'Car not found.' }
  if (car.status === 'retired') return { ok: false, error: 'Cannot change a retired car.' }

  const { error: updErr } = await admin.from('cars').update({ status: next }).eq('id', carId)
  if (updErr) return { ok: false, error: 'Update failed.' }

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: 'car.status',
    targetType: 'car',
    targetId: carId,
    details: { from: car.status, to: next },
    ip: clientIp(await headers()),
  })

  revalidatePath('/[locale]/admin/cars', 'page')
  return { ok: true, status: next }
}
