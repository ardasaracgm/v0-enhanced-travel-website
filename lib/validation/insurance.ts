import { z } from 'zod'

// Auras get_price 1-9 sınırı (form + server parity). submitInsuranceOrder de
// aynı sınırı uygular; ileride (B sonu) action bu şemaya hizalanabilir.
export const MAX_TRAVELLERS = 9
export const INSURANCE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Adım 1 — tarih + yolcu sayısı + seçilen teminat. coverageId'nin GERÇEK bir
// tarife olup olmadığı runtime (canlı quote) işi; şema yalnız şekli doğrular.
export const insuranceStep1Schema = z
  .object({
    dateFrom: z.string().regex(INSURANCE_DATE_RE),
    dateTo: z.string().regex(INSURANCE_DATE_RE),
    travellers: z.number().int().min(1).max(MAX_TRAVELLERS),
    coverageId: z.number().int().positive(),
  })
  .refine((v) => v.dateFrom <= v.dateTo, { path: ['dateTo'], message: 'date_order' })

export type InsuranceStep1 = z.infer<typeof insuranceStep1Schema>
