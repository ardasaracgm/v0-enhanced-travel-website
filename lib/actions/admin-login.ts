'use server'

/**
 * Sifreli admin girisi (/admin-login).
 * ====================================
 * Server-side: rate-limit + signInWithPassword + non-admin reddi + audit —
 * hepsi sunucuda, client kaciramaz. Magic-link/OAuth (/login) client'tir cunku
 * redirect gerektirir; sifre ise server action olabilir.
 *
 * Gate'e (requireFullAdmin / admin layout) DOKUNULMAZ — auth-yontemi-agnostik:
 * sifreyle kurulan session, magic-link session'i ile ayni cookie mekanizmasi.
 */

import { headers } from 'next/headers'
import { redirect, routing, type Locale } from '@/i18n/routing'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkRateLimit, clientIp } from '@/lib/auth/rate-limit'
import { logAuditEvent } from '@/lib/audit/log'

export type AdminLoginState = { error?: 'invalid' | 'rate_limited' | 'missing' }

export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const rawLocale = String(formData.get('locale') ?? 'en')
  const locale: Locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : 'en'

  if (!email || !password) return { error: 'missing' }

  const ip = clientIp(await headers())

  // 1) Rate-limit — kimlik dogrulama denemesinden ONCE (Auth'u brute-force'tan korur).
  //    Bu cagri ayrica admin_login_attempts'e satir birakir (basarisiz deneme de sayilir).
  const { limited } = await checkRateLimit({
    table: 'admin_login_attempts',
    ip,
    windowMs: 60_000,
    max: 8,
  })
  if (limited) return { error: 'rate_limited' }

  // 2) Sifre dogrulama — SSR cookie client (basari session cookie'lerini kurar).
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // 3) Basarisiz -> generic 'invalid'. ENUMERATION YOK: Supabase wrong-email ve
  //    wrong-password icin ayni generic hatayi verir; biz de hangi alan diye ayirt etmeyiz.
  if (error || !data.user) {
    await logAuditEvent({
      actorEmail: email,
      action: 'admin.login.failure',
      details: { reason: 'invalid_credentials' },
      ip,
    })
    return { error: 'invalid' }
  }

  // 4) Sifre dogru AMA is_admin degil -> YARIM-LOGIN BIRAKMA: signOut ile session'i
  //    geri al, generic 'invalid' don. Boylece saldirgan "sifre dogru ama admin degil"
  //    cikarimi yapamaz (enumeration kapali). Normal kullanici zaten /login kullanir.
  //    is_admin okumasi service-role ile -> deterministik (RLS/session-timing yok).
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('is_admin, admin_role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    await supabase.auth.signOut() // yarim kurulan cookie session'i temizle
    await logAuditEvent({
      actorId: data.user.id,
      actorEmail: email,
      action: 'admin.login.failure',
      details: { reason: 'not_admin' },
      ip,
    })
    return { error: 'invalid' }
  }

  // 5) Basarili admin girisi -> iz + redirect.
  await logAuditEvent({
    actorId: data.user.id,
    actorEmail: email,
    action: 'admin.login.success',
    details: { admin_role: profile.admin_role },
    ip,
  })

  // cars_only, /admin dashboard'unda requireFullAdmin -> notFound alir; /admin/cars'a al.
  const dest = profile.admin_role === 'cars_only' ? '/admin/cars' : '/admin'
  // redirect NEXT_REDIRECT firlatir (framework yakalar; useActionState state'ine dusmez).
  // Asagidaki return ULASILMAZ — yalniz i18n redirect 'never' tipinde olmadigi icin
  // TS fall-through'unu susturur (createReservation ile ayni desen).
  redirect({ href: dest, locale })
  return {}
}
