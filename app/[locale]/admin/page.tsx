import { getSupabaseAdmin } from '@/lib/supabase-server'
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

// promo_code → referans sahibi. UI-only sabit map; kodların kendisi env'de
// (VISA_PROMO_CODES), isimler burada yalnız görüntü için.
const REFERRERS: Record<string, string> = {
  'cml5370!': 'Cemil',
  'dmtr5370!': 'Dimitri',
  'yvz5370!': 'Yavuz',
}

// Filtre seçenekleri (visa_applications_state_check'in web-anlamlı alt kümesi).
const STATES = [
  'pending_payment',
  'documents_submitted',
  'reviewed',
  'approved',
  'rejected',
] as const

const STATE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_payment: 'outline',
  documents_submitted: 'secondary',
  reviewed: 'default',
  approved: 'default',
  rejected: 'destructive',
}

export default async function AdminVisaPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams

  // Gate layout'ta geçildi → burada service-role ile oku (RLS bypass).
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('visa_applications')
    .select('id, created_at, first_name, last_name, email, phone, state, promo_code, trip_id')
    .order('created_at', { ascending: false })

  if (state) query = query.eq('state', state)

  const { data: apps, error } = await query

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Visa Applications</h1>

      {/* State filtresi — searchParams ile (RSC, client gerekmez) */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className={`rounded-full border px-3 py-1 text-sm ${
            !state ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          All
        </Link>
        {STATES.map((s) => (
          <Link
            key={s}
            href={`/admin?state=${s}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              state === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">Failed to load applications: {error.message}</p>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Promo / Referrer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(apps ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No applications.
                  </TableCell>
                </TableRow>
              ) : (
                (apps ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/admin/visa/${a.id}`} className="hover:underline">
                        {a.first_name} {a.last_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant={STATE_VARIANT[a.state] ?? 'outline'}>{a.state}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.promo_code
                        ? `${a.promo_code}${
                            REFERRERS[a.promo_code] ? ` · ${REFERRERS[a.promo_code]}` : ''
                          }`
                        : '—'}
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
