'use server'

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { MODEL_KEY_RE } from '@/lib/car-slug'

export interface AddCarInput {
  brand: string
  model: string
  modelKey: string
  category: string
  pricePerDay: number
  seats: number
  transmission: string
  plate: string
  imageUrl?: string
}

export interface AddCarResult {
  ok: boolean
  error?: string
  id?: string
}

const CATEGORIES = ['microcar', 'compact', '5-seater', 'suv'] as const
const TRANSMISSIONS = ['Manual', 'Automatic'] as const

// Admin'de yeni aktif plaka ekler. Gate = set-car-status.ts ile aynı (self-auth +
// is_admin, yazı service-role ile). Envanter yaşam döngüsünün SADECE "aktif araç
// ekle" ucu; coming-soon seed + retire hâlâ SQL migration'la (023/019). specs SET
// EDİLMEZ → normalizeCar `ac ?? true` ile AC rozeti otomatik (mevcut 8 araçla birebir).
export async function addCar(input: AddCarInput): Promise<AddCarResult> {
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

  // ── Validation (server-authoritative; client preview yalnız kolaylık).
  const brand = input.brand?.trim()
  const model = input.model?.trim()
  const modelKey = input.modelKey?.trim()
  const plate = input.plate?.trim()
  const { category, transmission } = input
  const pricePerDay = Number(input.pricePerDay)
  const seats = Number(input.seats)

  if (!brand) return { ok: false, error: 'Brand is required.' }
  if (!model) return { ok: false, error: 'Model is required.' }
  if (!plate) return { ok: false, error: 'Plate is required.' }
  if (!modelKey || !MODEL_KEY_RE.test(modelKey))
    return { ok: false, error: 'Model key must be lowercase letters, numbers and dashes.' }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number]))
    return { ok: false, error: 'Invalid category.' }
  if (!TRANSMISSIONS.includes(transmission as (typeof TRANSMISSIONS)[number]))
    return { ok: false, error: 'Invalid transmission.' }
  if (!Number.isFinite(pricePerDay) || pricePerDay <= 0)
    return { ok: false, error: 'Price per day must be greater than 0.' }
  if (!Number.isInteger(seats) || seats < 1)
    return { ok: false, error: 'Seats must be a positive whole number.' }

  // Insert — flat kolonlar. Sabitler: aktif + kiralanabilir + Kos + owned + tek plaka
  // (019 seed konvansiyonu). specs yok → AC default'u devreye girer.
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('cars')
    .insert({
      brand,
      model,
      model_key: modelKey,
      category,
      plate,
      price_per_day: pricePerDay,
      seats,
      transmission,
      status: 'active',
      coming_soon: false,
      available: true,
      location: 'kos',
      source: 'owned',
      priority: 1,
      quantity: 1,
      // undefined/'' → NULL → kart /cars/<model_key>.webp convention'a düşer (opsiyonel).
      image_url: input.imageUrl?.trim() || null,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    // cars_plate_uniq (019) ihlali → SQLSTATE 23505.
    if (error.code === '23505' || /duplicate key|cars_plate_uniq/i.test(error.message))
      return { ok: false, error: `Plate ${plate} is already registered.` }
    return { ok: false, error: 'Insert failed.' }
  }

  revalidatePath('/[locale]/admin/cars', 'page')
  return { ok: true, id: data?.id as string | undefined }
}
