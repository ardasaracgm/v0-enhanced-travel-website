'use server'

/**
 * Server action: submitInsuranceOrder
 * ===================================
 * Standalone (ferry'siz) Auras seyahat sigortası siparişi. submitVisaApplication
 * kalıbının birebir kopyası, AMA:
 *   - visa_applications gibi AYRI TABLO YOK → sigorta kaydı trip_items.metadata
 *     (resolveInsuranceItem yazar) + passengers (createTrip yazar).
 *   - Fiyat SERVER-OTORİTER: client priceAmount YOK SAYILIR; getInsuranceQuote
 *     input'la TEKRAR çağrılır (submit-booking re-price deseni). Tüm zincir EUR.
 *   - issuePolicy BURADA çağrılmaz — confirmTrip side-effect'i ödeme onayında keser.
 *
 * Form (Parça B) henüz yok; bu action sabit/test veriyle çağrılabilir.
 */

import { createTrip } from '@/lib/actions/create-trip'
import { createPaymentOrder } from '@/lib/actions/create-payment-order'
import { sendPendingBookingEmail } from '@/lib/email/send-confirmation'
import { getInsuranceQuote } from '@/lib/insurs'
import { MAX_TRAVELLERS } from '@/lib/validation/insurance'
import { resolveInsuranceItem } from '@/lib/trip-items/resolvers'
import type { InsuranceSubmitItem } from '@/lib/trip-items/types'
import type { Locale } from '@/lib/notifications/whatsapp-link'

// ----- Input (Parça B formu bunu üretecek) -----
export interface InsurancePassengerInput {
  firstName: string
  lastName: string
  birthDate: string      // YYYY-MM-DD — fiyatı etkiler + Auras zorunlu
  passportNumber: string // ZORUNLU (boş reddedilir)
}

export interface SubmitInsuranceOrderInput {
  idempotencyKey: string // UUID, ≥16 (caller üretir; retry'da çift trip yok)
  locale: Locale
  dateFrom: string       // YYYY-MM-DD
  dateTo: string         // YYYY-MM-DD (inclusive)
  coverageId: number     // get_offers coverage_id (7=35k, 8=100k) — UI'ın seçtiği
  passengers: InsurancePassengerInput[] // [0] = lead/insurer
  contact: { email: string; phone: string } // createTrip + Auras insurer zorunlu
}

export type SubmitInsuranceErrorCode =
  | 'validation_failed'
  | 'invalid_insurance'
  | 'database_error'
  | 'unexpected'

export type SubmitInsuranceOrderResult =
  | { ok: true; tripId: string; reference: string; redirectUrl?: string; paymentWhatsAppUrl: string }
  | { ok: false; code: SubmitInsuranceErrorCode; error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /.+@.+\..+/

export async function submitInsuranceOrder(
  input: SubmitInsuranceOrderInput,
): Promise<SubmitInsuranceOrderResult> {
  // ----- 1. Validate (client = güvenilmez sınır) -----
  const invalid = validate(input)
  if (invalid) return { ok: false, code: 'validation_failed', error: invalid }

  const { idempotencyKey, locale, dateFrom, dateTo, coverageId, passengers, contact } = input
  const lead = passengers[0]

  try {
    // ----- 2. SERVER-SIDE RE-PRICE — client fiyatına GÜVENME. Gerçek DOB'larla
    //          getInsuranceQuote'u TEKRAR çağır, seçilen coverageId'yi eşleştir.
    //          Zincir EUR: company 366 EUR-only döner, resolver priceCurrency 'EUR'. -----
    let tariffs
    try {
      tariffs = await getInsuranceQuote({
        dateFrom,
        dateTo,
        touristCount: passengers.length,
        tourists: passengers.map((p) => ({ dateBirth: p.birthDate })),
      })
    } catch (err) {
      console.error('[submitInsuranceOrder] quote failed:', err)
      return { ok: false, code: 'invalid_insurance', error: 'Insurance quote failed' }
    }
    const match = tariffs.find((t) => t.coverageId === coverageId)
    if (!match) {
      return { ok: false, code: 'invalid_insurance', error: `Coverage not available: ${coverageId}` }
    }

    // ----- 3. resolveInsuranceItem (PURE) — server fiyatıyla insurance trip_item.
    //          metadata.coverage_id/tariff_id/starts_at/ends_at = issuePolicy'nin okuduğu alanlar. -----
    const submitItem: InsuranceSubmitItem = {
      type: 'insurance',
      tariffId: match.tariffId,
      tariffName: match.tariffName,
      touristCount: passengers.length,
      priceAmount: match.priceAmount, // display; resolver quoteAmount'ı kullanır
    }
    const insuranceItem = resolveInsuranceItem({
      item: submitItem,
      quoteAmount: match.priceAmount, // OTORİTER (EUR)
      quoteCurrency: match.sourceCurrency,
      coverageId: match.coverageId,
      coverageValue: match.coverageValue,
      dateFrom,
      dateTo,
    })

    // ----- 4. createTrip — source:'insurance', tek insurance item, lead+tourists.
    //          idempotencyKey caller'dan (retry'da mevcut trip döner, çift yok). -----
    const tripResult = await createTrip({
      idempotencyKey,
      locale,
      source: 'insurance',
      customer: {
        fullName: `${lead.firstName} ${lead.lastName}`.trim(),
        firstName: lead.firstName,
        lastName: lead.lastName,
        birthDate: lead.birthDate,
        passportNumber: lead.passportNumber,
        email: contact.email,
        phone: contact.phone,
      },
      additionalPassengers: passengers.slice(1).map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate,
        passportNumber: p.passportNumber,
      })),
      items: [insuranceItem],
    })
    if (!tripResult.ok) {
      const code = tripResult.code === 'validation_failed' ? 'validation_failed' : 'database_error'
      return { ok: false, code, error: tripResult.error }
    }

    // ----- 5. Viva ödeme siparişi (non-fatal — ulaşılamazsa WhatsApp fallback). -----
    let redirectUrl: string | undefined
    try {
      const pay = await createPaymentOrder({ tripId: tripResult.tripId, locale })
      if (pay.ok) redirectUrl = pay.redirectUrl
      else console.warn('[submitInsuranceOrder] Viva order failed, WhatsApp fallback:', pay.error)
    } catch (err) {
      console.error('[submitInsuranceOrder] createPaymentOrder threw:', err)
    }

    // ----- 6. Pending+WhatsApp email — visa'daki aynı kural: yalnız Viva fallback'te
    //          (redirect yok) ve yalnız yeni trip'te. issuePolicy ÇAĞRILMAZ. -----
    if (!redirectUrl && !tripResult.alreadyExisted) {
      await sendPendingBookingEmail({
        reference: tripResult.reference,
        customerName: `${lead.firstName} ${lead.lastName}`.trim(),
        contactPhone: contact.phone,
        contactEmail: contact.email,
        totalAmount: tripResult.totalAmount,
        currency: tripResult.currency,
        locale,
        items: [{
          type: 'insurance',
          title: insuranceItem.title,
          scheduledAt: insuranceItem.scheduledAt,
          price: insuranceItem.priceAmount,
        }],
        paymentWhatsAppUrl: tripResult.paymentWhatsAppUrl,
      })
    }

    return {
      ok: true,
      tripId: tripResult.tripId,
      reference: tripResult.reference,
      redirectUrl,
      paymentWhatsAppUrl: tripResult.paymentWhatsAppUrl,
    }
  } catch (err) {
    console.error('[submitInsuranceOrder] unexpected error:', err)
    return { ok: false, code: 'unexpected', error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// ============================================================
// Validation — passport ZORUNLU, tarih + kişi sayısı + contact.
// ============================================================
function validate(i: SubmitInsuranceOrderInput): string | null {
  if (!i.idempotencyKey || i.idempotencyKey.length < 16) return 'Missing or invalid idempotency key'
  if (!DATE_RE.test(i.dateFrom) || !DATE_RE.test(i.dateTo)) return 'Invalid travel dates'
  if (i.dateFrom > i.dateTo) return 'dateFrom must be on or before dateTo' // ISO → leksikal sıralanır
  if (!Number.isInteger(i.coverageId)) return 'Invalid coverage selection'
  if (!i.contact || !EMAIL_RE.test(i.contact.email ?? '')) return 'Invalid contact email'
  if (!i.contact.phone || i.contact.phone.length < 6) return 'Invalid contact phone'
  if (!Array.isArray(i.passengers) || i.passengers.length < 1 || i.passengers.length > MAX_TRAVELLERS) {
    return `Passengers must be between 1 and ${MAX_TRAVELLERS}`
  }
  for (const p of i.passengers) {
    if (!p.firstName?.trim() || !p.lastName?.trim()) return 'Passenger name is required'
    if (!DATE_RE.test(p.birthDate ?? '')) return 'Passenger birth date is invalid'
    if (!p.passportNumber?.trim()) return 'Passenger passport number is required' // ZORUNLU
  }
  return null
}
