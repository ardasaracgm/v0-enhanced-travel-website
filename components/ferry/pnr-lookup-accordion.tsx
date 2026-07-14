'use client'

import * as React from 'react'
import { useRouter } from '@/i18n/routing'
import { ChevronDown, Loader2, Search, TicketCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { lookupPnr } from '@/lib/actions/lookup-pnr'

/**
 * 🎫 PnrLookupAccordion — misafir (auth'suz) "biletimi bul" çubuğu.
 * ---------------------------------------------------------------------------
 * Ana sayfa Feribot arama formunun ALTINA açılır-kapanır çubuk olarak gömülür
 * (K1b). Login OLMAYAN müşteri reference (TB-YY-XXXXXX) + soyad girer; başarılı
 * eşleşmede K1 public bilet sayfasına (/ticket/[token]) yönlendirir. Hub YOK.
 *
 * Tüm iş mantığı server action'da (lib/actions/lookup-pnr.ts): rate-limit,
 * iptal/ferry/soyad gate, enumeration engeli. Burası SALT UI — client'a yalnız
 * token döner, hata mesajı generic ('not_found' → aynı metin, alan sızdırmaz).
 */
export function PnrLookupAccordion({ className }: { className?: string }) {
  const t = useTranslations('pnrLookup')
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
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
    <Collapsible open={open} onOpenChange={setOpen} className={cn('border-t border-border/60', className)}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-1 py-3 text-left text-sm font-medium text-foreground transition-colors hover:text-primary">
        <span className="flex items-center gap-2">
          <TicketCheck className="h-4 w-4 shrink-0 text-primary" />
          {t('trigger')}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-1 pb-4 pt-1 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="pnr-reference" className="text-xs font-medium text-muted-foreground">
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
          <div className="flex-1 space-y-1.5">
            <label htmlFor="pnr-lastname" className="text-xs font-medium text-muted-foreground">
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
          <p className="px-1 pb-3 text-sm text-destructive" role="alert">
            {t(status === 'rate_limited' ? 'rateLimited' : 'notFound')}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
