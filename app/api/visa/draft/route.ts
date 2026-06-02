/**
 * POST /api/visa/draft
 * =====================
 * Vize (redesign) Faz 1. Creates the application row UP FRONT, the moment the
 * wizard opens, so uploaded documents can attach to a real application_id while
 * the applicant is still filling the form. The row lands in state 'draft' with
 * every form-step column NULL (migration 008 relaxed the NOT NULLs); the
 * final-submit server action UPDATEs it and advances draft → pending_payment.
 *
 * Server-side, service-role (RLS bypassed) — mirrors the document routes.
 *
 * Body (all optional): { locale?, idempotency_key? }
 * 200: { application_id }
 *
 * Double-create protection (deliberately minimal): if the client passes an
 * idempotency_key we reuse migration-005's partial unique index
 * (visa_applications_idempotency_key_idx) — a repeated key returns the SAME
 * draft instead of spawning duplicates on a remount / double-click / retry.
 * Without a key, every call is a fresh draft.
 *
 * TODO(abandoned-drafts): wizards opened but never finalised leave rows stuck
 * in state='draft' (mostly NULL columns) forever. Add a reaper — a scheduled
 * job / SQL cron that deletes state='draft' rows older than N days — once the
 * UI is wired and we can see real abandonment rates. Cascade drops any orphan
 * visa_documents (006 FK is ON DELETE CASCADE). Out of scope for Faz 1 Adım 1.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_LOCALES = ['tr', 'en'] as const
type DraftLocale = (typeof VALID_LOCALES)[number]

interface DraftBody {
  locale?: unknown
  idempotency_key?: unknown
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function normalizeLocale(v: unknown): DraftLocale {
  return VALID_LOCALES.includes(v as DraftLocale) ? (v as DraftLocale) : 'tr'
}

export async function POST(req: NextRequest): Promise<Response> {
  // ----- 1. Parse (body is optional; tolerate an empty/absent payload) -----
  let body: DraftBody = {}
  try {
    body = (await req.json()) as DraftBody
  } catch {
    body = {}
  }

  const locale = normalizeLocale(body.locale)
  const idempotencyKey = isNonEmptyString(body.idempotency_key)
    ? body.idempotency_key.trim()
    : null

  const supabase = getSupabaseAdmin()

  // ----- 2. Double-create guard: if a draft already exists for this key, reuse it -----
  if (idempotencyKey) {
    const { data: existing, error: lookupErr } = await supabase
      .from('visa_applications')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (lookupErr) {
      console.error('[visa-draft] idempotency lookup failed:', lookupErr.message)
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }
    if (existing) {
      return NextResponse.json({ application_id: existing.id })
    }
  }

  // ----- 3. Insert a fresh draft -----
  const { data, error } = await supabase
    .from('visa_applications')
    .insert({
      state: 'draft',
      source: 'web',
      locale,
      idempotency_key: idempotencyKey, // null when not provided → index ignores it
    })
    .select('id')
    .single()

  if (error || !data) {
    // A concurrent request may have won the unique-index race on the same key.
    // Re-read once and hand back the row that landed first.
    if (idempotencyKey && error?.code === '23505') {
      const { data: raced } = await supabase
        .from('visa_applications')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (raced) return NextResponse.json({ application_id: raced.id })
    }
    console.error('[visa-draft] insert failed:', error?.message)
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({ application_id: data.id })
}
