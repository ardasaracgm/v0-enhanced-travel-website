import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import {
  Ship, Car, FileCheck, ShieldCheck, UserCircle, Lock,
  ArrowRight, CalendarClock, Headphones, MapPin, BadgeCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { buildWhatsAppLink } from '@/lib/contact'

export const dynamic = 'force-dynamic'

// The Hub shell (Header + sidebar + Footer) lives in hub/layout.tsx (A2). This
// page returns only the content that goes inside the shell's <main>. Guests are
// redirected to /login (auth_failed feedback is shown there, not here).

// ── Signed-in dashboard (A1: visual skeleton — counts/list wired in A3) ───────
interface SummaryCard {
  key: 'ferry' | 'car_rental' | 'visa' | 'insurance'
  icon: LucideIcon
  href: string
  tint: string
  ink: string
}

const SUMMARY: SummaryCard[] = [
  { key: 'ferry',      icon: Ship,        href: '/hub/ferry',      tint: 'bg-blue-100',    ink: 'text-blue-600' },
  { key: 'car_rental', icon: Car,         href: '/hub/car-rental', tint: 'bg-emerald-100', ink: 'text-emerald-600' },
  { key: 'visa',       icon: FileCheck,   href: '/hub/visa',       tint: 'bg-orange-100',  ink: 'text-orange-600' },
  { key: 'insurance',  icon: ShieldCheck, href: '/hub/insurance',  tint: 'bg-violet-100',  ink: 'text-violet-600' },
]

interface TrustBadge {
  key: 'securePayment' | 'support247' | 'kosOffice' | 'reliable'
  icon: LucideIcon
  tint: string
  ink: string
}

const TRUST: TrustBadge[] = [
  { key: 'securePayment', icon: Lock,       tint: 'bg-emerald-100', ink: 'text-emerald-600' },
  { key: 'support247',    icon: Headphones, tint: 'bg-violet-100',  ink: 'text-violet-600' },
  { key: 'kosOffice',     icon: MapPin,     tint: 'bg-blue-100',    ink: 'text-blue-600' },
  { key: 'reliable',      icon: BadgeCheck, tint: 'bg-emerald-100', ink: 'text-emerald-600' },
]

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth-gate: Hub app-benzeri dashboard → misafir login'e (next=/hub → dönüş).
  if (!user) {
    redirect({ href: `/login?next=${encodeURIComponent(`/${locale}/hub`)}`, locale })
    return null
  }

  const t = await getTranslations('hub.dashboard')

  const { data: self } = await supabase
    .from('travel_companions')
    .select('first_name, last_name')
    .eq('owner_id', user.id)
    .eq('is_self', true)
    .maybeSingle()

  const email = user.email ?? ''
  const fullName = [self?.first_name, self?.last_name].filter(Boolean).join(' ').trim()
  const displayName = fullName || email.split('@')[0] || 'Traveler'
  const initial = (displayName[0] ?? 'T').toUpperCase()
  const supportUrl = buildWhatsAppLink(locale)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-950 md:text-4xl">{t('title')}</h1>
            <p className="mt-1 text-slate-500">{t('subtitle')}</p>
            <p className="mt-4 text-lg font-semibold text-blue-950">
              {t('greeting', { name: displayName })} <span aria-hidden>👋</span>
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500">{t('greetingBody')}</p>
          </div>

          {/* 4 özet kart (STATİK — veri A3) */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-blue-950 md:text-base">{t('summaryTitle')}</h2>
              <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400">
                {t('viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {SUMMARY.map(({ key, icon: Icon, href, tint, ink }) => (
                <div key={key} className="rounded-2xl border border-slate-100 p-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${tint}`}>
                    <Icon className={`h-5 w-5 ${ink}`} />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-blue-950">—</p>
                  <p className="text-xs text-slate-500">{t(`cards.${key}`)}</p>
                  <Link
                    href={href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {t('view')} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Yaklaşan Rezervasyonlar (boş-durum — veri A3) */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-blue-950">{t('upcomingTitle')}</h2>
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <CalendarClock className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">{t('upcomingEmpty')}</p>
            </div>
          </div>
        </div>

        {/* Sağ rail */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-blue-950">{t('account.title')}</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-blue-950">{displayName}</p>
                <p className="truncate text-sm text-slate-500">{email}</p>
              </div>
            </div>
            <Link
              href="/hub/profile"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-950 transition-colors hover:bg-slate-50"
            >
              <UserCircle className="h-4 w-4" />
              {t('account.editProfile')}
            </Link>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6">
            <h2 className="text-base font-semibold text-blue-950">{t('support.title')}</h2>
            <p className="mt-2 text-sm text-slate-600">{t('support.body')}</p>
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Headphones className="h-4 w-4" />
              {t('support.cta')}
            </a>
          </div>
        </aside>
      </div>

      {/* Güven rozetleri */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ key, icon: Icon, tint, ink }) => (
            <div key={key} className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tint}`}>
                <Icon className={`h-5 w-5 ${ink}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-950">{t(`trust.${key}.title`)}</h3>
                <p className="text-xs text-slate-500">{t(`trust.${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
