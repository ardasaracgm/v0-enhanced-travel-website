'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { useTransition } from 'react'
import { routing, type Locale } from '@/i18n/routing'

/**
 * Header language switcher.
 *
 * Uses flagcdn.com SVG flags (free CDN, MIT licensed) instead of
 * Unicode flag emojis. Reason: Windows Chrome/Edge do not render
 * regional indicator emoji pairs as flags — they fall back to letter
 * pairs (GB, TR, GR). SVG flags render identically on every platform.
 *
 * `<img>` is used instead of next/image because flagcdn isn't in
 * next.config.images.remotePatterns and we don't need optimization
 * for 20x15 px flag icons.
 */

const LOCALE_META: Record<
  Locale,
  { label: string; flagCode: string; short: string }
> = {
  en: { label: 'English',  flagCode: 'gb', short: 'EN' },
  tr: { label: 'Türkçe',   flagCode: 'tr', short: 'TR' },
  el: { label: 'Ελληνικά', flagCode: 'gr', short: 'EL' },
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
            <img
              src={`https://flagcdn.com/${meta.flagCode}.svg`}
              alt=""
              aria-hidden="true"
              width={20}
              height={15}
              className="rounded-sm shadow-sm h-[15px] w-[20px] object-cover"
              loading="lazy"
            />
            <span className="hidden sm:inline">{meta.short}</span>
          </button>
        )
      })}
    </div>
  )
}
