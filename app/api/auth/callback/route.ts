import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'

/**
 * Supabase Auth callback — PKCE code exchange (Hub lazy-reg dönüş ucu).
 * ===================================================================
 * Magic link buraya döner: /api/auth/callback?code=<pkce>&next=/<locale>/hub
 *   1) code'u session'a çevirir (exchangeCodeForSession) → auth cookie'leri
 *      route-handler bağlamında YAZILIR (createSupabaseServerClient setAll).
 *   2) Open-redirect guard'lı 'next'e yönlendirir; sonraki istek middleware'den
 *      geçince getUser() session'ı görür → Hub girişli açılır.
 *
 * /api/* matcher'da intl-muaf olduğu için locale prefix redirect'i bu route'u
 * BOZMAZ — istek doğrudan handler'a düşer.
 */

// Open-redirect guard: yalnızca locale-prefixli İÇ path kabul.
// '//evil', mutlak URL, locale'siz path → regex başarısız → default'a düşer.
const SAFE_NEXT = /^\/(en|tr|el)\//

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Codespaces/proxy: request.url iç port :3000 taşır → NextResponse.redirect
  // origin'e :3000 sızar → /<locale>/hub 404. Genel (dış) origin'i forwarded
  // header'lardan kur; yoksa request.url'e düş (prod/Vercel'de header zaten doğru).
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? ''

  const safeNext = SAFE_NEXT.test(nextParam) ? nextParam : '/en/hub'
  // locale'i (doğrulanmış veya default) safeNext'ten türet — hata redirect'i için.
  const locale = safeNext.slice(1, 3) // 'en' | 'tr' | 'el'

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/hub?error=auth_failed`)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(`${origin}/${locale}/hub?error=auth_failed`)
  }

  return NextResponse.redirect(`${origin}${safeNext}`)
}
