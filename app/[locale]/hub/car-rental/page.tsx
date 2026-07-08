import { Link, redirect } from '@/i18n/routing'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyReservations } from '@/lib/hub/get-my-reservations'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_payment: 'outline',
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
  failed: 'destructive',
}

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan gelir; hiçbir client kanalı
// (query/form) email taşıyamaz (IDOR engeli, yapısal).
export default async function HubCarRentalPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  // Email YALNIZCA doğrulanmış oturumdan. Helper'a başka kaynak GEÇMEZ.
  const reservations = await getMyReservations(user.email ?? '')
  // car_rental tab → yalnız araç item'ı içeren rezervasyonlar (helper generic; süzme burada).
  const carReservations = reservations
    .map((r) => ({ ...r, carItems: r.items.filter((i) => i.type === 'car_rental') }))
    .filter((r) => r.carItems.length > 0)

  return (
    <div className="space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                ← Hub
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">Car Rentals</h1>
            </div>

            {carReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No car rentals found for {user.email}.
              </p>
            ) : (
              <div className="space-y-4">
                {carReservations.map((r) => (
                  <Link key={r.id} href={`/hub/trip/${r.id}`} className="block rounded-md border bg-background p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium text-foreground">{r.reference}</span>
                      <Badge variant={STATE_VARIANT[r.state] ?? 'outline'}>{r.state}</Badge>
                    </div>
                    <ul className="mt-3 divide-y">
                      {r.carItems.map((i, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-4 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{i.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {i.scheduledAt ? new Date(i.scheduledAt).toLocaleDateString('en-GB') : '—'}
                              {i.endsAt ? ` → ${new Date(i.endsAt).toLocaleDateString('en-GB')}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm text-foreground">
                            {i.priceAmount} {i.priceCurrency}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Link>
                ))}
              </div>
            )}
    </div>
  )
}
