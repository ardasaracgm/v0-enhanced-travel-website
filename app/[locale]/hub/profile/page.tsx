import { Link, redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { todayAthensISO } from '@/lib/validation/dates'
import { NATIONALITIES, DEFAULT_NATIONALITY } from '@/lib/countries'
import { saveProfileFormAction } from '@/lib/actions/profile'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'

export const dynamic = 'force-dynamic'

const ERR_KEYS: Record<string, string> = {
  invalid: 'profilePage.errName',
  birthdate: 'companionsPage.errBirthdate',
  country: 'companionsPage.errCountry',
  passport_format: 'companionsPage.errPassportFormat',
  passport_expiry: 'companionsPage.errPassportExpiry',
}

export default async function HubProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ saved?: string; err?: string }>
}) {
  const { locale } = await params
  const { saved, err } = await searchParams
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

  const [{ data: self }, { data: profile }] = await Promise.all([
    supabase
      .from('travel_companions')
      .select('first_name, last_name, birth_date, gender, nationality, passport_number, passport_country, passport_expiry')
      .eq('owner_id', user.id)
      .eq('is_self', true)
      .maybeSingle(),
    supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle(),
  ])

  const s = (self ?? {}) as Record<string, string | null>
  const today = todayAthensISO()
  const banner = err
    ? { tone: 'err' as const, msg: t(ERR_KEYS[err] ?? 'companionsPage.errSave') }
    : saved
      ? { tone: 'ok' as const, msg: t('profilePage.saved') }
      : null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="w-full py-8">
          <div className="container max-w-2xl space-y-6 px-4 md:px-6">
            <div>
              <Link href="/hub" className="text-sm text-muted-foreground hover:underline">
                {t('profilePage.back')}
              </Link>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">{t('profilePage.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('profilePage.intro')}</p>
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

            <form action={saveProfileFormAction} className="space-y-4 rounded-lg border bg-background p-4 md:p-5">
              <input type="hidden" name="locale" value={locale} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.firstName')}</span>
                  <input name="firstName" required defaultValue={s.first_name ?? ''} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.lastName')}</span>
                  <input name="lastName" required defaultValue={s.last_name ?? ''} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.birthDate')}</span>
                  <input name="birthDate" type="date" min="1900-01-01" max={today} defaultValue={s.birth_date ?? ''} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.gender')}</span>
                  <select name="gender" defaultValue={s.gender ?? ''} className="h-9 w-full rounded-md border px-3">
                    <option value="">{t('companionsPage.genderUnspecified')}</option>
                    <option value="male">{t('companionsPage.genderMale')}</option>
                    <option value="female">{t('companionsPage.genderFemale')}</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.nationality')}</span>
                  <select name="nationality" defaultValue={s.nationality || DEFAULT_NATIONALITY} className="h-9 w-full rounded-md border px-3">
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{tNat(`nationalities.${n}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.passportCountry')}</span>
                  <select name="passportCountry" defaultValue={s.passport_country ?? ''} className="h-9 w-full rounded-md border px-3">
                    <option value="">—</option>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{tNat(`nationalities.${n}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.passport')}</span>
                  <input name="passportNumber" maxLength={20} defaultValue={s.passport_number ?? ''} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('companionsPage.passportExpiry')}</span>
                  <input name="passportExpiry" type="date" min={today} defaultValue={s.passport_expiry ?? ''} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('profilePage.phone')}</span>
                  <input name="phone" type="tel" defaultValue={(profile?.phone as string | null) ?? ''} className="h-9 w-full rounded-md border px-3" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">{t('profilePage.email')}</span>
                  <input value={user.email ?? ''} disabled className="h-9 w-full rounded-md border bg-muted px-3 text-muted-foreground" />
                </label>
              </div>
              <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
                {t('profilePage.saveCta')}
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
