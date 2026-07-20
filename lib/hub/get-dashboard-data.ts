import 'server-only'

import { zonedDate } from '@/lib/ferry/timezone'
import { getMyFerryReservations } from '@/lib/hub/get-my-ferry-reservations'
import { getMyReservations } from '@/lib/hub/get-my-reservations'
import { getMyVisaApplications } from '@/lib/hub/get-my-visa-applications'
import type { TripState } from '@/lib/supabase'

// trip_items.scheduled_at is timestamptz → PostgREST returns UTC, so `.slice(0,10)`
// is NOT the local date: resolvers bake the local day in at +03:00 (resolvers.ts:104,132
// + atMidnight), which lands on 21:00Z the PREVIOUS day. zonedDate() recovers the day
// the customer actually booked. Probed: transfer/luggage/insurance drift, ferry/car don't.
const TZ = 'Europe/Istanbul'

// Sayaç kutusunun başlığı "Satın Alınmış Ama Henüz Gerçekleşmemiş Hizmetleriniz" →
// ödenmemiş rezervasyon satın alınmamıştır, sayaca girmez.
const OWNED_STATES: TripState[] = ['confirmed', 'in_progress']
// Liste "Yaklaşan Rezervasyonlar" → pending_payment de görünür (amber: ödemeni tamamla).
const LISTED_STATES: TripState[] = [...OWNED_STATES, 'pending_payment']
// "Geçmişin var ama geleceğin yok" boş-durumu; iptal/başarısız/taslak geçmiş sayılmaz.
const PAST_STATES: TripState[] = [...OWNED_STATES, 'completed']

export type HubDashboardCard = 'ferry' | 'car_rental' | 'visa' | 'insurance'
export type HubDashboardRowType = HubDashboardCard | 'transfer' | 'luggage' | 'package_pickup'

export interface HubDashboardRow {
  key: string
  type: HubDashboardRowType
  title: string
  startDate: string             // yerel takvim günü "YYYY-MM-DD"
  endDate: string | null        // yalnız gerçek bir aralıksa (start'tan büyükse)
  departureTime: string | null  // yalnız ferry — sağlayıcının ham duvar-saati, instant DEĞİL
  passengerCount: number | null // yalnız ferry + insurance (bkz. HubReservationItem yorumu)
  priceAmount: number
  priceCurrency: string
  state: TripState
  href: string
}

export interface HubDashboardData {
  counts: Record<HubDashboardCard, number>
  rows: HubDashboardRow[]       // yaklaşan, tarihe göre artan
  hasPast: boolean
}

const empty = (): HubDashboardData => ({
  counts: { ferry: 0, car_rental: 0, visa: 0, insurance: 0 },
  rows: [],
  hasPast: false,
})

// Lexicographic on "YYYY-MM-DD" == chronological.
const isUpcoming = (r: HubDashboardRow, today: string) => (r.endDate ?? r.startDate) >= today
const sortKey = (r: HubDashboardRow) => `${r.startDate}T${r.departureTime ?? '00:00'}`

/**
 * 🔐 getDashboardData — Hub ana sayfasının sayaçları + yaklaşan rezervasyon listesi.
 *
 * GÜVENLİK SÖZLEŞMESİ: `email` YALNIZCA doğrulanmış oturumdan gelir. Üç kaynağın
 * her biri kendi email kapısını uygular; burada ek bir sorgu YOK.
 *
 * 🔐 Bu fonksiyon DAR bir DTO döner: metadata / vouchers / pnr / passengerName
 * yapısal olarak dışarıda kalır — dashboard bir client component'e beslenir.
 *
 * ÇİFT-SAYIM: `ferry` grup/rota/ham-saat için getMyFerryReservations'tan (round-trip
 * TEK satır), `visa` ise visa_applications'tan gelir. İkisi de getMyReservations
 * toplamasından dışlanır. getMyInsurancePolicies KASITLI çağrılmaz — o da aynı
 * trip_items'ı okur (sigorta buradan gelir; poliçe PDF'i /hub/insurance'ın işi).
 */
export async function getDashboardData(email: string): Promise<HubDashboardData> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return empty() // boş email → ASLA geniş sorgu

  const [ferries, reservations, visas] = await Promise.all([
    getMyFerryReservations(normalized),
    getMyReservations(normalized),
    getMyVisaApplications(normalized),
  ])

  const today = zonedDate(new Date().toISOString(), TZ)
  const tripById = new Map(reservations.map((r) => [r.id, r]))
  const candidates: HubDashboardRow[] = []

  // ── Feribot: gidiş-dönüş TEK satır (Dentur voucher'ı gibi gruplanmış) ────────
  // date/departureTime ham gelir: instant'ı formatlamak Yunan limanlarında saati
  // kaydırırdı (get-my-ferry-reservations.ts'in "NEVER the instant" uyarısı).
  for (const [i, f] of ferries.entries()) {
    if (!LISTED_STATES.includes(f.tripState) && !PAST_STATES.includes(f.tripState)) continue
    const dates = f.legs.map((l) => l.date).filter((d): d is string => !!d)
    if (dates.length === 0) continue
    const startDate = dates[0]
    const last = dates[dates.length - 1]
    candidates.push({
      key: `ferry:${f.tripId}:${i}`,
      type: 'ferry',
      title: f.legs.map((l) => l.route).join(' · '),
      startDate,
      endDate: last > startDate ? last : null,
      departureTime: f.legs[0]?.departureTime ?? null,
      passengerCount: ferryPax(tripById.get(f.tripId)),
      priceAmount: f.priceAmount,
      priceCurrency: f.priceCurrency,
      state: f.tripState,
      href: `/hub/trip/${f.tripId}`,
    })
  }

  // ── Diğer kalemler: (trip × tip) gruplanır (çok parçalı bagaj → TEK satır) ───
  const groups = new Map<string, HubDashboardRow>()
  for (const r of reservations) {
    if (!LISTED_STATES.includes(r.state) && !PAST_STATES.includes(r.state)) continue
    for (const it of r.items) {
      // ferry + visa BAŞKA kaynaktan gelir — burada saymak çift-sayım olurdu.
      if (it.type === 'ferry' || it.type === 'visa') continue
      if (!isRowType(it.type)) continue
      if (!it.scheduledAt) continue // tarihsiz kalem "yaklaşan" olduğunu iddia edemez

      const start = zonedDate(it.scheduledAt, TZ)
      const end = it.endsAt ? zonedDate(it.endsAt, TZ) : start
      const k = `${r.id}:${it.type}`
      const prev = groups.get(k)
      if (!prev) {
        groups.set(k, {
          key: k,
          type: it.type,
          title: it.title,
          startDate: start,
          endDate: end > start ? end : null,
          departureTime: null,
          passengerCount: it.type === 'insurance' ? it.passengerCount : null,
          priceAmount: it.priceAmount,
          priceCurrency: it.priceCurrency,
          state: r.state,
          href: `/hub/trip/${r.id}`,
        })
      } else {
        const s = start < prev.startDate ? start : prev.startDate
        const e = [prev.endDate ?? prev.startDate, end].sort()[1]
        prev.startDate = s
        prev.endDate = e > s ? e : null
        prev.priceAmount += it.priceAmount
      }
    }
  }
  candidates.push(...groups.values())

  // ── Vize: ayrı tablo, kişi-başı bir satır (kişi sayısı kolonu YOK) ──────────
  // Ödeme durumu bağlı trip'ten okunur (state string'inden tahmin edilmez).
  // trip_item'ın `visa` satırına YALNIZ fiyat için bakılır, asla sayım için.
  for (const v of visas) {
    if (!v.tripId || !v.schengenEntryDate) continue // draft: trip yok, tarih yok
    const trip = tripById.get(v.tripId)
    if (!trip) continue
    if (!LISTED_STATES.includes(trip.state) && !PAST_STATES.includes(trip.state)) continue
    const item = trip.items.find((i) => i.type === 'visa')
    const exit = v.schengenExitDate
    candidates.push({
      key: `visa:${v.id}`,
      type: 'visa',
      title: `${v.firstName} ${v.lastName}`.trim(),
      startDate: v.schengenEntryDate,
      endDate: exit && exit > v.schengenEntryDate ? exit : null,
      departureTime: null,
      passengerCount: null, // 1 başvuru = 1 kişi; şemada sayı yok
      priceAmount: item?.priceAmount ?? 0,
      priceCurrency: item?.priceCurrency ?? trip.currency,
      state: trip.state,
      href: `/hub/visa/${v.id}`,
    })
  }

  const upcoming = candidates.filter((c) => isUpcoming(c, today))

  const counts = empty().counts
  for (const c of upcoming) {
    if (isCard(c.type) && OWNED_STATES.includes(c.state)) counts[c.type] += 1
  }

  return {
    counts,
    rows: upcoming
      .filter((c) => LISTED_STATES.includes(c.state))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    hasPast: candidates.some((c) => !isUpcoming(c, today) && PAST_STATES.includes(c.state)),
  }
}

const CARDS: HubDashboardCard[] = ['ferry', 'car_rental', 'visa', 'insurance']
const ROW_TYPES: HubDashboardRowType[] = [...CARDS, 'transfer', 'luggage', 'package_pickup']

const isCard = (t: HubDashboardRowType): t is HubDashboardCard => (CARDS as string[]).includes(t)
const isRowType = (t: string): t is HubDashboardRowType => (ROW_TYPES as string[]).includes(t)

// Feribotun yolcu sayısı ferry trip_item'ından; getMyFerryReservations onu taşımıyor.
const ferryPax = (trip: { items: Array<{ type: string; passengerCount: number }> } | undefined) =>
  trip?.items.find((i) => i.type === 'ferry')?.passengerCount ?? null
