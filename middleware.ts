import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

/**
 * Locale detection & redirect middleware  +  Supabase oturum yenileme.
 *
 * SIRA (kritik):
 *  1) next-intl ÖNCE çalışır ve KENDİ response'unu üretir. Locale
 *     redirect'i (307) ve NEXT_LOCALE cookie'si bu objeye yazılır.
 *  2) Supabase, oturumu yeniler ve YENİLENEN auth cookie'lerini AYNI
 *     response objesine ekler — asla yeni bir NextResponse YARATMAZ.
 *     Böylece intl'in NEXT_LOCALE cookie'si ve redirect'i EZİLMEZ;
 *     iki cookie kümesi birleşir.
 *
 * Neden bu sıra: tersine (önce supabase response yaratıp sonra intl
 * çalıştırırsak) intl yeni bir response döndürür ve supabase'in auth
 * cookie'leri kaybolur → oturum sürekli düşer. intl response'u "sahip"
 * olduğu için ona EKLEME yapıyoruz.
 *
 * getUser() (getSession DEĞİL): access token'ı auth sunucusunda
 * doğrular; süresi geçmişse refresh token ile tazeler ve setAll
 * tetiklenir. Misafirde user=null döner → redirect/gate YOK, response
 * intl'in ürettiği gibi geçer.
 */
const handleIntl = createMiddleware({
  ...routing,
  localeDetection: true,
})

export default async function middleware(request: NextRequest) {
  // 1) next-intl response'u üretir (locale cookie + olası redirect).
  const response = handleIntl(request)

  // 2) Supabase auth cookie'lerini AYNI response'a yazar.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Oturumu yenile. Misafirde sessizce null → akış değişmez.
  await supabase.auth.getUser()

  return response
}

export const config = {
  /**
   * Match everything EXCEPT:
   *  - /api routes (server-side, no locale needed)
   *  - /_next (Next internals)
   *  - /_vercel (Vercel internals)
   *  - Static files with a file extension (favicon, .png, .css, etc.)
   *
   * Public files in /public are NOT in this matcher, so they bypass
   * the middleware entirely — no /en/favicon.ico nonsense.
   */
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
