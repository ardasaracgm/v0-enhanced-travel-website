import { supabase } from '@/lib/supabase'
import { normalizeCar, type NormalizedCar } from '@/lib/normalize-car'
import ExtrasClient from './extras-client'

export default async function ExtrasPage() {
  const { data: rows } = await supabase
    .from('cars')
    .select('id, brand, model, category, seats, transmission, price_per_day, image_url, available')
    .eq('available', true)
    .order('price_per_day', { ascending: true })

  const cars: NormalizedCar[] = (rows ?? []).map(normalizeCar)

  return <ExtrasClient cars={cars} />
}
