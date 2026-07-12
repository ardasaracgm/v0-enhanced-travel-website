// brand+model → cars.model_key slug. Çift amaçlı: assignPlate havuz anahtarı
// (car-availability.ts:186) + görsel yolu /cars/<slug>.webp (normalize-car.ts:88).
// ASCII-fold + lowercase + dash. Grande Panda gibi tutarsız key'ler için form'da
// override var; bu yalnız otomatik öneriyi üretir.
export function carModelKey(brand: string, model: string): string {
  return `${brand} ${model}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diakritikleri sök (ö→o vb.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // alfanumerik olmayan → tek dash
    .replace(/^-+|-+$/g, '') // baş/son dash temizle
}

// Geçerli model_key: küçük harf/rakam grupları, tek dash ile ayrık. Boş değil.
export const MODEL_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
