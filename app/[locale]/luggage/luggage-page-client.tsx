'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { LuggageClient, type LuggagePrefill } from './luggage-client'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Anasayfa valiz teaser'ı /luggage?dropOffDate=…&pickupDate=… ile gelebilir.
// URL query → LuggagePrefill (yalnız YYYY-MM-DD regex geçen alanlar). Geçmiş-tarih
// guard LuggageClient'ta (todayAthensISO altı yok sayılır). useSearchParams →
// Suspense sınırı (transfer/insurance deseni).
function LuggagePageInner() {
  const searchParams = useSearchParams()
  const prefill = React.useMemo<LuggagePrefill | null>(() => {
    const dropOffDate = searchParams.get('dropOffDate') ?? ''
    const pickupDate = searchParams.get('pickupDate') ?? ''
    const p: LuggagePrefill = {}
    if (DATE_RE.test(dropOffDate)) p.dropOffDate = dropOffDate
    if (DATE_RE.test(pickupDate)) p.pickupDate = pickupDate
    return Object.keys(p).length ? p : null
  }, [searchParams])

  return <LuggageClient prefill={prefill} />
}

export default function LuggagePageClient() {
  return (
    <React.Suspense fallback={null}>
      <LuggagePageInner />
    </React.Suspense>
  )
}
