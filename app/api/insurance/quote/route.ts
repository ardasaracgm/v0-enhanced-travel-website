/**
 * POST /api/insurance/quote
 * =========================
 * Auras (insurs.net) get_price proxy. api_key server-only kalır. Client yalnız
 * dateFrom/dateTo/touristCount yollar. A0: getInsuranceQuote mock döner; yapı
 * hazır, key + Auras cevabı gelince USE_MOCK_QUOTE açılınca canlıya bağlanır.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { getInsuranceQuote } from '@/lib/insurs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(req: NextRequest): Promise<Response> {
  let body: { dateFrom?: unknown; dateTo?: unknown; touristCount?: unknown; tourists?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const { dateFrom, dateTo } = body
  const touristCount = Number(body.touristCount)
  if (
    typeof dateFrom !== 'string' || !DATE_RE.test(dateFrom) ||
    typeof dateTo !== 'string' || !DATE_RE.test(dateTo) ||
    !Number.isInteger(touristCount) || touristCount < 1 || touristCount > 9
  ) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // İsteğe bağlı gerçek yolcu DOB'ları (fiyatı etkiler). Verilirse hepsi YYYY-MM-DD.
  let tourists: Array<{ dateBirth: string }> | undefined
  if (body.tourists !== undefined) {
    if (
      !Array.isArray(body.tourists) ||
      body.tourists.some(
        (t) => typeof (t as { dateBirth?: unknown })?.dateBirth !== 'string' ||
               !DATE_RE.test((t as { dateBirth: string }).dateBirth),
      )
    ) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }
    tourists = (body.tourists as Array<{ dateBirth: string }>).map((t) => ({ dateBirth: t.dateBirth }))
  }

  try {
    // tariffs[] artık coverageId + coverageValue de taşır (insurs.ts InsuranceTariff).
    const tariffs = await getInsuranceQuote({ dateFrom, dateTo, touristCount, tourists })
    return NextResponse.json({ tariffs })
  } catch (err) {
    console.error('[insurance/quote] failed:', err)
    return NextResponse.json({ error: 'quote_failed' }, { status: 502 })
  }
}
