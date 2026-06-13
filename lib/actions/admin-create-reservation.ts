'use server'

import { createHash } from 'crypto'

import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createTrip } from '@/lib/actions/create-trip'
import { isAvailable, computeEndDate } from '@/lib/car-availability'
import { dateDiffInDays } from '@/lib/normalize-car'
import { buildWalkInEmail } from '@/lib/walk-in-email'
import { redirect } from '@/i18n/routing'
import type { Locale } from '@/lib/notifications/whatsapp-link'

// createTrip validateInput ile aynı email kuralı (create-trip.ts:137).
const EMAIL_RE = /.+@.+\..+/

/**
 * Manuel (walk-in) rezervasyon — submitBooking'in offline ikizi (Viva/Zod YOK).
 * İKİ ADIMLI: burada pending_payment trip + 'held' car_booking oluşturur, sonra
 * /admin/trips/[id]'e yönlendirir → onayı mevcut parça-2 "Mark paid" yapar.
 * GÜVENLİK: updateVisaState/confirmPayment zarfı — self-auth + is_admin; hata → throw.
 */
export async function createReservation(formData: FormData): Promise<void> {
  // 1) Form alanları.
  const carId = String(formData.get('carId') ?? '')
  const pickup = String(formData.get('pickup') ?? '')
  const dropoff = String(formData.get('dropoff') ?? '')
  const customerName = String(formData.get('customerName') ?? '').trim()
  const customerPhone = String(formData.get('customerPhone') ?? '').trim()
  const customerEmailRaw = String(formData.get('customerEmail') ?? '').trim()
  const negotiatedRateRaw = String(formData.get('negotiatedRate') ?? '').trim()
  const locale = String(formData.get('locale') ?? 'tr') as Locale

  // 2) Minimal doğrulama (admin güvenilir → sürücü/Zod YOK; createTrip de ayrıca doğrular).
  if (!carId) throw new Error('Araç seçilmedi')
  if (!pickup || !dropoff || dateDiffInDays(pickup, dropoff) < 0) {
    throw new Error('Geçersiz tarih aralığı — bırakış alıştan önce olamaz')
  }
  const days = dateDiffInDays(pickup, dropoff) + 1
  if (customerName.length < 2) throw new Error('Müşteri adı zorunlu')
  if (customerPhone.length < 6) throw new Error('Geçerli telefon zorunlu')

  // 3) Gate — admin-confirm-payment.ts:31-42 ile birebir.
  const auth = await createSupabaseServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('unauthorized')
  const { data: profile } = await auth
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) throw new Error('forbidden')

  // 4) Email dallanması (C): gerçek email geçerliyse onu kullan (Mark paid mail atar);
  //    yoksa telefon-temelli .local placeholder (isPlaceholderEmail guard mail'i susturur).
  const email = EMAIL_RE.test(customerEmailRaw) ? customerEmailRaw : buildWalkInEmail(customerPhone)

  // 5) Sunucu fiyatı OTORİTE (CLAUDE.md: client fiyatına güvenme). submit-booking.ts:243-247.
  const admin = getSupabaseAdmin()
  const { data: car, error: carErr } = await admin
    .from('cars')
    .select('id, brand, model, price_per_day')
    .eq('id', carId)
    .maybeSingle()
  if (carErr) throw new Error(`Araç sorgusu hatası: ${carErr.message}`)
  if (!car) throw new Error(`Araç bulunamadı: ${carId}`)
  const serverPrice = Number(car.price_per_day ?? 0) * days

  // 6) Çift-rezervasyon guard — walk-in'de de ZORUNLU (overbooking koruması).
  //    submit-booking.ts:252-254 ile aynı sert reddetme.
  const free = await isAvailable(carId, pickup, days)
  if (!free) throw new Error(`Araç bu tarihlerde dolu: ${carId}`)

  // 7) Fiyat kararı (B): geçerli override → onu kullan; değilse sunucu fiyatı.
  const parsedRate = negotiatedRateRaw !== '' ? Number(negotiatedRateRaw) : null
  const validOverride = parsedRate !== null && Number.isFinite(parsedRate) && parsedRate >= 0
  const priceAmount = validOverride ? (parsedRate as number) : serverPrice

  // 8) Car item'ı INLINE kur (resolver reuse YOK). Override metadata'ya loglanır.
  const brandModel = [car.brand, car.model].filter(Boolean).join(' ').trim() || 'Car rental'
  const carItem = {
    type: 'car_rental' as const,
    title: brandModel,
    scheduledAt: pickup,
    endsAt: dropoff,
    passengerCount: 1,
    priceAmount,
    priceCurrency: 'EUR',
    metadata: {
      car_id: carId,
      pickup,
      dropoff,
      days,
      confirmed_by: user.id,
      ...(validOverride ? { negotiated_rate: priceAmount, original_rate: serverPrice } : {}),
    },
  }

  // 9) Deterministik idempotency key (carId + tarih + telefon hash) → çift-tık idempotent
  //    (createTrip aynı key'de mevcut trip'i döndürür, mükerrer oluşturmaz). >=16 char.
  const idempotencyKey = createHash('sha256')
    .update(`admin-walkin:${carId}:${pickup}:${dropoff}:${customerPhone.replace(/\D/g, '')}`)
    .digest('hex')

  // createTrip için lead = müşteri; ad/soyad ayır (buildPassengerRows structured alanları yeğler).
  const [firstName, ...rest] = customerName.split(/\s+/)
  const lastName = rest.join(' ')

  // 10) Trip (pending_payment) + lead passenger + customer upsert. source:'admin'.
  const tripResult = await createTrip({
    idempotencyKey,
    locale,
    source: 'admin',
    customer: { fullName: customerName, firstName, lastName, email, phone: customerPhone },
    items: [carItem],
  })
  if (!tripResult.ok) throw new Error(tripResult.error)

  // 11) car_bookings 'held' — submit-booking.ts:397-404 ile aynı (NON-FATAL). Çift-tık
  //     (alreadyExisted) ise mükerrer held YAZMA.
  if (!tripResult.alreadyExisted) {
    const { error: bookErr } = await admin.from('car_bookings').insert({
      trip_id: tripResult.tripId,
      car_id: carId,
      start_date: pickup,
      end_date: computeEndDate(pickup, days),
      state: 'held',
    })
    if (bookErr) console.error('[createReservation] car_bookings insert failed (non-fatal):', bookErr.message)
  }

  // 12) Mevcut Mark paid sayfasına yönlendir (parça-2). redirect NEXT_REDIRECT fırlatır.
  redirect({ href: `/admin/trips/${tripResult.tripId}`, locale })
}
