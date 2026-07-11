import { NextResponse, type NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getFerryVoucherData } from '@/lib/ferry/voucher-data'
import { buildFerryVoucherPdf } from '@/lib/ferry/voucher-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  // Gate: route handler KENDİ auth'unu yapar. getFerryVoucherData email-gated →
  // başkasının trip'i null → 404 (varlık sızıntısı yok).
  const auth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const data = await getFerryVoucherData(id, user.email)
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const pdf = await buildFerryVoucherPdf(data)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="travelbeez-ferry-${data.reference}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
