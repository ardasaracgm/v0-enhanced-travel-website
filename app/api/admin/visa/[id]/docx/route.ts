import { NextResponse, type NextRequest } from 'next/server'

import { requireFullAdmin } from '@/lib/auth/require-admin'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logAuditEvent } from '@/lib/audit/log'
import { clientIp } from '@/lib/auth/rate-limit'
import { fillVisaDocx, type VisaPhoto } from '@/lib/visa/docx/fill-visa-docx'
import { upperAscii } from '@/lib/visa/docx/format'
import { getObjectBytes } from '@/lib/r2'
import type { VisaDocxRow } from '@/lib/visa/docx/field-map'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  // ---- Gate: route handler KENDİ yetki doğrulamasını yapar (admin layout /api'yi
  // korumaz). full-admin (is_admin && admin_role='full') değilse 403; cars_only
  // vize PII'sine erişemez. (401/403 tek 403'e iner — auth durumu sızdırılmaz.) ----
  const gate = await requireFullAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // ---- Veri: service-role (RLS bypass) ----
  const { data: app, error } = await getSupabaseAdmin()
    .from('visa_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // ---- Biyometrik fotoğraf (opsiyonel): docx PHOTO kutusuna göm. NON-FATAL —
  // eksik/başarısız foto konsolosluk belgesini ASLA bloke etmemeli (henüz
  // yüklenmemiş olabilir; yalnız png/jpeg gömülür, PDF-foto atlanır). ----
  let photo: VisaPhoto | undefined
  try {
    const { data: doc } = await getSupabaseAdmin()
      .from('visa_documents')
      .select('r2_key, mime_type')
      .eq('application_id', id)
      .eq('doc_type', 'biometric_photo')
      .eq('status', 'uploaded')
      .maybeSingle()
    if (doc?.r2_key && (doc.mime_type === 'image/png' || doc.mime_type === 'image/jpeg')) {
      photo = { bytes: await getObjectBytes(doc.r2_key), mime: doc.mime_type }
    }
  } catch (e) {
    console.error('[visa docx] photo embed skipped:', e)
  }

  // ---- Üret: şablonu DB satırıyla doldur ----
  const buf = await fillVisaDocx(app as VisaDocxRow, photo)
  const fname = `visa-${upperAscii(app.last_name) || 'APPLICATION'}-${id.slice(0, 8)}.docx`

  // Audit izi — PII EGRESS: "kim hangi vize başvurusunun PII'ını Word indirdi"
  // (GDPR/denetim değerli). docx üretimi başarılı SONRA, stream return'den ÖNCE.
  // ip req'ten okunur (route handler → next/headers gerekmez). Stream/header'lara dokunulmaz.
  await logAuditEvent({
    actorId: gate.userId,
    actorEmail: gate.email,
    action: 'visa.docx.export',
    targetType: 'visa',
    targetId: id,
    details: { fname },
    ip: clientIp(_req.headers),
  })

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': DOCX_MIME,
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Cache-Control': 'no-store',
    },
  })
}
