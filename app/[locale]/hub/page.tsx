import { Link } from '@/i18n/routing'
import {
  Ship, Car, MapPinned, Hotel, FileCheck, Package,
  ShieldCheck, Smartphone, Luggage, BusFront, Lock, AlertCircle,
} from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface HubTab {
  key: string
  label: string
  icon: LucideIcon
  locked: boolean
  href?: string
}

// 10 sekme. TripItemType ile hizalı (custom hariç). Vize AÇIK, gerisi kilitli.
const TABS: HubTab[] = [
  { key: 'visa',          label: 'Visa',           icon: FileCheck,   href: '/visa', locked: false },
  { key: 'ferry',         label: 'Ferry',          icon: Ship,        locked: true },
  { key: 'car_rental',    label: 'Car Rental',     icon: Car,         locked: true },
  { key: 'tour',          label: 'Tours',          icon: MapPinned,   locked: true },
  { key: 'hotel',         label: 'Hotels',         icon: Hotel,       locked: true },
  { key: 'transfer',      label: 'Transfers',      icon: BusFront,    locked: true },
  { key: 'package_pickup',label: 'Package Pickup', icon: Package,     locked: true },
  { key: 'insurance',     label: 'Insurance',      icon: ShieldCheck, locked: true },
  { key: 'esim',          label: 'eSIM',           icon: Smartphone,  locked: true },
  { key: 'luggage',       label: 'Luggage',        icon: Luggage,     locked: true },
] as const

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

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
              <span>
                Your sign-in link expired or was already used. Request a new one
                from your booking confirmation.
              </span>
            </div>
          </div>
        )}
        <section className="w-full py-10 bg-gradient-to-b from-primary/5 to-background">
          <div className="container px-4 md:px-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Your Hub
            </h1>
            <p className="text-muted-foreground">
              {user
                ? `Signed in as ${user.email}`
                : 'Open the access link from your booking confirmation to sign in.'}
            </p>
          </div>
        </section>

        <section className="w-full py-8">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {TABS.map(({ key, label, icon: Icon, locked, href }) => {
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
                      <span className="font-medium text-foreground">{label}</span>
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> Coming soon
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
