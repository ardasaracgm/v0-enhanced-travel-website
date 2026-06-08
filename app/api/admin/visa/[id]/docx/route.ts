import { NextResponse, type NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { fillVisaDocx } from '@/lib/visa/docx/fill-visa-docx'
import { upperAscii } from '@/lib/visa/docx/format'
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
  // korumaz). Auth-aware client → is_admin (own-row RLS). ----
  const auth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await auth
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // ---- Veri: service-role (RLS bypass) ----
  const { data: app, error } = await getSupabaseAdmin()
    .from('visa_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // ---- Üret: şablonu DB satırıyla doldur ----
  const buf = await fillVisaDocx(app as VisaDocxRow)
  const fname = `visa-${upperAscii(app.last_name) || 'APPLICATION'}-${id.slice(0, 8)}.docx`

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': DOCX_MIME,
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Cache-Control': 'no-store',
    },
  })
}
