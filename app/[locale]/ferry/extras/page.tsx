import { supabase } from '@/lib/supabase'
import { normalizeCar, groupByModelKey, type NormalizedCar } from '@/lib/normalize-car'
import ExtrasClient from './extras-client'

export default async function ExtrasPage() {
  const { data: rows } = await supabase
    .from('cars')
    .select('id, brand, model, model_key, category, seats, transmission, price_per_day, image_url, available, coming_soon')
    .eq('available', true)
    .order('price_per_day', { ascending: true })

  const cars: NormalizedCar[] = groupByModelKey((rows ?? []).map(normalizeCar))

  return <ExtrasClient cars={cars} />
}
