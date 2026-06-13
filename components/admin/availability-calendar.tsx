import { Link } from '@/i18n/routing'
import type { AvailabilityCalendar as CalData } from '@/lib/car-availability'

// Hücre rengi: 0=dolu(kırmızı), kısmi=amber, tam boş=yeşil.
function cellClass(remaining: number, quantity: number): string {
  if (remaining <= 0) return 'bg-red-500/15 text-red-700 dark:text-red-400'
  if (remaining < quantity) return 'bg-amber-500/15 text-amber-700 dark:text-amber-500'
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-500'
}

export function AvailabilityCalendar({
  data,
  today,
  locale,
}: {
  data: CalData
  today: string
  locale: string
}) {
  const { days, cars } = data
  const head = days.map((d) => {
    const dt = new Date(`${d}T00:00:00Z`)
    return {
      date: d,
      dom: dt.getUTCDate(),
      wd: dt.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }),
      isToday: d === today,
    }
  })

  // 30 sütun dar ekranda taşar → overflow-x-auto ile yatay scroll. İlk kolon sticky.
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <table className="border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium">Car</th>
            {head.map((h) => (
              <th
                key={h.date}
                className={`px-2 py-1 text-center font-medium ${h.isToday ? 'bg-primary/10' : ''}`}
              >
                <div className="text-[10px] uppercase text-muted-foreground">{h.wd}</div>
                <div>{h.dom}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cars.length === 0 ? (
            <tr>
              <td colSpan={days.length + 1} className="py-8 text-center text-muted-foreground">
                No cars.
              </td>
            </tr>
          ) : (
            cars.map((car) => (
              <tr key={car.id} className="border-t">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-background px-3 py-2 font-medium text-foreground">
                  {car.name} <span className="text-muted-foreground">({car.quantity})</span>
                </td>
                {car.remainingByDay.map((rem, i) => {
                  const d = days[i]
                  const inner = (
                    <span className={`block rounded px-1 text-center ${cellClass(rem, car.quantity)}`}>
                      {rem}
                    </span>
                  )
                  return (
                    <td
                      key={d}
                      className={`px-1 py-1 ${d === today ? 'ring-1 ring-inset ring-primary/40' : ''}`}
                    >
                      {rem > 0 ? (
                        <Link href={`/admin/trips/new?carId=${car.id}&pickup=${d}&dropoff=${d}`}>{inner}</Link>
                      ) : (
                        inner
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
