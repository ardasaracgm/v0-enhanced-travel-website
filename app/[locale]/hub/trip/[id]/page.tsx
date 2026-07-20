import { notFound } from 'next/navigation'
import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { Ship, Users, Ticket, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getMyTripById } from '@/lib/hub/get-my-trip-by-id'
import { PackageBoxAddressCard } from '@/components/hub/package-box-address-card'
import { formatDay, formatLocalDay, formatFerryDay } from '@/lib/dates/display'
import { buildWhatsAppLink, buildPaymentMessage } from '@/lib/contact'
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

// item_type slugs that have a hub.tabs.* label; others fall back to the raw title.
const LABELLED = new Set([
  'ferry', 'car_rental', 'tour', 'hotel', 'transfer', 'package_pickup', 'insurance', 'luggage', 'esim',
])

export default async function HubTripDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const t = await getTranslations('hub')

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  // 🔐 Ownership gate inside the helper — null → notFound (no entity leak).
  const trip = await getMyTripById(id, user.email ?? '')
  if (!trip) notFound()

  const isPending = trip.state === 'pending_payment'
  const isConfirmed = trip.state === 'confirmed' || trip.state === 'completed' || trip.state === 'in_progress'
  const payMessage = buildPaymentMessage(locale as 'en' | 'tr' | 'el', {
    reference: trip.reference,
    totalAmount: trip.totalAmount,
    currency: trip.currency,
  })

  return (
    <div className="max-w-3xl space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                {t('tripDetail.back')}
              </Link>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {trip.reference}
                </h1>
                <Badge variant={STATE_VARIANT[trip.state] ?? 'outline'}>
                  {t(`reservationState.${trip.state}`)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('tripDetail.bookedOn')}: {formatLocalDay(trip.createdAt)}
              </p>
            </div>

            {/* Payment */}
            <div className="rounded-lg border bg-background p-4 md:p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-foreground">{t('tripDetail.total')}</span>
                <span className="text-lg font-bold text-foreground">
                  {trip.totalAmount.toFixed(2)} {trip.currency}
                </span>
              </div>
              {isConfirmed ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('tripDetail.paid')}
                  {trip.confirmedAt ? ` · ${formatLocalDay(trip.confirmedAt)}` : ''}
                </p>
              ) : isPending ? (
                <div className="mt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {t('reservationState.pending_payment')}
                  </p>
                  <a
                    href={buildWhatsAppLink(locale, payMessage)}
                    target="_blank"
                    rel="noopener"
                    className="inline-block rounded-md bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
                  >
                    {t('tripDetail.payViaWhatsApp')}
                  </a>
                </div>
              ) : null}
            </div>

            {/* Services in this booking */}
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('tripDetail.servicesHeading')}
              </h2>
              <ul className="space-y-2">
                {trip.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-md border bg-background px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {LABELLED.has(it.type) ? t(`tabs.${it.type}`) : it.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {it.type === 'ferry'
                          ? formatFerryDay(it.scheduledAt, it.fromPort)
                          : formatLocalDay(it.scheduledAt)}
                        {it.endsAt
                          ? ` → ${
                              it.type === 'ferry'
                                ? formatFerryDay(it.endsAt, it.toPort)
                                : formatLocalDay(it.endsAt)
                            }`
                          : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-foreground">
                      {it.priceAmount.toFixed(2)} {it.priceCurrency}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ferry vouchers — Voucher No + PNRs (Dentur layout) + failed-reserve support */}
            {(trip.ferryVouchers.length > 0 || trip.ferryReserveFailed) && (
              <div>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Ship className="h-4 w-4" />
                  {t('tripDetail.ferryTicketsHeading')}
                </h2>
                <div className="space-y-2">
                  {trip.ferryVouchers.map((v, i) => (
                    <div key={i} className="rounded-md border bg-muted/30 px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        <Ticket className="mr-1 inline h-3.5 w-3.5" />
                        {t('tripDetail.voucherNo')}:{' '}
                        <span className="font-mono font-semibold text-foreground">{v.voucherNo}</span>
                        {v.route ? <span className="text-muted-foreground"> · {v.route}</span> : null}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {v.pnrs.map((p, j) => (
                          <li key={j} className="text-xs text-foreground">
                            PNR <span className="font-mono font-medium">{p.pnr}</span>
                            {p.passengerName ? ` · ${p.passengerName}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {trip.ferryVouchers.length > 0 && (
                    <a
                      href={`/api/hub/trip/${id}/voucher`}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('tripDetail.downloadVoucher')}
                    </a>
                  )}
                  {trip.ferryReserveFailed && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                  )}
                </div>
              </div>
            )}

            {/* Package box — Kos teslim adresi (kutu no atanmışsa = confirmed package trip) */}
            {trip.boxNumber && <PackageBoxAddressCard boxNumber={trip.boxNumber} />}

            {/* Passengers — hidden when the trip has none (luggage-only / transfer-only) */}
            {trip.passengers.length > 0 && (
              <div>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t('tripDetail.passengersHeading')}
                </h2>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">{t('tripDetail.passengersHeading')}</th>
                        <th className="px-3 py-2 font-medium">{t('tripDetail.dob')}</th>
                        <th className="px-3 py-2 font-medium">{t('tripDetail.passport')}</th>
                        <th className="px-3 py-2 font-medium">{t('tripDetail.nationality')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trip.passengers.map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2 text-foreground">
                            {p.name}
                            {p.isLead ? (
                              <Badge variant="secondary" className="ml-2 align-middle text-[10px]">
                                {t('tripDetail.lead')}
                              </Badge>
                            ) : null}
                          </td>
                          {/* A birth date is a civil date, not an instant — format it verbatim. */}
                          <td className="px-3 py-2 text-muted-foreground">{formatDay(p.birthDate)}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{p.passportMasked ?? '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.nationality ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
    </div>
  )
}
