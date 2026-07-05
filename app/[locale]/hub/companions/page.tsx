import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { Users, Trash2 } from 'lucide-react'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { todayAthensISO } from '@/lib/validation/dates'
import { NATIONALITIES, DEFAULT_NATIONALITY } from '@/lib/countries'
import { getMyCompanions, type CompanionStatus } from '@/lib/hub/get-my-companions'
import {
  addCompanionFormAction,
  deleteCompanionFormAction,
} from '@/lib/actions/companion-add'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<CompanionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  active: 'default',
  revoked: 'destructive',
}

// RAW local date "YYYY-MM-DD" → localized; noon-UTC so the date is TZ-stable.
const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB')

// 🔐 searchParams'tan email OKUNMAZ — owner YALNIZ oturumdan (RLS + IDOR engeli).
export default async function HubCompanionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ added?: string; deleted?: string; err?: string }>
}) {
  const { locale } = await params
  const { added, deleted, err } = await searchParams
  const t = await getTranslations('hub')
  const tNat = await getTranslations('passengerDetails') // shared nationality labels

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect({ href: '/hub', locale })
    return null
  }

  const companions = await getMyCompanions(supabase, user.id)
  const today = todayAthensISO() // birth-date max (no future); pre-1900 blocked below

  const banner = err
    ? {
        tone: 'err' as const,
        msg:
          err === 'duplicate'
            ? t('companionsPage.errDuplicate')
            : err === 'invalid'
              ? t('companionsPage.errInvalid')
              : t('companionsPage.errSave'),
      }
    : added
      ? { tone: 'ok' as const, msg: t('companionsPage.added') }
      : deleted
        ? { tone: 'ok' as const, msg: t('companionsPage.deleted') }
        : null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-8">
          <div className="container px-4 md:px-6 space-y-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                {t('companionsPage.back')}
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">
                {t('companionsPage.title')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('companionsPage.intro')}</p>
            </div>

            {banner && (
              <div
                className={
                  banner.tone === 'err'
                    ? 'rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
                    : 'rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700'
                }
              >
                {banner.msg}
              </div>
            )}

            <form
              action={addCompanionFormAction}
              className="space-y-4 rounded-lg border bg-background p-4 md:p-5"
            >
              <input type="hidden" name="locale" value={locale} />
              <h2 className="font-medium text-foreground">{t('companionsPage.addHeading')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.firstName')}</span>
                  <input name="firstName" required className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.lastName')}</span>
                  <input name="lastName" required className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.email')}</span>
                  <input name="contactEmail" type="email" required className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.birthDate')}</span>
                  <input name="birthDate" type="date" min="1900-01-01" max={today} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.gender')}</span>
                  <select name="gender" defaultValue="" className="h-9 w-full rounded-md border px-3">
                    <option value="">{t('companionsPage.genderUnspecified')}</option>
                    <option value="male">{t('companionsPage.genderMale')}</option>
                    <option value="female">{t('companionsPage.genderFemale')}</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.nationality')}</span>
                  <select name="nationality" defaultValue={DEFAULT_NATIONALITY} className="h-9 w-full rounded-md border px-3">
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{tNat(`nationalities.${n}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.passportCountry')}</span>
                  <select name="passportCountry" defaultValue="" className="h-9 w-full rounded-md border px-3">
                    <option value="">—</option>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{tNat(`nationalities.${n}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.passport')}</span>
                  <input name="passportNumber" maxLength={20} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.passportExpiry')}</span>
                  <input name="passportExpiry" type="date" min={today} className="h-9 w-full rounded-md border px-3" />
                </label>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                {t('companionsPage.addCta')}
              </button>
            </form>

            {companions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('companionsPage.empty')}</p>
            ) : (
              <div className="space-y-3">
                {companions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-foreground">
                        <Users className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="truncate">{c.name}</span>
                        <Badge variant={STATUS_VARIANT[c.status]}>
                          {t(`companionsPage.status.${c.status}`)}
                        </Badge>
                      </p>
                      {c.contactEmail && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{c.contactEmail}</p>
                      )}
                      {(c.passportMasked || c.birthDate) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[
                            c.passportMasked ? `${t('companionsPage.passport')}: ${c.passportMasked}` : null,
                            c.birthDate ? `${t('companionsPage.birthDate')}: ${fmtDate(c.birthDate)}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <form action={deleteCompanionFormAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        aria-label={t('companionsPage.delete')}
                        className="rounded-md border border-slate-300 p-2 text-slate-500 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
