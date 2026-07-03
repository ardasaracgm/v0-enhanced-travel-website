import { z } from 'zod'

// Auras get_price 1-9 sınırı (form + server parity). submitInsuranceOrder de
// aynı sınırı uygular; ileride (B sonu) action bu şemaya hizalanabilir.
export const MAX_TRAVELLERS = 9
export const INSURANCE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Adım 1 — tarih + yolcu sayısı + teminat + iletişim. coverageId'nin GERÇEK bir
// tarife olup olmadığı runtime (canlı quote) işi; şema yalnız şekli doğrular.
// İletişim (email/phone) fold-fit için step 1'e alındı (voucher/ödeme bildirimi).
export const insuranceStep1Schema = z
  .object({
    dateFrom: z.string().regex(INSURANCE_DATE_RE),
    dateTo: z.string().regex(INSURANCE_DATE_RE),
    travellers: z.number().int().min(1).max(MAX_TRAVELLERS),
    coverageId: z.number().int().positive(),
    contactEmail: z.string().trim().regex(/.+@.+\..+/, 'email_invalid'),
    contactPhone: z.string().trim().min(6, 'phone_invalid'),
  })
  .refine((v) => v.dateFrom <= v.dateTo, { path: ['dateTo'], message: 'date_order' })

export type InsuranceStep1 = z.infer<typeof insuranceStep1Schema>

// Adım 2 — yolcular. submitInsuranceOrder (Part A) ile parity: passport ZORUNLU.
// İletişim (email/phone) step 1'e taşındı. Mesajlar i18n fragmanı (insurance.errors.*).
export const insurancePassengerSchema = z.object({
  firstName: z.string().trim().min(1, 'firstName_required'),
  lastName: z.string().trim().min(1, 'lastName_required'),
  birthDate: z.string().regex(INSURANCE_DATE_RE, 'birthDate_invalid'),
  passportNumber: z.string().trim().min(1, 'passport_required'),
})

export const insuranceStep2Schema = z.object({
  passengers: z.array(insurancePassengerSchema).min(1).max(MAX_TRAVELLERS),
})

export type InsurancePassenger = z.infer<typeof insurancePassengerSchema>
export type InsuranceStep2 = z.infer<typeof insuranceStep2Schema>
