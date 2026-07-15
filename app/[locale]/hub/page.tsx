import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import {
  Ship, Car, FileCheck, ShieldCheck, UserCircle, Lock,
  ArrowRight, CalendarClock, Headphones, MapPin, BadgeCheck,
  Clock, Users, ChevronRight, Luggage, Bus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { buildWhatsAppLink } from '@/lib/contact'
import { titleCaseTr } from '@/lib/text/title-case'
import { getDashboardData } from '@/lib/hub/get-dashboard-data'
import type { HubDashboardCard, HubDashboardRowType } from '@/lib/hub/get-dashboard-data'

export const dynamic = 'force-dynamic'

// The Hub shell (Header + sidebar + Footer) lives in hub/layout.tsx (A2). This
// page returns only the content that goes inside the shell's <main>. Guests are
// redirected to /login (auth_failed feedback is shown there, not here).

// Tek renk/ikon tablosu: özet kartları da yaklaşan-rezervasyon satırları da bundan besleniyor.
const TYPE_TONE: Record<HubDashboardRowType, { icon: LucideIcon; tint: string; ink: string }> = {
  ferry:      { icon: Ship,        tint: 'bg-blue-100',    ink: 'text-blue-600' },
  car_rental: { icon: Car,         tint: 'bg-emerald-100', ink: 'text-emerald-600' },
  visa:       { icon: FileCheck,   tint: 'bg-orange-100',  ink: 'text-orange-600' },
  insurance:  { icon: ShieldCheck, tint: 'bg-violet-100',  ink: 'text-violet-600' },
  transfer:   { icon: Bus,         tint: 'bg-sky-100',     ink: 'text-sky-600' },
  luggage:    { icon: Luggage,     tint: 'bg-amber-100',   ink: 'text-amber-600' },
}

const SUMMARY: Array<{ key: HubDashboardCard; href: string }> = [
  { key: 'ferry',      href: '/hub/ferry' },
  { key: 'car_rental', href: '/hub/car-rental' },
  { key: 'visa',       href: '/hub/visa' },
  { key: 'insurance',  href: '/hub/insurance' },
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
  const th = await getTranslations('hub') // tabs.* + reservationState.* zaten üç dilde var

  // Own-row + admin bayrağı tek turda (paralel): ekstra sıralı roundtrip yok.
  // is_admin profiles'ta (bkz. require-admin.ts); travel_companions'a eklenemez.
  const [{ data: self }, { data: profile }] = await Promise.all([
    supabase
      .from('travel_companions')
      .select('first_name, last_name')
      .eq('owner_id', user.id)
      .eq('is_self', true)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle(),
  ])
  // full + cars_only her ikisi de görür (admin layout gate'iyle aynı); müşteri görmez.
  const isAdmin = profile?.is_admin === true

  const email = user.email ?? ''
  const data = await getDashboardData(email)

  const intl = locale === 'el' ? 'el-GR' : locale === 'tr' ? 'tr-TR' : 'en-GB'
  // "YYYY-MM-DD" zaten yerel takvim günü (getDashboardData zonedDate ile çözdü);
  // öğlen-UTC ile kurup formatlamak sunucu TZ'inin günü kaydırmasını engeller.
  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(intl, {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(intl, { style: 'currency', currency }).format(amount)

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
              {SUMMARY.map(({ key, href }) => {
                const { icon: Icon, tint, ink } = TYPE_TONE[key]
                return (
                  <div key={key} className="rounded-2xl border border-slate-100 p-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full ${tint}`}>
                      <Icon className={`h-5 w-5 ${ink}`} />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-blue-950">{data.counts[key]}</p>
                    <p className="text-xs text-slate-500">{t(`cards.${key}`)}</p>
                    <Link
                      href={href}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {t('view')} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Yaklaşan Rezervasyonlar */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-blue-950">{t('upcomingTitle')}</h2>
            {data.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <CalendarClock className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-3 max-w-sm text-sm text-slate-500">
                  {data.hasPast ? t('upcomingEmptyPast') : t('upcomingEmpty')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                {data.rows.map((r) => {
                  const { icon: Icon, tint, ink } = TYPE_TONE[r.type]
                  // Vize ödemesinin tamamlanacağı bir sayfa yok (/hub/visa/[id] yalnız durum
                  // gösterir); trip sayfasında ise WhatsApp ödeme butonu var → CTA orada değişir.
                  const payable = r.state === 'pending_payment' && r.type !== 'visa'
                  const title =
                    r.type === 'ferry' ? titleCaseTr(r.title)
                    : r.type === 'visa' ? t('rows.visaTitle')
                    : r.type === 'insurance' ? t('rows.insuranceTitle')
                    : r.title
                  return (
                    <Link
                      key={r.key}
                      href={r.href}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tint}`}>
                        <Icon className={`h-5 w-5 ${ink}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {th(`tabs.${r.type}`)}
                        </span>
                        <p className="truncate font-semibold text-blue-950">{title}</p>
                        {/* Başvuru sahibinin adı: pasaporttaki gibi, olduğu gibi (bkz. title-case.ts). */}
                        {r.type === 'visa' && (
                          <p className="truncate text-xs text-slate-500">{r.title}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {r.endDate ? `${fmtDay(r.startDate)} – ${fmtDay(r.endDate)}` : fmtDay(r.startDate)}
                          </span>
                          {r.departureTime && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {r.departureTime}
                            </span>
                          )}
                          {r.passengerCount ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {t('rows.pax', { count: r.passengerCount })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="font-semibold text-blue-950">{money(r.priceAmount, r.priceCurrency)}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          r.state === 'pending_payment'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {th(`reservationState.${r.state}`)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                          payable ? 'border-amber-200 text-amber-700' : 'border-slate-200 text-blue-950'
                        }`}
                      >
                        {payable ? t('rows.payCta') : t(`rows.cta.${r.type}`)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  )
                })}
              </div>
            )}
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

          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-950 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {t('account.adminPanel')}
            </Link>
          )}

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
