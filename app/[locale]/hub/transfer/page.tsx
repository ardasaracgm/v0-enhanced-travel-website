import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { BusFront } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyTransferReservations } from '@/lib/hub/get-my-transfer-reservations'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
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

// RAW local date "YYYY-MM-DD" → localized; noon-UTC so the calendar date is
// stable in every server/viewer timezone.
const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB')

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan (IDOR engeli, yapısal).
export default async function HubTransferPage({
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

  const reservations = await getMyTransferReservations(user.email ?? '')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-8">
          <div className="container px-4 md:px-6 space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                {t('transferPage.back')}
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
                {t('transferPage.title')}
              </h1>
            </div>

            {reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('transferPage.noTransfer', { email: user.email ?? '' })}
              </p>
            ) : (
              <div className="space-y-4">
                {reservations.map((r) => (
                  <div key={r.tripId} className="rounded-lg border bg-background p-4 md:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <BusFront className="h-4 w-4 text-primary" />
                        {r.reference}
                      </span>
                      <Badge variant={STATE_VARIANT[r.tripState] ?? 'outline'}>
                        {t(`reservationState.${r.tripState}`)}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm font-medium text-foreground">{r.route}</p>

                    <ul className="mt-2 space-y-1.5">
                      {r.legs.map((leg, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {t(`transferPage.${leg.direction}`)}
                          </span>
                          {leg.date ? <span>{fmtDate(leg.date)}</span> : null}
                          <span>· {leg.vehicle}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-3 text-sm text-foreground">
                      {r.priceAmount.toFixed(2)} {r.priceCurrency}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
