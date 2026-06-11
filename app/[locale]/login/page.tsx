'use client'

/**
 * Magic-link login sayfası (Hub/admin giriş ucu).
 * ===============================================
 * confirmation/page.tsx'teki HubAccessCard signInWithOtp akışının uyarlaması.
 * ?next= ile geri dönüş yolu taşınır; callback'teki SAFE_NEXT (/^\/(en|tr|el)\//)
 * open-redirect guard'ı zaten uyguladığı için ham next yeterli.
 *
 * useSearchParams() App Router'da bir Suspense sınırı ister (yoksa build kırılır),
 * bu yüzden form bir iç bileşende; sayfa onu <Suspense> ile sarar.
 */
import * as React from 'react'
import { Suspense } from 'react'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function LoginCard() {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState('')
  const [status, setStatus] =
    React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSend = async () => {
    if (!email || status === 'sending') return
    setStatus('sending')
    const next = searchParams.get('next') ?? `/${locale}/hub`
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <Card className="w-full max-w-md border-primary/30">
      <CardContent className="p-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Get a one-tap link to sign in — no password.
        </p>

        {status === 'sent' ? (
          <p className="text-sm font-medium text-green-700">
            Magic link sent to {email}. Check your inbox.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1"
            />
            <Button type="button" onClick={handleSend} disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </Button>
          </div>
        )}
        {status === 'error' && (
          <p className="text-sm text-destructive mt-2">
            Something went wrong. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </main>
  )
}
