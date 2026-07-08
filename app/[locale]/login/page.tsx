'use client'

/**
 * Magic-link login — split-screen (sol frosted form / sağ hero görsel).
 * signInWithOtp + ?email= preset + ?next= redirect + sending/sent/error KORUNDU.
 * Sıfır-scroll lg'de zorlanır; mobilde min-h-screen (küçük ekranda kırpma yok).
 * useSearchParams() → Suspense sınırı (form iç bileşende).
 */
import * as React from 'react'
import { Suspense } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Ship, Car, ShieldCheck, Stamp, Bus, AlertCircle, Info } from 'lucide-react'
import { createSupabaseBrowserClient, HUB_AUTH_ORIGIN } from '@/lib/supabase-browser'
import { Logo } from '@/components/islandbee/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/** Hizmet ikon şeridi — feribot / araç / sigorta / vize / transfer. Yazısız, koyu-soft. */
const SERVICE_ICONS = [Ship, Car, ShieldCheck, Stamp, Bus]

/** Google marka 'G' (self-contained SVG — dış asset yok). */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  )
}

function LoginCard() {
  const t = useTranslations('login')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState(searchParams.get('email') ?? '')
  const [status, setStatus] =
    React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Guest yönlendirme bağlamı: auth_failed (başarısız magic-link, callback'ten) →
  // hata banner; sade 'next' (ör. /hub'dan gelen misafir) → "devam için giriş" satırı.
  const authError = searchParams.get('error') === 'auth_failed'
  const hasNext = Boolean(searchParams.get('next'))

  // Magic-link ve Google OAuth aynı callback + next mantığını paylaşır.
  const buildRedirectTo = () => {
    const next = searchParams.get('next') ?? `/${locale}/hub`
    return `${HUB_AUTH_ORIGIN}/api/auth/callback?next=${encodeURIComponent(next)}`
  }

  const handleSend = async () => {
    if (!email || status === 'sending') return
    setStatus('sending')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildRedirectTo(),
      },
    })
    setStatus(error ? 'error' : 'sent')
  }

  const handleGoogle = async () => {
    if (status === 'sending') return
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildRedirectTo() },
    })
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl bg-card/48 backdrop-blur">
      <CardContent className="p-6 md:p-8 space-y-5">
        <Logo priority className="h-9 w-auto" />

        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-blue-950">
            <Sparkles className="h-3.5 w-3.5" />
            {t('heroBadge')}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-950">{t('heroTitle')}</h1>
          <p className="mt-1 text-sm text-blue-950/70">{t('heroSubtitle')}</p>
          <div className="mt-3 flex items-center gap-4">
            {SERVICE_ICONS.map((Icon, i) => (
              <Icon key={i} className="h-5 w-5 text-blue-950/40" />
            ))}
          </div>
        </div>

        {authError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{t('authError')}</span>
          </div>
        )}
        {!authError && hasNext && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{t('continueContext')}</span>
          </div>
        )}

        {status === 'sent' ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">{t('successTitle')}</p>
            <p className="text-sm text-green-700 mt-1">{t('successBody', { email })}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="h-11"
              />
              <Button
                type="button"
                onClick={handleSend}
                disabled={status === 'sending'}
                className="w-full h-11 gap-2 bg-blue-950 text-white hover:bg-blue-900"
              >
                <Mail className="h-4 w-4" />
                {status === 'sending' ? t('sendingButton') : t('submitButton')}
              </Button>
            </div>

            {/* Ayırıcı */}
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('orDivider')}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Google OAuth — signInWithOAuth (magic-link ile aynı callback) */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              className="w-full h-11 gap-2"
            >
              <GoogleIcon className="h-4 w-4" />
              {t('googleButton')}
            </Button>
          </>
        )}

        {status === 'error' && (
          <p className="text-sm text-destructive">{t('errorMessage')}</p>
        )}

        <p className="text-xs text-blue-950/60">{t('trust')}</p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:h-screen lg:overflow-hidden lg:grid-cols-2">
      {/* SOL: frosted form, dikey ortalı, yumuşak marka zemini */}
      <div className="relative flex items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-white to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Suspense fallback={null}>
            <LoginCard />
          </Suspense>
        </motion.div>
      </div>

      {/* SAĞ: hero görseli (yalnız lg+) */}
      <div className="relative hidden lg:block">
        <Image src="/login-hero.webp" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/30 to-transparent" />
      </div>
    </main>
  )
}
