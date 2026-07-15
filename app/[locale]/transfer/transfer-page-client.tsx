'use client'

import * as React from 'react'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { useSearchParams } from 'next/navigation'
import { TransferWizard, type TransferPrefill } from './transfer-wizard'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const REGION_IDS = Object.keys(TRANSFER_REGIONS) as (keyof typeof TRANSFER_REGIONS)[]

// Ana sayfa hero "Bodrum Transfer" sekmesi /transfer?routeId=…&vehicleId=…&
// outboundDate=…&returnDate=… ile gelir. URL query → TransferPrefill (yalnız
// GEÇERLİ alanlar: routeId/vehicleId sabit bodrum kataloğunda VAR mı + tarih
// regex). useSearchParams → Suspense sınırı (Sigorta/login deseni).
function TransferPageInner() {
  const searchParams = useSearchParams()
  const prefill = React.useMemo<TransferPrefill | null>(() => {
    const region = TRANSFER_REGIONS[REGION_IDS[0]]
    const routeId = searchParams.get('routeId') ?? ''
    const vehicleId = searchParams.get('vehicleId') ?? ''
    const outboundDate = searchParams.get('outboundDate') ?? ''
    const returnDate = searchParams.get('returnDate') ?? ''
    const p: TransferPrefill = {}
    if (region.routes.some((r) => r.id === routeId)) p.routeId = routeId
    if (region.vehicles.some((v) => v.id === vehicleId)) p.vehicleId = vehicleId
    if (DATE_RE.test(outboundDate)) p.outboundDate = outboundDate
    if (DATE_RE.test(returnDate)) p.returnDate = returnDate
    return Object.keys(p).length ? p : null
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <TransferWizard prefill={prefill} />
      </main>
      <Footer />
    </div>
  )
}

export default function TransferPageClient() {
  return (
    <React.Suspense fallback={null}>
      <TransferPageInner />
    </React.Suspense>
  )
}
