'use client'

import * as React from 'react'
import { Copy, Check, MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { buildPackageBoxAddressBlock } from '@/lib/package-box-address'
import { Button } from '@/components/ui/button'

// Hub trip-detail kutu adres kartı. Sunucu component'i clipboard tutamaz →
// bu küçük client ada. Kopyala deseni confirmation/page.tsx'ten (copied state +
// 2sn reset + ikon swap). Adres tek kaynaktan (buildPackageBoxAddressBlock);
// plainText kopyalanır (recipient+street+cityLine+Tel+Mob), directionsEl ayrı.
export function PackageBoxAddressCard({ boxNumber }: { boxNumber: string }) {
  const t = useTranslations('hub')
  const [copied, setCopied] = React.useState(false)
  const addr = buildPackageBoxAddressBlock(boxNumber)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(addr.plainText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard yoksa sessizce yut (confirmation deseni)
    }
  }

  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <MapPin className="h-4 w-4" />
        {t('tripDetail.pickupAddressHeading')}
      </h2>
      <div className="rounded-md border bg-muted/30 px-4 py-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">{addr.plainText}</pre>
        <p className="mt-2 text-xs text-muted-foreground">{addr.directionsEl}</p>
        {/* ⚠️ boxWarning metni mail T dict (booking-confirmation.ts) ile AYNI —
            biri değişirse İKİSİ güncellenir. JSON yorum tutamaz → Hub tarafı
            senkron notu burada (tüketici). */}
        <p className="mt-1 text-xs text-amber-600">{t('tripDetail.boxWarning')}</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t('tripDetail.copied') : t('tripDetail.copyAddress')}
        </Button>
      </div>
    </div>
  )
}
