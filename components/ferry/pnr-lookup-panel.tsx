'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/routing'
import { Loader2, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { lookupPnr } from '@/lib/actions/lookup-pnr'

/**
 * 🎫 PnrLookupPanel — misafir (auth'suz) "biletimi bul" formu.
 * ---------------------------------------------------------------------------
 * FerrySearchForm'un Blok B slot'unda, feribot arama grid'iyle AYNI alanı
 * paylaşır: mode==='pnr' iken grid'in yerine bu panel render edilir (eski
 * alt-accordion kaldırıldı, K1b). Login OLMAYAN müşteri reference (TB-YY-XXXXXX)
 * + soyad girer; başarılı eşleşmede K1 public bilet sayfasına (/ticket/[token])
 * yönlendirir. Hub YOK.
 *
 * Tüm iş mantığı server action'da (lib/actions/lookup-pnr.ts): rate-limit,
 * iptal/ferry/soyad gate, enumeration engeli. Burası SALT UI — client'a yalnız
 * token döner, hata mesajı generic ('not_found' → aynı metin, alan sızdırmaz).
 *
 * Masaüstünde sm:flex-row ile tek satır (Reference|Soyad|buton, hepsi h-10) →
 * feribot grid'inin tek field-satırı yüksekliğiyle eşleşir, kutu büyümez.
 */
export function PnrLookupPanel() {
  const t = useTranslations('pnrLookup')
  const router = useRouter()
  const [reference, setReference] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'not_found' | 'rate_limited'>('idle')

  const canSubmit = reference.trim().length > 0 && lastName.trim().length > 0 && status !== 'loading'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('loading')
    const res = await lookupPnr({ reference, lastName })
    if (res.ok) {
      // Başarı → public bilet sayfası. router (i18n/routing) locale prefix ekler.
      router.push(`/ticket/${res.token}`)
      return // loading kalsın (navigasyon sürerken buton disabled)
    }
    setStatus(res.error) // 'not_found' | 'rate_limited'
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label htmlFor="pnr-reference" className="text-sm font-medium text-foreground">
            {t('referenceLabel')}
          </label>
          <Input
            id="pnr-reference"
            value={reference}
            onChange={(e) => { setReference(e.target.value); if (status !== 'idle') setStatus('idle') }}
            placeholder={t('referencePlaceholder')}
            autoComplete="off"
            className="h-10 uppercase placeholder:normal-case"
          />
        </div>
        <div className="flex-1 space-y-2">
          <label htmlFor="pnr-lastname" className="text-sm font-medium text-foreground">
            {t('lastNameLabel')}
          </label>
          <Input
            id="pnr-lastname"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); if (status !== 'idle') setStatus('idle') }}
            placeholder={t('lastNamePlaceholder')}
            autoComplete="off"
            className="h-10"
          />
        </div>
        <Button type="submit" disabled={!canSubmit} className="h-10 shrink-0 sm:w-auto">
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2">{t('submit')}</span>
        </Button>
      </form>
      {/* Generic hata — hangi alanın yanlış olduğu SIZDIRILMAZ (enumeration engeli). */}
      {(status === 'not_found' || status === 'rate_limited') && (
        <p className="pt-2 text-sm text-destructive" role="alert">
          {t(status === 'rate_limited' ? 'rateLimited' : 'notFound')}
        </p>
      )}
    </div>
  )
}
