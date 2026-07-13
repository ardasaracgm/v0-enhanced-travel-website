import { notFound } from 'next/navigation'

import { getPublicTicket } from '@/lib/ticket/get-public-ticket'
import { formatDay } from '@/lib/dates/display'
import { Header } from '@/components/islandbee/header'
import { Footer } from '@/components/islandbee/footer'
import { FloatingWhatsApp } from '@/components/islandbee/floating-whatsapp'

// Per-token service-role read — never statically cached.
export const dynamic = 'force-dynamic'

const COPY = {
  tr: { title: 'Feribot Bileti', reference: 'Rezervasyon', voucher: 'Voucher No', operator: 'Operatör', pnr: 'PNR', passengers: 'Yolcular', depart: 'Kalkış', arrive: 'Varış', note: 'Bu sayfa TravelBeez tarafından bilet doğrulama için sunulur.', fmt: 'tr-TR' },
  en: { title: 'Ferry Ticket', reference: 'Reference', voucher: 'Voucher No', operator: 'Operator', pnr: 'PNR', passengers: 'Passengers', depart: 'Departure', arrive: 'Arrival', note: 'This page is provided by TravelBeez for ticket verification.', fmt: 'en-GB' },
  // 🟢 EL — Dimitri native review bekliyor
  el: { title: 'Εισιτήριο πλοίου', reference: 'Κωδικός κράτησης', voucher: 'Αρ. Voucher', operator: 'Εταιρεία', pnr: 'PNR', passengers: 'Επιβάτες', depart: 'Αναχώρηση', arrive: 'Άφιξη', note: 'Η σελίδα παρέχεται από την TravelBeez για επαλήθευση εισιτηρίου.', fmt: 'el-GR' },
} as const

export default async function PublicTicketPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { locale, token } = await params
  const t = COPY[locale === 'tr' || locale === 'el' ? locale : 'en']

  const ticket = await getPublicTicket(token)
  if (!ticket) notFound() // bilinmeyen token / iptal / rezerve feribot yok → 404

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="container max-w-xl px-4 py-12 md:py-16">
          <div className="mb-6 flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <span className="text-sm text-slate-500">
              {t.reference}: <span className="font-mono font-semibold">{ticket.reference}</span>
            </span>
          </div>

          <div className="space-y-6">
            {ticket.reservations.map((r, ri) => (
              <div key={ri} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                {r.voucherNo && (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {t.voucher}: {r.voucherNo}
                  </p>
                )}
                <div className="space-y-4">
                  {r.legs.map((l, li) => (
                    <div key={li} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                      <p className="text-lg font-semibold">{l.route}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDay(l.date, t.fmt)}
                        {l.departureTime && <> · {t.depart} {l.departureTime}</>}
                        {l.arrivalTime && <> → {t.arrive} {l.arrivalTime}</>}
                      </p>
                      {(l.vessel || l.operator) && (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {[l.operator, l.vessel].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {l.passengers.length > 0 && (
                        <p className="mt-2 text-sm">
                          <span className="text-slate-500">{t.passengers}:</span>{' '}
                          {l.passengers.join(', ')}
                        </p>
                      )}
                      {l.pnrs.length > 0 && (
                        <p className="mt-0.5 text-sm font-mono text-slate-700">
                          {t.pnr}: {l.pnrs.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">{t.note}</p>
        </section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
