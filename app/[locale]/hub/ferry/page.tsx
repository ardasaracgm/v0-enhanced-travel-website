import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { Ship } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyFerryReservations } from '@/lib/hub/get-my-ferry-reservations'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  pending_payment: 'outline',
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
  failed: 'destructive',
}

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan gelir (IDOR engeli, yapısal).
export default async function HubFerryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('hub')

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  // Email YALNIZCA doğrulanmış oturumdan. Helper'a başka kaynak GEÇMEZ.
  const reservations = await getMyFerryReservations(user.email ?? '')

  return (
    <div className="space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                {t('ferryPage.back')}
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
                {t('ferryPage.title')}
              </h1>
            </div>

            {reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('ferryPage.noFerry', { email: user.email ?? '' })}
              </p>
            ) : (
              <div className="space-y-4">
                {reservations.map((r, idx) => (
                  <Link
                    key={`${r.tripId}-${idx}`}
                    href={`/hub/trip/${r.tripId}`}
                    className="block rounded-lg border bg-background p-4 md:p-5 transition-shadow hover:shadow-md"
                  >
                    {/* Reference + trip state (PNR/Voucher moved to the detail page) */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Ship className="h-4 w-4 text-primary" />
                        {r.reference}
                      </span>
                      <Badge variant={STATE_VARIANT[r.tripState] ?? 'outline'}>
                        {t(`reservationState.${r.tripState}`)}
                      </Badge>
                    </div>

                    {/* Legs — route + local date + RAW wall-clock times (no tz shift) */}
                    <ul className="mt-3 space-y-2">
                      {r.legs.map((leg, i) => (
                        <li key={i} className="rounded-md bg-muted/40 px-3 py-2">
                          <p className="text-sm font-medium text-foreground">{leg.route}</p>
                          <p className="text-xs text-muted-foreground">
                            {leg.date
                              ? new Date(`${leg.date}T12:00:00Z`).toLocaleDateString('en-GB')
                              : '—'}
                            {leg.departureTime ? ` · ${leg.departureTime}` : ''}
                            {leg.arrivalTime ? ` – ${leg.arrivalTime}` : ''}
                          </p>
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
