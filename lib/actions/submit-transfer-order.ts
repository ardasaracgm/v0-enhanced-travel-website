'use server'

/**
 * Server action: submitTransferOrder
 * ==================================
 * Standalone (ferry'siz) Bodrum VIP transfer siparişi. submitInsuranceOrder
 * kalıbı, AMA:
 *   - Harici quote YOK: fiyat statik TRANSFER_REGIONS'tan; resolveTransferItem
 *     (→ calculateTransferTotalCents) OTORİTER, client priceAmount yok sayılır.
 *   - Pasaport/DOB YOK: tek irtibat kişisi (ad/soyad/email/telefon). Yolcu sayısı
 *     bilgi amaçlı (araç kapasitesi) — passenger row üretmez, metadata'ya yazılır.
 *   - issuePolicy benzeri side-effect yok; ödeme onayı confirmTrip'te işlenir.
 */

import { createTrip } from '@/lib/actions/create-trip'
import { createPaymentOrder } from '@/lib/actions/create-payment-order'
import { sendPendingBookingEmail } from '@/lib/email/send-confirmation'
import { resolveTransferItem } from '@/lib/trip-items/resolvers'
import type { TransferSubmitItem } from '@/lib/trip-items/types'
import { TRANSFER_REGIONS } from '@/lib/transfer-rates'
import { todayAthensISO } from '@/lib/validation/dates'
import type { Locale } from '@/lib/notifications/whatsapp-link'

// ----- Input (transfer wizard bunu üretir) -----
export interface TransferLegInput {
  routeId: string
  vehicleId: string
  date: string // YYYY-MM-DD — aktif bacak için ZORUNLU (firma günü koordine eder)
}

export interface SubmitTransferOrderInput {
  idempotencyKey: string // UUID, ≥16 (caller üretir; retry'da çift trip yok)
  locale: Locale
  regionId: string
  outbound?: TransferLegInput
  return?: TransferLegInput
  contact: { firstName: string; lastName: string; email: string; phone: string }
  passengerCount?: number // bilgi amaçlı; fiyat/kalemi ETKİLEMEZ
}

export type SubmitTransferErrorCode =
  | 'validation_failed'
  | 'invalid_transfer'
  | 'database_error'
  | 'unexpected'

export type SubmitTransferOrderResult =
  | { ok: true; tripId: string; reference: string; redirectUrl?: string; paymentWhatsAppUrl: string }
  | { ok: false; code: SubmitTransferErrorCode; error: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /.+@.+\..+/

export async function submitTransferOrder(
  input: SubmitTransferOrderInput,
): Promise<SubmitTransferOrderResult> {
  // ----- 1. Validate (client = güvenilmez sınır) -----
  const invalid = validate(input)
  if (invalid) return { ok: false, code: 'validation_failed', error: invalid }

  const { idempotencyKey, locale, regionId, outbound, return: ret, contact, passengerCount } = input

  try {
    // ----- 2. SERVER-OTORİTER fiyat. resolveTransferItem RangeError (no leg /
    //          unknown region/route/vehicle) → invalid_transfer. Client fiyatı yok. -----
    let transferItem
    try {
      const submitItem: TransferSubmitItem = {
        type: 'transfer',
        regionId,
        outbound: outbound ? { routeId: outbound.routeId, vehicleId: outbound.vehicleId, date: outbound.date } : undefined,
        return: ret ? { routeId: ret.routeId, vehicleId: ret.vehicleId, date: ret.date } : undefined,
        passengerCount,
      }
      transferItem = resolveTransferItem({ item: submitItem })
    } catch (err) {
      console.error('[submitTransferOrder] resolve failed:', err)
      return { ok: false, code: 'invalid_transfer', error: err instanceof Error ? err.message : 'Invalid transfer selection' }
    }

    // ----- 3. createTrip — source:'transfer', tek transfer item, tek irtibat kişisi
    //          (pasaport/DOB yok; companion yok → party_size 1). -----
    const fullName = `${contact.firstName} ${contact.lastName}`.trim()
    const tripResult = await createTrip({
      idempotencyKey,
      locale,
      source: 'transfer',
      customer: {
        fullName,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
      },
      items: [transferItem],
    })
    if (!tripResult.ok) {
      const code = tripResult.code === 'validation_failed' ? 'validation_failed' : 'database_error'
      return { ok: false, code, error: tripResult.error }
    }

    // ----- 4. Viva ödeme siparişi (non-fatal — ulaşılamazsa WhatsApp fallback). -----
    let redirectUrl: string | undefined
    try {
      const pay = await createPaymentOrder({ tripId: tripResult.tripId, locale })
      if (pay.ok) redirectUrl = pay.redirectUrl
      else console.warn('[submitTransferOrder] Viva order failed, WhatsApp fallback:', pay.error)
    } catch (err) {
      console.error('[submitTransferOrder] createPaymentOrder threw:', err)
    }

    // ----- 5. Pending+WhatsApp email — yalnız Viva fallback'te (redirect yok) ve
    //          yalnız yeni trip'te (insurance/visa ile aynı kural). -----
    if (!redirectUrl && !tripResult.alreadyExisted) {
      await sendPendingBookingEmail({
        reference: tripResult.reference,
        customerName: fullName,
        contactPhone: contact.phone,
        contactEmail: contact.email,
        totalAmount: tripResult.totalAmount,
        currency: tripResult.currency,
        locale,
        items: [{
          type: 'transfer',
          title: transferItem.title,
          scheduledAt: transferItem.scheduledAt,
          price: transferItem.priceAmount,
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
    console.error('[submitTransferOrder] unexpected error:', err)
    return { ok: false, code: 'unexpected', error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// ============================================================
// Validation — pasaport YOK; ≥1 bacak + aktif bacak tarihi + contact.
// ============================================================
function validate(i: SubmitTransferOrderInput): string | null {
  if (!i.idempotencyKey || i.idempotencyKey.length < 16) return 'Missing or invalid idempotency key'
  if (!(i.regionId in TRANSFER_REGIONS)) return 'Unknown transfer region'
  if (!i.outbound && !i.return) return 'At least one leg (outbound or return) is required'
  const today = todayAthensISO()
  for (const leg of [i.outbound, i.return]) {
    if (!leg) continue
    if (!leg.routeId?.trim() || !leg.vehicleId?.trim()) return 'Transfer route and vehicle are required'
    if (!DATE_RE.test(leg.date ?? '')) return 'Transfer date is invalid'
    if (leg.date < today) return 'Transfer date cannot be in the past' // ISO → leksikal sıralanır
  }
  if (i.outbound && i.return && i.return.date < i.outbound.date) return 'Return date must be on or after outbound date'
  if (!i.contact || !i.contact.firstName?.trim() || !i.contact.lastName?.trim()) return 'Contact name is required'
  if (!EMAIL_RE.test(i.contact.email ?? '')) return 'Invalid contact email'
  if (!i.contact.phone || i.contact.phone.length < 6) return 'Invalid contact phone'
  if (i.passengerCount != null && (!Number.isInteger(i.passengerCount) || i.passengerCount < 1)) return 'Invalid passenger count'
  return null
}
