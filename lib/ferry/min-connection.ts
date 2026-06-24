// Aynı-gün gidiş-dönüşte minimum aktarma payı (dakika): dönüş kalkışı, gidiş
// varışından en az bu kadar sonra olmalı (yolcu adada kalıp dönüşe yetişsin).
// TEK KAYNAK — 180'i başka yerde hardcode etme.
// TODO(admin): make configurable via settings (Kademe 2).
export const MIN_CONNECTION_MINUTES = 180

/** "HH:MM" → gün-içi dakika. "08:05" → 485. Saatler uniform HH:MM (mock + Dentur normalizeTime). */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Aynı-gün dönüş seferi geçerli mi: dönüş kalkışı ≥ gidiş varışı + minMinutes.
 * Sınır DAHİL (varış + tam 3h geçerli). Farklı-gün dönüşte uygulanmaz (yolcu geceler).
 */
export function qualifiesSameDayReturn(
  outboundArrival: string,
  returnDeparture: string,
  minMinutes: number = MIN_CONNECTION_MINUTES,
): boolean {
  return hhmmToMinutes(returnDeparture) >= hhmmToMinutes(outboundArrival) + minMinutes
}
