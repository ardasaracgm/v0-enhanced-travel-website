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
    <section className="relative z-10 -mt-12 w-full">
      <div className="container px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl bg-white px-6 py-4 text-sm shadow-xl">
          {items.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-blue-950">
              <Icon className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
