/**
 * GET /api/visa/documents/list?application_id=...
 * ===============================================
 * Vize (redesign) Faz 1. Lightweight read of the documents already uploaded for
 * a draft, so the inline wizard slots can reopen filled even after a slot
 * unmounts/remounts (e.g. sponsor → self → sponsor toggles the sponsor slots).
 *
 * Mirrors the query the documents page does server-side: the current file for a
 * doc_type is the single status='uploaded' row (visa_documents_current_idx).
 *
 * Server-side, service-role (RLS bypassed) — the rows are PII-adjacent.
 *
 * 200: { documents: { doc_type, original_filename }[] }
 * 400: { error: 'missing_application_id' }
 */
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const applicationId = req.nextUrl.searchParams.get('application_id')?.trim()
  if (!applicationId) {
    return NextResponse.json({ error: 'missing_application_id' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('visa_documents')
    .select('doc_type, original_filename')
    .eq('application_id', applicationId)
    .eq('status', 'uploaded')

  if (error) {
    // A malformed uuid surfaces as a query error — treat as "nothing uploaded"
    // rather than 500, so a stale/garbage draft id never blocks the wizard.
    console.error('[visa-documents-list] query failed:', error.message)
    return NextResponse.json({ documents: [] })
  }

  return NextResponse.json({ documents: data ?? [] })
}
