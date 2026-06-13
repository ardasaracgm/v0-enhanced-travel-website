import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeCar } from '@/lib/normalize-car'
import { computeEndDate } from '@/lib/car-availability'
import { Link } from '@/i18n/routing'
import { NewReservationForm } from '@/components/admin/new-reservation-form'

export const dynamic = 'force-dynamic'

export default async function AdminNewReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ carId?: string; pickup?: string; dropoff?: string }>
}) {
  const { locale } = await params
  const { carId, pickup, dropoff } = await searchParams

  const supabase = getSupabaseAdmin()
  const { data: rawCars } = await supabase
    .from('cars')
    .select('*')
    .order('price_per_day', { ascending: true })

  const cars = (rawCars ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: normalizeCar(c).model,
    pricePerDay: Number(c.price_per_day ?? 0),
  }))

  const todayAthens = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
  const defaultPickup = pickup || todayAthens
  const defaultDropoff = dropoff || computeEndDate(todayAthens, 3)

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/cars" className="text-sm text-muted-foreground hover:underline">
          ← Cars
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">New reservation (walk-in)</h1>
      </div>

      {/* Form artık client island — canlı server-fiyat önizlemesi (NewReservationForm).
          Submit yine createReservation server action'a gider; fiyat orada yeniden hesaplanır. */}
      <NewReservationForm
        cars={cars}
        locale={locale}
        defaultCarId={carId}
        defaultPickup={defaultPickup}
        defaultDropoff={defaultDropoff}
      />
    </div>
  )
}
