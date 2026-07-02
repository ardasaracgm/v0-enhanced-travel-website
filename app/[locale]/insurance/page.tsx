'use client'

import * as React from 'react'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { useSearchParams } from 'next/navigation'
import { InsuranceWizard, type InsurancePrefill } from './insurance-wizard'
import { INSURANCE_DATE_RE, MAX_TRAVELLERS } from '@/lib/validation/insurance'

// Ana sayfa hero "Sigorta" sekmesi /insurance?dateFrom=…&dateTo=…&travellers=…&
// coverage=… ile gelir. URL query → InsurancePrefill (yalnız GEÇERLİ alanlar).
// Boş/eksik param okunmaz. useSearchParams App Router'da Suspense sınırı ister
// (login/visa deseni) → sayfa gövdesi iç bileşende, Suspense ile sarılı.
function InsurancePageInner() {
  const searchParams = useSearchParams()
  const prefill = React.useMemo<InsurancePrefill | null>(() => {
    const dateFrom = searchParams.get('dateFrom') ?? ''
    const dateTo = searchParams.get('dateTo') ?? ''
    const travellers = Number(searchParams.get('travellers'))
    const coverage = Number(searchParams.get('coverage'))
    const p: InsurancePrefill = {}
    if (INSURANCE_DATE_RE.test(dateFrom)) p.dateFrom = dateFrom
    if (INSURANCE_DATE_RE.test(dateTo)) p.dateTo = dateTo
    if (Number.isInteger(travellers) && travellers >= 1 && travellers <= MAX_TRAVELLERS) p.travellers = travellers
    if (Number.isInteger(coverage) && coverage > 0) p.coverageId = coverage
    return Object.keys(p).length ? p : null
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <InsuranceWizard prefill={prefill} />
      </main>
      <Footer />
    </div>
  )
}

export default function InsurancePage() {
  return (
    <React.Suspense fallback={null}>
      <InsurancePageInner />
    </React.Suspense>
  )
}
