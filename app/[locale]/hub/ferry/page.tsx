import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { Ship, Ticket, AlertCircle } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyFerryReservations } from '@/lib/hub/get-my-ferry-reservations'
import { buildWhatsAppLink } from '@/lib/contact'
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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-8">
          <div className="container px-4 md:px-6 space-y-6">
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
                  <div
                    key={`${r.tripId}-${idx}`}
                    className="rounded-lg border bg-background p-4 md:p-5"
                  >
                    {/* Reference + trip state */}
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

                          {/* PNRs — ONLY when reserved (pending has none) */}
                          {r.reserveState === 'reserved' && leg.pnrs.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {leg.pnrs.map((p, j) => (
                                <li key={j} className="text-xs text-foreground">
                                  PNR <span className="font-mono font-medium">{p.pnr}</span>
                                  {p.passengerName ? ` · ${p.passengerName}` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Voucher No (reserved) / support (failed) / processing (pending) */}
                    {r.reserveState === 'reserved' && r.voucherNo ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
                        <Ticket className="h-4 w-4 text-primary" />
                        {t('ferryPage.voucherNo')}:{' '}
                        <span className="font-mono font-semibold">{r.voucherNo}</span>
                      </div>
                    ) : r.reserveState === 'failed' ? (
                      <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <p className="flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {t('ferryPage.reserveFailed')}
                        </p>
                        <a
                          href={buildWhatsAppLink(locale)}
                          target="_blank"
                          rel="noopener"
                          className="mt-1 inline-block font-medium underline"
                        >
                          {t('ferryPage.contactSupport')}
                        </a>
                      </div>
                    ) : r.reserveState === 'pending' ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {t('ferryPage.reservationPending')}
                      </p>
                    ) : null}
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
