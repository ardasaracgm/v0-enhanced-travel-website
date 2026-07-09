import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Link } from '@/i18n/routing'
import { Badge } from '@/components/ui/badge'
import { confirmPayment } from '@/lib/actions/admin-confirm-payment'
import { formatLocalDay, formatFerryDay } from '@/lib/dates/display'
import type { FerryItemMetadata } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// action'daki ALLOWED_PROVIDERS ile hizalı.
const PROVIDERS = ['cash', 'bank_transfer'] as const

// Ferry reservation state at-a-glance (Dentur reserve, written by reserveFerry onto
// the ferry item metadata). On a partial open-jaw booking some ferry legs read
// 'reserved' (green) and others 'failed' (red) — the admin tells them apart visually.
function FerryReserveBadge({ state }: { state?: string }) {
  if (state === 'reserved') {
    return <Badge className="border-transparent bg-green-600 text-white hover:bg-green-600">reserved</Badge>
  }
  if (state === 'failed') {
    return <Badge variant="destructive">reserve failed</Badge>
  }
  return <Badge variant="outline" className="text-muted-foreground">not reserved</Badge>
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value === null || value === '' ? '—' : value}</dd>
    </div>
  )
}

export default async function AdminTripDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = getSupabaseAdmin()

  const { data: trip } = await supabase.from('trips').select('*').eq('id', id).maybeSingle()
  if (!trip) notFound()

  const { data: items } = await supabase
    .from('trip_items')
    .select('item_type, title, scheduled_at, price_amount, price_currency, metadata')
    .eq('trip_id', id)
    .order('sequence', { ascending: true })

  const { data: payments } = await supabase
    .from('payments')
    .select('provider, amount, currency, state, created_at')
    .eq('trip_id', id)
    .order('created_at', { ascending: false })

  // Yalnız bekleyen ödeme onaylanabilir — cancelled/failed/confirmed pasif (yanlış
  // diriltme yok). action ALLOWED_PROVIDERS + is_admin'i zaten doğrular; bu UI gate.
  const canConfirm = trip.state === 'pending_payment'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/trips" className="text-sm text-muted-foreground hover:underline">
            ← Trips
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{trip.reference}</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          {trip.state}
        </Badge>
      </div>

      {/* Manuel ödeme onayı — her sağlayıcı ayrı form; action kendi içinde is_admin
          doğrular. Yalnız pending_payment'ta aktif (visa/[id]:80-99 "Set state" pattern). */}
      <div className="rounded-md border bg-background p-4">
        <p className="mb-1 text-sm font-medium text-foreground">Mark paid</p>
        <p className="mb-3 text-xs text-muted-foreground">
          WhatsApp/banka ödemesi alındıysa işaretle → trip confirmed + onay e-postası (yalnız ilk onayda).
        </p>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((provider) => (
            <form key={provider} action={confirmPayment}>
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="provider" value={provider} />
              <button
                type="submit"
                disabled={!canConfirm}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                {provider}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Items */}
      <section className="rounded-md border bg-background p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Items</h2>
        {(items ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No items.</p>
        ) : (
          <ul className="divide-y">
            {(items ?? []).map((i, idx) => (
              <li key={idx} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.item_type}
                    {i.scheduled_at
                      ? ` · ${
                          i.item_type === 'ferry'
                            ? formatFerryDay(
                                i.scheduled_at,
                                (i.metadata as FerryItemMetadata | null)?.from_port,
                              )
                            : formatLocalDay(i.scheduled_at)
                        }`
                      : ''}
                  </p>
                  {i.item_type === 'ferry' && (
                    <div className="mt-1">
                      <FerryReserveBadge
                        state={(i.metadata as { reserve_state?: string } | null)?.reserve_state}
                      />
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-sm text-foreground">
                  {i.price_amount} {i.price_currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payments */}
      <section className="rounded-md border bg-background p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Payments</h2>
        {(payments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <ul className="divide-y">
            {(payments ?? []).map((p, idx) => (
              <li key={idx} className="flex items-center justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.state} · {new Date(p.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-foreground">
                  {p.amount} {p.currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Trip & contact */}
      <section className="grid gap-6 md:grid-cols-2">
        <dl className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Trip</h2>
          <Field label="Reference" value={trip.reference} />
          <Field label="State" value={trip.state} />
          <Field label="Total" value={`${trip.total_amount} ${trip.currency}`} />
          <Field label="Party size" value={trip.party_size} />
          <Field label="Dates" value={`${trip.start_date ?? '—'} → ${trip.end_date ?? '—'}`} />
          <Field label="Source / locale" value={`${trip.source ?? '—'} / ${trip.locale}`} />
        </dl>

        <dl className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Contact & Meta</h2>
          <Field label="Email" value={trip.contact_email} />
          <Field label="Phone" value={trip.contact_phone} />
          <Field
            label="Confirmed at"
            value={trip.confirmed_at ? new Date(trip.confirmed_at).toLocaleString('en-GB') : '—'}
          />
          <Field label="Created" value={new Date(trip.created_at).toLocaleString('en-GB')} />
        </dl>
      </section>
    </div>
  )
}
