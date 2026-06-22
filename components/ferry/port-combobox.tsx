'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { CatalogPort } from '@/lib/actions/ferry-catalog'
import type { PortCountry } from '@/lib/ferry/ports'

interface PortComboboxProps {
  ports: CatalogPort[]
  value: string
  /** Birebir setFrom/setTo/setReturnTo sözleşmesi — value=slug (string). */
  onChange: (slug: string) => void
  placeholder: string
  portLabel: (p: CatalogPort) => string
  /** İlk açılışta AÇIK gelen ülke grubu (kalkış→TR, varış→GR). */
  defaultOpenCountry: PortCountry
  countryLabels: Record<PortCountry, string>
  disabled?: boolean
}

/**
 * Country-accordion port seçici. Native Radix Select collapsible grupları temiz
 * desteklemediği için (tek listbox/roving-focus) Popover + Collapsible ile kuruldu.
 * Sözleşme Select ile birebir: value=slug, onChange(slug) → form state'i ve bağımlı
 * effect'ler (from→arrivals refetch) DEĞİŞMEZ. Money-path/searchParams DIŞI.
 */
export function PortCombobox({
  ports, value, onChange, placeholder, portLabel,
  defaultOpenCountry, countryLabels, disabled,
}: PortComboboxProps) {
  const [open, setOpen] = React.useState(false)
  // Hangi ülke grubu açık — per-component state (global değil). Dinamik: seçim
  // yapılınca seçilen limanın ülkesine güncellenir.
  const [openCountry, setOpenCountry] = React.useState<PortCountry>(defaultOpenCountry)

  const selected = ports.find((p) => p.slug === value)
  // Default açık ülke önce listelenir (TR→GR veya GR→TR).
  const countries: PortCountry[] = defaultOpenCountry === 'TR' ? ['TR', 'GR'] : ['GR', 'TR']

  const handleSelect = (slug: string, country: PortCountry) => {
    onChange(slug)            // birebir setFrom(slug)
    setOpenCountry(country)   // dinamik: seçili limanın ülkesi açık kalır
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className="line-clamp-1">{selected ? portLabel(selected) : placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
        {countries.map((c) => {
          const group = ports.filter((p) => p.country === c)
          if (group.length === 0) return null
          const isOpen = openCountry === c
          return (
            <Collapsible key={c} open={isOpen} onOpenChange={(o) => { if (o) setOpenCountry(c) }}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm font-semibold hover:bg-accent focus:bg-accent focus:outline-none">
                {countryLabels[c]}
                <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                {group.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => handleSelect(p.slug, c)}
                    className={cn(
                      'flex w-full items-center rounded-sm px-2 py-1.5 pl-4 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none',
                      p.slug === value && 'font-medium text-primary',
                    )}
                  >
                    {portLabel(p)}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
