import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { Luggage, MapPin } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyLuggageReservations } from '@/lib/hub/get-my-luggage-reservations'
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

// RAW local date "YYYY-MM-DD" → localized; noon-UTC so the date is TZ-stable.
const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB')
// slug → readable ("kos_port" → "Kos Port").
const humanize = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan (IDOR engeli, yapısal).
export default async function HubLuggagePage({
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

  const reservations = await getMyLuggageReservations(user.email ?? '')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-8">
          <div className="container px-4 md:px-6 space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                {t('luggagePage.back')}
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
                {t('luggagePage.title')}
              </h1>
            </div>

            {reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('luggagePage.noLuggage', { email: user.email ?? '' })}
              </p>
            ) : (
              <div className="space-y-4">
                {reservations.map((r) => {
                  const sizes = [
                    { n: r.counts.small, label: t('luggagePage.small') },
                    { n: r.counts.medium, label: t('luggagePage.medium') },
                    { n: r.counts.large, label: t('luggagePage.large') },
                  ].filter((s) => s.n > 0)
                  return (
                    <Link key={r.tripId} href={`/hub/trip/${r.tripId}`} className="block rounded-lg border bg-background p-4 md:p-5 transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <Luggage className="h-4 w-4 text-primary" />
                          {r.reference}
                        </span>
                        <Badge variant={STATE_VARIANT[r.tripState] ?? 'outline'}>
                          {t(`reservationState.${r.tripState}`)}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm font-medium text-foreground">
                        {sizes.map((s) => `${s.n} ${s.label}`).join(' · ')}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('luggagePage.dropOff')}: {fmtDate(r.dropOffDate)} → {t('luggagePage.pickup')}: {fmtDate(r.pickupDate)}
                      </p>

                      {r.location ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {humanize(r.location)}
                        </p>
                      ) : null}

                      <p className="mt-3 text-sm text-foreground">
                        {r.priceAmount.toFixed(2)} {r.priceCurrency}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
