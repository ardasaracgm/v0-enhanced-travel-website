'use client'

/**
 * TravelBeez · Hub · tarayıcı Supabase istemcisi (auth-aware)
 * ==========================================================
 * SADECE Hub üyelik akışı için (signInWithOtp, getUser, oturum).
 * Cookie tabanlı oturumu @supabase/ssr yönetir.
 *
 * Misafir feribot booking bunu KULLANMAZ — o akış lib/supabase.ts
 * (anon, persistSession:false) ve server action'lar üzerinden gider.
 * createBrowserClient kendi içinde memoize eder; her çağrı yeni
 * bağlantı açmaz.
 */
import { createBrowserClient } from '@supabase/ssr'

/**
 * Hub magic-link (signInWithOtp) için SABİT canonical origin.
 * NEXT_PUBLIC_SITE_URL'e GÜVENME: prod'da apex (travelbeez.gr) / preview'da
 * alpha-vercel domaini çıkıyor → magic-link yanlış host'a döner, www/apex
 * cookie-session tutarsızlığı. Tek kaynak: email template ile aynı www canonical.
 * (Supabase panelinde Site URL + Redirect URLs de www'a hizalanmalı — ayrı adım.)
 */
export const HUB_AUTH_ORIGIN = 'https://www.travelbeez.gr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
