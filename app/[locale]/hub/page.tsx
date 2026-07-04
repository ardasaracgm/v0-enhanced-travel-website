import { Link } from '@/i18n/routing'
import {
  Ship, Car, MapPinned, Hotel, FileCheck, Package,
  ShieldCheck, Smartphone, Luggage, BusFront, Lock, AlertCircle,
} from 'lucide-react'

import { getTranslations } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface HubTab {
  key: string
  icon: LucideIcon
  locked: boolean
  href?: string
}

// 10 sekme. TripItemType ile hizalı (custom hariç). Vize AÇIK, gerisi kilitli.
// Etiketler i18n'den (hub.tabs.<key>) — key TripItemType slug'ı ile birebir.
const TABS: HubTab[] = [
  { key: 'visa',          icon: FileCheck,   href: '/hub/visa', locked: false },
  { key: 'ferry',         icon: Ship,        locked: true },
  { key: 'car_rental',    icon: Car,         href: '/hub/car-rental', locked: false },
  { key: 'tour',          icon: MapPinned,   locked: true },
  { key: 'hotel',         icon: Hotel,       locked: true },
  { key: 'transfer',      icon: BusFront,    locked: true },
  { key: 'package_pickup',icon: Package,     locked: true },
  { key: 'insurance',     icon: ShieldCheck, href: '/hub/insurance', locked: false },
  { key: 'esim',          icon: Smartphone,  locked: true },
  { key: 'luggage',       icon: Luggage,     locked: true },
] as const

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const t = await getTranslations('hub')
  const tCommon = await getTranslations('common')

  // SSR auth-aware client — RLS geçerli. Misafirde user=null.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {error === 'auth_failed' && (
          <div className="w-full bg-destructive/10 border-b border-destructive/30">
            <div className="container px-4 md:px-6 py-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{t('authExpired')}</span>
            </div>
          </div>
        )}
        <section className="w-full py-10 bg-gradient-to-b from-primary/5 to-background">
          <div className="container px-4 md:px-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {t('title')}
            </h1>
            <p className="text-muted-foreground">
              {user ? t('subtitleUser') : t('subtitleGuest')}
            </p>
            {user && (
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t('signedInAs', { email: user.email ?? '' })}
              </p>
            )}
          </div>
        </section>

        <section className="w-full py-8">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {TABS.map(({ key, icon: Icon, locked, href }) => {
                const body = (
                  <Card
                    className={
                      locked
                        ? 'opacity-60 cursor-not-allowed'
                        : 'transition-shadow hover:shadow-md cursor-pointer'
                    }
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                      <Icon className="h-8 w-8 text-primary" />
                      <span className="font-medium text-foreground">{t(`tabs.${key}`)}</span>
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> {tCommon('comingSoon')}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                )
                return locked || !href ? (
                  <div key={key} aria-disabled>{body}</div>
                ) : (
                  <Link key={key} href={href}>{body}</Link>
                )
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
