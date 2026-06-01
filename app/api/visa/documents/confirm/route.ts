/**
 * POST /api/visa/documents/confirm
 * =================================
 * Vize-2 step 3 (C). Records a successfully-uploaded visa document AFTER the
 * browser has PUT it to R2 with the presigned URL.
 *
 * Server-side, service-role. Supports re-upload: any existing status='uploaded'
 * row for the same (application_id, doc_type) is flipped to 'replaced' first,
 * then the new row is inserted. The current file for a doc_type is always the
 * single status='uploaded' row (enforced by visa_documents_current_idx).
 *
 * Body: { application_id, doc_type, r2_key, original_filename, mime_type, size_bytes }
 * 200:  { ok: true, id, replaced_id }
 * 4xx:  { error: <code> }
 */
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  isAllowedVisaDocMime,
  isAllowedVisaDocSize,
  VISA_DOC_ALLOWED_MIME_TYPES,
  VISA_DOC_MAX_BYTES,
  VISA_DOC_MIN_BYTES,
} from '@/lib/visa/upload-constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ConfirmBody {
  application_id?: unknown
  doc_type?: unknown
  r2_key?: unknown
  original_filename?: unknown
  mime_type?: unknown
  size_bytes?: unknown
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function POST(req: NextRequest): Promise<Response> {
  // ----- 1. Parse -----
  let body: ConfirmBody
  try {
    body = (await req.json()) as ConfirmBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const applicationId = body.application_id
  const docType = body.doc_type
  const r2Key = body.r2_key
  const originalFilename = body.original_filename
  const mimeType = body.mime_type
  const sizeBytes = body.size_bytes

  // ----- 2. Shape validation -----
  if (
    !isNonEmptyString(applicationId) ||
    !isNonEmptyString(docType) ||
    !isNonEmptyString(r2Key) ||
    !isNonEmptyString(originalFilename) ||
    !isNonEmptyString(mimeType)
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes)) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 400 })
  }

  // ----- 3. Defence-in-depth: re-check limits (presign already gated, but the
  //          confirm body is independent and equally untrusted). -----
  if (!isAllowedVisaDocSize(sizeBytes)) {
    return NextResponse.json(
      { error: 'invalid_size', min: VISA_DOC_MIN_BYTES, max: VISA_DOC_MAX_BYTES },
      { status: 400 },
    )
  }
  if (!isAllowedVisaDocMime(mimeType)) {
    return NextResponse.json(
      { error: 'invalid_mime_type', allowed: VISA_DOC_ALLOWED_MIME_TYPES },
      { status: 400 },
    )
  }

  // The r2_key must belong to this application (we minted it in presign as
  // visa/{application_id}/...). Rejects a client trying to attach an arbitrary
  // key to someone else's application.
  if (!r2Key.startsWith(`visa/${applicationId}/`)) {
    return NextResponse.json({ error: 'key_application_mismatch' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // ----- 4. Application must exist -----
  const { data: application, error: lookupErr } = await supabase
    .from('visa_applications')
    .select('id')
    .eq('id', applicationId)
    .maybeSingle()

  if (lookupErr) {
    console.error('[visa-confirm] application lookup failed:', lookupErr.message)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
  if (!application) {
    return NextResponse.json({ error: 'application_not_found' }, { status: 404 })
  }

  // ----- 5. Re-upload: retire the current file for this (application, doc_type) -----
  const { data: replaced, error: replaceErr } = await supabase
    .from('visa_documents')
    .update({ status: 'replaced', updated_at: new Date().toISOString() })
    .eq('application_id', applicationId)
    .eq('doc_type', docType)
    .eq('status', 'uploaded')
    .select('id')
    .maybeSingle()

  if (replaceErr) {
    console.error('[visa-confirm] retire previous failed:', replaceErr.message)
    return NextResponse.json({ error: 'replace_failed' }, { status: 500 })
  }

  // ----- 6. Insert the new current row -----
  const { data: inserted, error: insertErr } = await supabase
    .from('visa_documents')
    .insert({
      application_id: applicationId,
      doc_type: docType,
      r2_key: r2Key,
      original_filename: originalFilename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      status: 'uploaded',
    })
    .select('id')
    .single()

  if (insertErr || !inserted) {
    console.error('[visa-confirm] insert failed:', insertErr?.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    replaced_id: replaced?.id ?? null,
  })
}
