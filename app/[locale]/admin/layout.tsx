import type { ReactNode } from 'react'

import { Link, redirect } from '@/i18n/routing'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'

// Gate her istekte oturum + is_admin okur → statik cache'lenmemeli.
export const dynamic = 'force-dynamic'

/**
 * Admin gate + shell (sabit EN).
 * GÜVENLİK: gate auth-aware client (anon key + cookie → RLS) ile yapılır;
 * kullanıcı KENDİ profiles satırını okur (profiles_select_own). Veri okuma
 * (vize listesi) ayrı: page'lerde service-role (getSupabaseAdmin). İkisi ayrı
 * kalır — gate yetki, service-role yetkili veri erişimi.
 *
 * redirect i18n/routing wrapper'ı locale prefix'ini ekler; v4 typed redirect
 * aktif locale'i argüman ister → params'tan alıp geçiyoruz.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Misafir → hub'a. (return → TS user'ı non-null daraltır)
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  // Kendi satırından is_admin (own-row RLS izin verir).
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect({ href: '/hub', locale })

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container px-4 md:px-6 py-4 flex items-center gap-6">
          <span className="text-lg font-bold text-foreground">TravelBeez Admin</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="font-medium text-foreground">
              Visa Applications
            </Link>
            <Link href="/admin/insurance" className="text-muted-foreground hover:text-foreground">
              Insurance
            </Link>
          </nav>
        </div>
      </header>
      <main className="container px-4 md:px-6 py-8">{children}</main>
    </div>
  )
}
