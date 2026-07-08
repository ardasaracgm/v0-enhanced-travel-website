import { NextResponse, after, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendSignupNotification } from '@/lib/email/send-signup-notification'

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

  // Başarısız giriş → /login (retry sayfası) + hata + 'next' korunur (guest /hub
  // artık login'e yönlendiriyor; auth_failed geri bildirimi login'de gösterilir).
  const failUrl = `${origin}/${locale}/login?error=auth_failed&next=${encodeURIComponent(safeNext)}`

  if (!code) {
    return NextResponse.redirect(failUrl)
  }

  const supabase = await createSupabaseServerClient()
  const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(failUrl)
  }

  // First login → one internal "new member" notice to NOTIFY_ADDRESS. Runs via
  // after() (post-response), so the login redirect is NEVER delayed and — unlike
  // a bare fire-and-forget — Vercel keeps the function alive to finish it. The
  // atomic claim (service-role, context-free inside after) fires exactly once per
  // user across the every-login callback (magic-link + Google OAuth). Fully
  // non-fatal: any failure is logged, never surfaced to the user.
  const userId = exchanged.user?.id
  if (userId) {
    after(async () => {
      try {
        const { data: claimed } = await getSupabaseAdmin()
          .from('profiles')
          .update({ welcome_notified_at: new Date().toISOString() })
          .eq('id', userId)
          .is('welcome_notified_at', null)
          .select('email, created_at')
          .maybeSingle()
        if (claimed?.email) {
          await sendSignupNotification(claimed.email as string, (claimed.created_at as string | null) ?? null)
        }
      } catch (e) {
        console.error('[signup-notify] claim/send failed (non-fatal):', e instanceof Error ? e.message : String(e))
      }
    })
  }

  return NextResponse.redirect(`${origin}${safeNext}`)
}
