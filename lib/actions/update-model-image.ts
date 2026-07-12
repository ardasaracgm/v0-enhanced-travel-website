'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { MODEL_KEY_RE } from '@/lib/car-slug'

export interface UpdateModelImageResult {
  ok: boolean
  error?: string
}

// Model havuzunun görselini günceller: WHERE model_key=X → havuzdaki TÜM plakalar
// (görsel model_key konvansiyonu; aynı modelin tüm plakaları tek görseli paylaşır).
// uploadCarImage'in DÖNDÜĞÜ public URL'yi yazar (upload ayrı; bu sadece DB). retired
// satırların model_key'i NULL (019) → dokunulmaz. Gate = updateModelPrice ile aynı.
export async function updateModelImage(
  modelKey: string,
  imageUrl: string,
): Promise<UpdateModelImageResult> {
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
  const url = imageUrl?.trim()
  if (!key || !MODEL_KEY_RE.test(key)) return { ok: false, error: 'Invalid model key.' }
  if (!url) return { ok: false, error: 'Image URL is required.' }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('cars')
    .update({ image_url: url })
    .eq('model_key', key)
  if (error) return { ok: false, error: 'Update failed.' }

  revalidatePath('/[locale]/admin/cars', 'page')
  return { ok: true }
}
