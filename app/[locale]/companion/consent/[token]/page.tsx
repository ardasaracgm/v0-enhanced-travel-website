import { notFound } from 'next/navigation'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  approveConsentFormAction,
  revokeConsentFormAction,
} from '@/lib/actions/companion-consent'

import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'

// Per-token service-role read — never statically cached.
export const dynamic = 'force-dynamic'

const COPY = {
  tr: {
    title: 'Seyahat arkadaşı onayı',
    pendingBody: (o: string) =>
      `${o} sizi seyahat arkadaşı olarak ekledi. Yolcu bilgilerinizin onun rezervasyonlarında kullanılmasına onay veriyor musunuz?`,
    approve: 'Onaylıyorum',
    decline: 'Reddet',
    activeBody: 'Onayınız kayıtlı. Dilediğiniz zaman aşağıdan geri çekebilirsiniz.',
    revoke: 'Onayımı geri çek',
    revokedBody:
      'Onayınızı geri çektiniz. Bilgileriniz artık kullanılmayacak. İsterseniz yeniden onaylayabilirsiniz.',
    reapprove: 'Yeniden onayla',
  },
  en: {
    title: 'Travel companion consent',
    pendingBody: (o: string) =>
      `${o} added you as a travel companion. Do you consent to your passenger details being used on their bookings?`,
    approve: 'I consent',
    decline: 'Decline',
    activeBody: 'Your consent is on file. You can withdraw it any time below.',
    revoke: 'Withdraw my consent',
    revokedBody:
      'You have withdrawn your consent. Your details will no longer be used. You may re-consent below.',
    reapprove: 'Consent again',
  },
  el: {
    title: 'Συγκατάθεση συνταξιδιώτη',
    pendingBody: (o: string) =>
      `Ο/Η ${o} σας πρόσθεσε ως συνταξιδιώτη. Συναινείτε στη χρήση των στοιχείων σας στις κρατήσεις;`,
    approve: 'Συναινώ',
    decline: 'Απόρριψη',
    activeBody: 'Η συγκατάθεσή σας έχει καταχωρηθεί. Μπορείτε να την αποσύρετε παρακάτω.',
    revoke: 'Απόσυρση συγκατάθεσης',
    revokedBody:
      'Αποσύρατε τη συγκατάθεσή σας. Μπορείτε να συναινέσετε ξανά παρακάτω.',
    reapprove: 'Συναίνεση ξανά',
  },
} as const

export default async function CompanionConsentPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { locale, token } = await params
  const t = COPY[locale === 'tr' || locale === 'el' ? locale : 'en']

  const supabase = getSupabaseAdmin()
  const { data: companion, error } = await supabase
    .from('travel_companions')
    .select('first_name, last_name, status, owner_name')
    .eq('consent_token', token)
    .maybeSingle()

  // Unknown / malformed token → 404 (no existence leak).
  if (error || !companion) notFound()

  const ownerLabel = companion.owner_name || 'TravelBeez'
  const name = [companion.first_name, companion.last_name].filter(Boolean).join(' ')

  const ActionButton = ({
    action,
    label,
    tone,
  }: {
    action: (formData: FormData) => Promise<void>
    label: string
    tone: 'primary' | 'ghost'
  }) => (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className={
          tone === 'primary'
            ? 'rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white'
            : 'rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700'
        }
      >
        {label}
      </button>
    </form>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="container max-w-lg px-4 py-16 md:py-24">
          <h1 className="mb-2 text-2xl font-bold">{t.title}</h1>
          <p className="mb-6 text-sm text-slate-500">{name}</p>

          {companion.status === 'pending' && (
            <>
              <p className="mb-6 text-base leading-relaxed">{t.pendingBody(ownerLabel)}</p>
              <div className="flex gap-3">
                <ActionButton action={approveConsentFormAction} label={t.approve} tone="primary" />
                <ActionButton action={revokeConsentFormAction} label={t.decline} tone="ghost" />
              </div>
            </>
          )}

          {companion.status === 'active' && (
            <>
              <p className="mb-6 text-base leading-relaxed">{t.activeBody}</p>
              <ActionButton action={revokeConsentFormAction} label={t.revoke} tone="ghost" />
            </>
          )}

          {companion.status === 'revoked' && (
            <>
              <p className="mb-6 text-base leading-relaxed">{t.revokedBody}</p>
              <ActionButton action={approveConsentFormAction} label={t.reapprove} tone="primary" />
            </>
          )}
        </section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
