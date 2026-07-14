import { NextResponse, type NextRequest } from 'next/server'

import { getPublicFerryVoucherData } from '@/lib/ferry/voucher-data'
import { buildFerryVoucherPdf } from '@/lib/ferry/voucher-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PUBLIC feribot voucher indirme — token-gate (auth YOK). /ticket/[token] sayfasının
 * "Bileti İndir" butonu buraya bağlanır. getPublicFerryVoucherData gate'i:
 * bilinmeyen/bozuk token, iptal trip, rezerve feribot yok → null → 404 (varlık sızıntısı yok).
 *
 * Fiyat/passport/DOB/email/telefon PDF'e GİRMEZ (buildFerryVoucherPdf yüzeyi + public DTO).
 * Rate-limit gereksiz: public_token gen_random_uuid (tahmin-edilemez), brute-force yüzeyi yok.
 * PDFDocument({font:false}) trap'i buildFerryVoucherPdf içinde çözülü (Hub route ile aynı fn).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params

  const data = await getPublicFerryVoucherData(token)
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
