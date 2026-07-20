import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { Package, MapPin } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyPackagePickupReservations } from '@/lib/hub/get-my-package-pickup-reservations'
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

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// 🔐 searchParams KASITLI YOK — email YALNIZ oturumdan (IDOR engeli, yapısal).
export default async function HubPackagePickupPage({
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

  const reservations = await getMyPackagePickupReservations(user.email ?? '')

  // Dashboard satırıyla BİREBİR tarih formatı (uzun ay, locale-aware): package artık
  // dashboard'da da bir satır → aynı yüzey ailesi, aynı görünüm. start_date/end_date
  // HAM "YYYY-MM-DD"; noon-UTC + explicit UTC server-TZ-proof (bkz. lib/dates/display).
  const intl = locale === 'el' ? 'el-GR' : locale === 'tr' ? 'tr-TR' : 'en-GB'
  const fmtDate = (d: string) =>
    d
      ? new Date(`${d}T12:00:00Z`).toLocaleDateString(intl, {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
        })
      : '—'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
          {t('packagePickupPage.back')}
        </Link>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
          {t('packagePickupPage.title')}
        </h1>
      </div>

      {reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('packagePickupPage.noPackages', { email: user.email ?? '' })}
        </p>
      ) : (
        <div className="space-y-4">
          {reservations.map((r) => (
            <Link
              key={r.tripId}
              href={`/hub/trip/${r.tripId}`}
              className="block rounded-lg border bg-background p-4 md:p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Package className="h-4 w-4 text-primary" />
                  {r.reference}
                </span>
                <Badge variant={STATE_VARIANT[r.tripState] ?? 'outline'}>
                  {t(`reservationState.${r.tripState}`)}
                </Badge>
              </div>

              <p className="mt-2 text-sm font-medium text-foreground">
                {t('packagePickupPage.boxNumber')}: {r.boxNumber ?? '—'}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {t('packagePickupPage.size')}: {r.size ? r.size.toUpperCase() : '—'}
                {' · '}
                {t('packagePickupPage.duration', { count: r.months })}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
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
          ))}
        </div>
      )}
    </div>
  )
}
