'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/routing'
import { useConsent } from '@/lib/consent-context'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Cookie consent banner — fixed bottom bar + settings dialog.
 * Renders nothing once the visitor has decided.
 */
export function CookieBanner() {
  const t = useTranslations('cookieConsent')
  const { state, isHydrated, acceptAll, rejectAll, savePreferences } = useConsent()

  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [analytics, setAnalytics] = React.useState(false)
  const [marketing, setMarketing] = React.useState(false)

  // Seed the switches from current state each time the dialog opens.
  const openSettings = () => {
    setAnalytics(state.analytics)
    setMarketing(state.marketing)
    setSettingsOpen(true)
  }

  const handleSave = () => {
    savePreferences({ analytics, marketing })
    setSettingsOpen(false)
  }

  // Server render and first paint have no localStorage — rendering the bar
  // before hydration would flash it at visitors who already decided.
  if (!isHydrated || state.decided) return null

  return (
    <>
      <div
        role="region"
        aria-label={t('title')}
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="container flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-6">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{t('title')}</p>
            <p className="text-sm text-muted-foreground">
              {t('description')}{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                {t('privacyLink')}
              </Link>
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="ghost" size="sm" onClick={openSettings}>
              {t('settings')}
            </Button>
            <Button variant="outline" size="sm" onClick={rejectAll}>
              {t('reject')}
            </Button>
            <Button size="sm" onClick={acceptAll}>
              {t('acceptAll')}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <ConsentRow
              id="consent-necessary"
              label={t('necessaryLabel')}
              description={t('necessaryDesc')}
              checked
              disabled
            />
            <ConsentRow
              id="consent-analytics"
              label={t('analyticsLabel')}
              description={t('analyticsDesc')}
              checked={analytics}
              onCheckedChange={setAnalytics}
            />
            <ConsentRow
              id="consent-marketing"
              label={t('marketingLabel')}
              description={t('marketingDesc')}
              checked={marketing}
              onCheckedChange={setMarketing}
            />
          </div>

          <DialogFooter>
            <Button onClick={handleSave}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ConsentRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}
