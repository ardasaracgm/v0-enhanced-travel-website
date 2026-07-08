'use client'

/**
 * Beez Hub left-nav sidebar. Client component: needs usePathname for the active
 * highlight and the browser Supabase client for sign-out.
 *
 * A1 lives inside the dashboard page only (avoids the double-<Header/> that a
 * hub/layout.tsx would create while sub-pages still render their own). A2 will
 * lift this verbatim into hub/layout.tsx and strip the sub-page headers, so the
 * whole hub shares one shell. Menu items without an href render as disabled
 * "coming soon" rows (reservations/payments/messages have no page yet).
 */
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  Home, CalendarCheck, Ship, Car, FileCheck, ShieldCheck,
  Users, CreditCard, MessageSquare, UserCircle, LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface NavItem {
  key: string
  icon: LucideIcon
  /** undefined → disabled "coming soon" row (no page yet). */
  href?: string
}

const NAV: NavItem[] = [
  { key: 'home',         icon: Home,          href: '/hub' },
  { key: 'reservations', icon: CalendarCheck /* A1: page yok → coming soon */ },
  { key: 'ferry',        icon: Ship,          href: '/hub/ferry' },
  { key: 'car_rental',   icon: Car,           href: '/hub/car-rental' },
  { key: 'visa',         icon: FileCheck,     href: '/hub/visa' },
  { key: 'insurance',    icon: ShieldCheck,   href: '/hub/insurance' },
  { key: 'companions',   icon: Users,         href: '/hub/companions' },
  { key: 'payments',     icon: CreditCard /* coming soon */ },
  { key: 'messages',     icon: MessageSquare /* coming soon */ },
  { key: 'profile',      icon: UserCircle,    href: '/hub/profile' },
]

const ROW = 'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors'

export function HubSidebar() {
  const t = useTranslations('hub.sidebar')
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) =>
    href === '/hub' ? pathname === '/hub' : pathname === href || pathname.startsWith(`${href}/`)

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        <ul className="space-y-1">
          {NAV.map(({ key, icon: Icon, href }) => {
            if (!href) {
              return (
                <li key={key}>
                  <span className={`${ROW} cursor-not-allowed text-slate-400`}>
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{t(key)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                      {t('comingSoon')}
                    </span>
                  </span>
                </li>
              )
            }
            const active = isActive(href)
            return (
              <li key={key}>
                <Link
                  href={href}
                  className={active ? `${ROW} bg-blue-50 text-blue-700` : `${ROW} text-slate-600 hover:bg-slate-50 hover:text-slate-900`}
                >
                  <Icon className={active ? 'h-5 w-5 text-blue-600' : 'h-5 w-5 text-slate-400'} />
                  {t(key)}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="my-2 border-t border-slate-100" />
        <button
          type="button"
          onClick={handleSignOut}
          className={`${ROW} w-full text-slate-600 hover:bg-red-50 hover:text-red-600`}
        >
          <LogOut className="h-5 w-5 text-slate-400" />
          {t('logout')}
        </button>
      </nav>
    </aside>
  )
}
