import { BadgeCheck, Globe, Lock, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function Car2TrustBar() {
  const t = useTranslations('car2')
  const items = [
    { Icon: BadgeCheck, label: t('trustLicensed') },
    { Icon: Lock, label: t('trustSecure') },
    { Icon: Globe, label: t('trustSupport') },
    { Icon: ShieldCheck, label: t('trustInsurance') },
  ]
  return (
    <section className="w-full border-b border-border/50 bg-secondary/30 py-4">
      <div className="container flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 text-sm md:px-6">
        {items.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-foreground">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
