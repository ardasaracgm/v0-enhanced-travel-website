import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeCar } from '@/lib/normalize-car'
import { computeEndDate } from '@/lib/car-availability'
import { Link } from '@/i18n/routing'
import { createReservation } from '@/lib/actions/admin-create-reservation'

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

      {/* Düz server-action form (RSC, client JS yok). Hata → throw (parça-2 deseni). */}
      <form action={createReservation} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />

        <div className="flex flex-col gap-1">
          <label htmlFor="carId" className="text-sm font-medium text-foreground">
            Car
          </label>
          <select
            id="carId"
            name="carId"
            defaultValue={carId ?? ''}
            required
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Select a car…
            </option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — €{c.pricePerDay}/gün
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="pickup" className="text-sm font-medium text-foreground">
              Pickup
            </label>
            <input
              id="pickup"
              name="pickup"
              type="date"
              defaultValue={defaultPickup}
              required
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dropoff" className="text-sm font-medium text-foreground">
              Dropoff
            </label>
            <input
              id="dropoff"
              name="dropoff"
              type="date"
              defaultValue={defaultDropoff}
              required
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="customerName" className="text-sm font-medium text-foreground">
            Customer name
          </label>
          <input
            id="customerName"
            name="customerName"
            type="text"
            required
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="customerPhone" className="text-sm font-medium text-foreground">
              Phone
            </label>
            <input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              required
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="customerEmail" className="text-sm font-medium text-foreground">
              Email <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="negotiatedRate" className="text-sm font-medium text-foreground">
            Negotiated total <span className="text-muted-foreground">(optional — boşsa sunucu fiyatı)</span>
          </label>
          <input
            id="negotiatedRate"
            name="negotiatedRate"
            type="number"
            min="0"
            step="0.01"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          />
        </div>

        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Create reservation
        </button>
      </form>
    </div>
  )
}
