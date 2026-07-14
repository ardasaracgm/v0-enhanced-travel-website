'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react'
import { adminLogin, type AdminLoginState } from '@/lib/actions/admin-login'
import { Logo } from '@/components/islandbee/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Admin Ingilizce (i18n yok). Tum hata mesajlari generic — enumeration sizdirmaz.
const ERROR_TEXT: Record<NonNullable<AdminLoginState['error']>, string> = {
  invalid: 'Invalid email or password.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  missing: 'Enter your email and password.',
}

export function AdminLoginForm() {
  const locale = useLocale()
  const [state, formAction, pending] = useActionState<AdminLoginState, FormData>(
    adminLogin,
    {},
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="w-full max-w-md border-0 shadow-2xl bg-card/48 backdrop-blur">
        <CardContent className="p-6 md:p-8 space-y-5">
          <Logo priority className="h-9 w-auto" />

          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-950 px-3 py-1 text-xs font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
              Staff access
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-950">Admin sign-in</h1>
            <p className="mt-1 text-sm text-blue-950/70">
              Authorized staff only. Sign in with your work email and password.
            </p>
          </div>

          {state.error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{ERROR_TEXT[state.error]}</span>
            </div>
          )}

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <Input
              type="email"
              name="email"
              autoComplete="username"
              required
              placeholder="Email"
              className="h-11"
            />
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              className="h-11"
            />
            <Button
              type="submit"
              disabled={pending}
              className="w-full h-11 gap-2 bg-blue-950 text-white hover:bg-blue-900"
            >
              <Lock className="h-4 w-4" />
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-xs text-blue-950/60">
            Restricted area. Access attempts are logged.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
