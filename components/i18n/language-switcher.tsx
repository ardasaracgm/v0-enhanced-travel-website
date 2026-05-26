'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { useTransition } from 'react'
import { routing, type Locale } from '@/i18n/routing'

/**
 * Header language switcher.
 *
 * Three flag buttons. Active locale is visually highlighted.
 * Clicking swaps the URL prefix (e.g. /ferry → /tr/ferry) and sets
 * the NEXT_LOCALE cookie so the choice persists for next visit.
 */

const LOCALE_META: Record<
  Locale,
  { label: string; flag: string; short: string }
> = {
  en: { label: 'English', flag: '🇬🇧', short: 'EN' },
  tr: { label: 'Türkçe', flag: '🇹🇷', short: 'TR' },
  el: { label: 'Ελληνικά', flag: '🇬🇷', short: 'EL' },
}

export function LanguageSwitcher({
  variant = 'header',
}: {
  variant?: 'header' | 'compact'
}) {
  const t = useTranslations('common')
  const current = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const onSelect = (next: Locale) => {
    if (next === current) return
    startTransition(() => {
      router.replace(pathname, { locale: next, scroll: false })
    })
  }

  return (
    <div
      role="group"
      aria-label={t('languageSwitcher')}
      className={`inline-flex items-center gap-1 ${
        isPending ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {routing.locales.map((loc) => {
        const meta = LOCALE_META[loc]
        const active = loc === current
        return (
          <button
            key={loc}
            type="button"
            onClick={() => onSelect(loc)}
            aria-pressed={active}
            aria-label={meta.label}
            title={meta.label}
            className={[
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition',
              variant === 'header' ? 'h-8' : 'h-7',
              active
                ? 'bg-primary/10 text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            ].join(' ')}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {meta.flag}
            </span>
            <span className="hidden sm:inline">{meta.short}</span>
          </button>
        )
      })}
    </div>
  )
}
