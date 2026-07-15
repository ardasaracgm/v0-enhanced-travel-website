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

const PER_PAGE = 50

// Bilinen action'lar (dropdown filtre). Namespace <entity>.<verb> + auth (admin.*).
const ACTIONS = [
  'payment.confirm',
  'reservation.create',
  'visa.state',
  'policy.issue',
  'visa.docx.export',
  'car.create',
  'car.status',
  'car.price.update',
  'car.image.update',
  'car.activate',
  'car.image.upload',
  'user.role.set',
  'user.disable',
  'admin.login.success',
  'admin.login.failure',
  'admin.logout',
] as const

// Badge rengi — namespace prefix'e göre kabaca gruplar.
function actionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.endsWith('.failure')) return 'destructive'
  if (action.startsWith('payment') || action.startsWith('reservation')) return 'default'
  if (action.startsWith('visa') || action.startsWith('policy')) return 'secondary'
  return 'outline'
}

type AuditRow = {
  id: number
  created_at: string
  actor_email: string | null
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  ip: string | null
}

// details jsonb serbest şekilli → kompakt key:value satırı (React escape eder → XSS yok).
function detailsText(d: Record<string, unknown>): string {
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
    .join('  ·  ')
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string
    action?: string
    from?: string
    to?: string
    comp?: string
    page?: string
  }>
}) {
  const sp = await searchParams

  // full-admin only — cars_only URL'i elle yazsa da 404 (nav filtresine ek çift savunma).
  if (!(await requireFullAdmin()).ok) notFound()

  const page = Math.max(0, Number.parseInt(sp.page ?? '0', 10) || 0)
  const actor = (sp.actor ?? '').trim()
  const action = (sp.action ?? '').trim()
  const from = (sp.from ?? '').trim()
  const to = (sp.to ?? '').trim()
  const compOnly = sp.comp === '1'

  // Okuma service-role — admin_audit_log deny-all RLS + append-only (yalnız service-role okur).
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('admin_audit_log')
    .select(
      'id, created_at, actor_email, actor_id, action, target_type, target_id, details, ip',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (actor) query = query.ilike('actor_email', `%${actor}%`)
  if (action) query = query.eq('action', action)
  if (from) query = query.gte('created_at', from) // <input type=date> → gün başı (00:00Z)
  if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`) // gün sonuna dek dahil
  if (compOnly) query = query.eq('details->>is_comp', 'true') // BEDAVA-ARABA/comp filtresi

  query = query.range(page * PER_PAGE, page * PER_PAGE + PER_PAGE - 1)

  const { data, count, error } = await query
  const rows = (data ?? []) as AuditRow[]
  const total = count ?? 0
  const hasNext = (page + 1) * PER_PAGE < total
  const hasPrev = page > 0

  // Sayfalama link'i — mevcut filtreleri koru, page'i değiştir.
  const pageHref = (p: number): string => {
    const params = new URLSearchParams()
    if (actor) params.set('actor', actor)
    if (action) params.set('action', action)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (compOnly) params.set('comp', '1')
    if (p > 0) params.set('page', String(p))
    const qs = params.toString()
    return `/admin/audit${qs ? `?${qs}` : ''}`
  }

  const rangeStart = total === 0 ? 0 : page * PER_PAGE + 1
  const rangeEnd = Math.min(total, (page + 1) * PER_PAGE)

  const inputCls =
    'h-9 rounded-md border bg-background px-2 text-sm text-foreground'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who did what. Append-only, tamper-proof. Comp (free) actions are flagged.
        </p>
      </div>

      {/* Filtre — düz GET form (RSC, client JS yok); searchParams'ı besler. */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Actor email
          <input name="actor" defaultValue={actor} placeholder="email…" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Action
          <select name="action" defaultValue={action} className={inputCls}>
            <option value="">All</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <input type="date" name="from" defaultValue={from} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <input type="date" name="to" defaultValue={to} className={inputCls} />
        </label>
        <label className="flex h-9 items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="comp" value="1" defaultChecked={compOnly} />
          Comps only
        </label>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
        <Link
          href="/admin/audit"
          className="h-9 rounded-md border px-4 text-sm leading-9 text-muted-foreground"
        >
          Reset
        </Link>
      </form>

      {error ? (
        <p className="text-sm text-destructive">Failed to load audit log: {error.message}</p>
      ) : (
        <>
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No audit entries.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const d = r.details ?? {}
                    const isComp = d.is_comp === true
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(r.created_at).toLocaleString('en-GB')}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {r.actor_email ?? r.actor_id ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionVariant(r.action)}>{r.action}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.target_type ? (
                            <span className="whitespace-nowrap">
                              {r.target_type}
                              {r.target_id ? (
                                <code className="ml-1 text-xs">{r.target_id.slice(0, 12)}</code>
                              ) : null}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="flex flex-col gap-1">
                            {isComp ? (
                              <span className="inline-flex items-center gap-2">
                                <Badge variant="destructive">COMP</Badge>
                                <span className="text-xs font-medium text-foreground">
                                  €{String(d.negotiated_rate)} / €{String(d.original_rate)}
                                </span>
                              </span>
                            ) : null}
                            <code className="break-all text-xs text-muted-foreground">
                              {detailsText(d)}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {r.ip ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Sayfalama — .range() + toplam count. Filtreler korunur. */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total === 0 ? 'No entries' : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
            </span>
            <div className="flex gap-2">
              {hasPrev ? (
                <Link href={pageHref(page - 1)} className="rounded-md border px-3 py-1">
                  ← Prev
                </Link>
              ) : (
                <span className="rounded-md border px-3 py-1 opacity-40">← Prev</span>
              )}
              {hasNext ? (
                <Link href={pageHref(page + 1)} className="rounded-md border px-3 py-1">
                  Next →
                </Link>
              ) : (
                <span className="rounded-md border px-3 py-1 opacity-40">Next →</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
