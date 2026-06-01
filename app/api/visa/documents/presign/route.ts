/**
 * POST /api/visa/documents/presign
 * =================================
 * Vize-2 step 3 (B). Issues a presigned R2 PUT URL so the browser can upload a
 * visa document straight to R2 (the file never transits our server).
 *
 * Server-side, service-role. Validates size + MIME against the shared limits
 * and verifies the application_id actually exists before signing — a presigned
 * URL is a capability, so we gate it.
 *
 * Body: { application_id, doc_type, filename, mime_type, size }
 * 200:  { upload_url, r2_key }
 * 4xx:  { error: <code> }
 *
 * The client MUST PUT with the same Content-Type it told us (mime_type), or R2
 * rejects the upload with SignatureDoesNotMatch.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getUploadUrl, UPLOAD_URL_TTL_SECONDS } from '@/lib/r2'
import {
  buildVisaDocKey,
  isAllowedVisaDocMime,
  isAllowedVisaDocSize,
  VISA_DOC_ALLOWED_MIME_TYPES,
  VISA_DOC_MAX_BYTES,
  VISA_DOC_MIN_BYTES,
} from '@/lib/visa/upload-constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PresignBody {
  application_id?: unknown
  doc_type?: unknown
  filename?: unknown
  mime_type?: unknown
  size?: unknown
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export async function POST(req: NextRequest): Promise<Response> {
  // ----- 1. Parse -----
  let body: PresignBody
  try {
    body = (await req.json()) as PresignBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const applicationId = body.application_id
  const docType = body.doc_type
  const filename = body.filename
  const mimeType = body.mime_type
  const size = body.size

  // ----- 2. Shape validation -----
  if (
    !isNonEmptyString(applicationId) ||
    !isNonEmptyString(docType) ||
    !isNonEmptyString(filename) ||
    !isNonEmptyString(mimeType)
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (typeof size !== 'number' || !Number.isFinite(size)) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 400 })
  }

  // ----- 3. Size + MIME limits (shared constants) -----
  if (!isAllowedVisaDocSize(size)) {
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

  // ----- 4. Application must exist -----
  const supabase = getSupabaseAdmin()
  const { data: application, error: lookupErr } = await supabase
    .from('visa_applications')
    .select('id')
    .eq('id', applicationId)
    .maybeSingle()

  if (lookupErr) {
    console.error('[visa-presign] application lookup failed:', lookupErr.message)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
  if (!application) {
    return NextResponse.json({ error: 'application_not_found' }, { status: 404 })
  }

  // ----- 5. Build key + sign -----
  const r2Key = buildVisaDocKey(applicationId, docType, filename)
  try {
    const uploadUrl = await getUploadUrl(r2Key, mimeType)
    return NextResponse.json({
      upload_url: uploadUrl,
      r2_key: r2Key,
      expires_in: UPLOAD_URL_TTL_SECONDS,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[visa-presign] presign failed:', msg)
    return NextResponse.json({ error: 'presign_failed' }, { status: 500 })
  }
}
