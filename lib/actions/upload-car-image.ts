'use server'

import { randomUUID } from 'crypto'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export interface UploadCarImageResult {
  ok: boolean
  url?: string
  error?: string
}

const CAR_IMAGES_BUCKET = 'car-images'
const MAX_BYTES = 5 * 1024 * 1024 // 5MB
// MIME → uzantı. Ext doğrulanmış MIME'dan türetilir (dosya adından DEĞİL — dosya
// adı yalan söyleyebilir; kolona yazılan URL'nin uzantısı gerçek içeriği yansıtsın).
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// Araç görselini Supabase Storage public bucket'a yükler; kalıcı public URL döner.
// Ayrı action (add-car'a File gömülmedi) → Kademe 3c "görsel değiştir" bunu miras alır.
// Gate = set-car-status.ts ile aynı (self-auth + is_admin, storage service-role).
export async function uploadCarImage(formData: FormData): Promise<UploadCarImageResult> {
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

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No file provided.' }

  const ext = MIME_EXT[file.type]
  if (!ext) return { ok: false, error: 'Only JPG, PNG or WebP images are allowed.' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Image must be 5MB or smaller.' }

  const key = `${randomUUID()}.${ext}`
  const admin = getSupabaseAdmin()
  const { error } = await admin.storage
    .from(CAR_IMAGES_BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false })
  if (error) return { ok: false, error: 'Upload failed.' }

  const { data } = admin.storage.from(CAR_IMAGES_BUCKET).getPublicUrl(key)
  if (!data?.publicUrl) return { ok: false, error: 'Could not resolve public URL.' }

  return { ok: true, url: data.publicUrl }
}
