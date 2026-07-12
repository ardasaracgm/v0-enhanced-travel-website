'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { MODEL_KEY_RE } from '@/lib/car-slug'

export interface UpdateModelPriceResult {
  ok: boolean
  error?: string
}

// Model havuzunun günlük fiyatını günceller: WHERE model_key=X → havuzdaki TÜM
// plakalar (konvansiyon "havuz = tek fiyat"; kirli veriyi de eşitler). retired
// satırların model_key'i NULL (019) → dokunulmaz. Gate = set-car-status.ts ile aynı.
export async function updateModelPrice(
  modelKey: string,
  price: number,
): Promise<UpdateModelPriceResult> {
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

  const key = modelKey?.trim()
  const value = Number(price)
  if (!key || !MODEL_KEY_RE.test(key)) return { ok: false, error: 'Invalid model key.' }
  if (!Number.isFinite(value) || value <= 0)
    return { ok: false, error: 'Price must be greater than 0.' }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('cars')
    .update({ price_per_day: value })
    .eq('model_key', key)
  if (error) return { ok: false, error: 'Update failed.' }

  revalidatePath('/[locale]/admin/cars', 'page')
  return { ok: true }
}
