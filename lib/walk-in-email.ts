// Walk-in müşterisi email vermezse üretilen yer-tutucu adres. Non-routable .local
// domain → ASLA gerçek mail gönderilmez: isPlaceholderEmail, confirmPayment'in email
// gate'inde guard olarak kullanılır (parça-2). Telefon-temelli → aynı telefonla tekrar
// gelen müşteri upsertCustomer'da (email-key) dedup olur.
const WALK_IN_EMAIL_DOMAIN = 'walk-in.travelbeez.local'

export function buildWalkInEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `walkin-${digits}@${WALK_IN_EMAIL_DOMAIN}`
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${WALK_IN_EMAIL_DOMAIN}`)
}
