/**
 * POST /api/visa/documents/submit
 * ================================
 * Vize-2 step 4 (part 4). Finalises the document-upload phase: verifies every
 * REQUIRED document is actually uploaded, then advances the application to
 * 'documents_submitted'.
 *
 * Server-side, service-role. The required-document check is authoritative here
 * — the client gate is UX only. We re-read the application from the DB, re-run
 * resolveDocuments() server-side (age / funding source / vessel decide which
 * docs are required), and confirm each required doc_type has a current
 * status='uploaded' row. A client cannot force submit with missing documents.
 *
 * Body: { application_id }
 * 200:  { ok: true }
 * 400:  { error: 'missing_documents', missing: string[] }  — required gap
 * 4xx/5xx: other error codes
 *
 * Vize-3 (signature/payment) is NOT triggered here.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolveDocuments, type VisaApplicationForDocs } from '@/lib/visa-documents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function POST(req: NextRequest): Promise<Response> {
  // ----- 1. Parse -----
  let body: { application_id?: unknown }
  try {
    body = (await req.json()) as { application_id?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const applicationId = body.application_id
  if (!isNonEmptyString(applicationId)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // ----- 2. Read the application (fields the condition engine needs + metadata) -----
  const { data: app, error: appErr } = await supabase
    .from('visa_applications')
    .select('id, birth_date, vessel_type, metadata')
    .eq('id', applicationId)
    .maybeSingle()

  if (appErr) {
    console.error('[visa-submit] application lookup failed:', appErr.message)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
  if (!app) {
    return NextResponse.json({ error: 'application_not_found' }, { status: 404 })
  }

  // ----- 3. Resolve REQUIRED docs server-side (authoritative) -----
  const requiredKeys = resolveDocuments(app as VisaApplicationForDocs)
    .filter((d) => d.isRequired)
    .map((d) => d.key)

  // ----- 4. Which required docs are actually uploaded? -----
  const { data: uploaded, error: docsErr } = await supabase
    .from('visa_documents')
    .select('doc_type')
    .eq('application_id', applicationId)
    .eq('status', 'uploaded')

  if (docsErr) {
    console.error('[visa-submit] documents lookup failed:', docsErr.message)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }

  const uploadedSet = new Set((uploaded ?? []).map((r) => r.doc_type as string))
  const missing = requiredKeys.filter((k) => !uploadedSet.has(k))
  if (missing.length > 0) {
    return NextResponse.json({ error: 'missing_documents', missing }, { status: 400 })
  }

  // ----- 5. Advance state + stamp metadata (MERGE, don't overwrite) -----
  const existingMeta =
    app.metadata && typeof app.metadata === 'object' ? (app.metadata as Record<string, unknown>) : {}

  const { error: updErr } = await supabase
    .from('visa_applications')
    .update({
      state: 'documents_submitted',
      metadata: { ...existingMeta, documents_submitted_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (updErr) {
    console.error('[visa-submit] state update failed:', updErr.message)
    return NextResponse.json({ error: 'state_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
