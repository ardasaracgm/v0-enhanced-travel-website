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

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
