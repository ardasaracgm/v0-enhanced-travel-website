import { notFound } from 'next/navigation'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireFullAdmin } from '@/lib/auth/require-admin'
import { Link } from '@/i18n/routing'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

// Filtre seçenekleri (TripState'in web-anlamlı alt kümesi — supabase.ts:47-54).
const STATES = [
  'pending_payment',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'failed',
] as const

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_payment: 'outline',
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
  failed: 'destructive',
}

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams

  // K2: cars_only trip listesine (PII/ödeme) erişemez — sunucu-taraflı enforcement.
  if (!(await requireFullAdmin()).ok) notFound()

  // Gate layout'ta geçildi → service-role ile oku (RLS bypass).
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('trips')
    .select('id, created_at, reference, contact_email, state, total_amount, currency')
    .order('created_at', { ascending: false })

  if (state) query = query.eq('state', state)

  const { data: trips, error } = await query

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Trips</h1>

      {/* State filtresi — searchParams ile (RSC, client gerekmez) */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/trips"
          className={`rounded-full border px-3 py-1 text-sm ${
            !state ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          All
        </Link>
        {STATES.map((s) => (
          <Link
            key={s}
            href={`/admin/trips?state=${s}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              state === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">Failed to load trips: {error.message}</p>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(trips ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No trips.
                  </TableCell>
                </TableRow>
              ) : (
                (trips ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/admin/trips/${t.id}`} className="hover:underline">
                        {t.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.contact_email}</TableCell>
                    <TableCell>
                      <Badge variant={STATE_VARIANT[t.state] ?? 'outline'}>{t.state}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {t.total_amount} {t.currency}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
