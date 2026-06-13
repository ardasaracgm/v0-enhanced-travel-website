// Legacy yer-tutucu adres sigortası. Walk-in formu artık email-ZORUNLU (parça-4) →
// yeni placeholder ÜRETİLMEZ. Ama bu değişiklikten önce oluşmuş walk-in trip'lerin
// contact_email'i hâlâ @walk-in.travelbeez.local; isPlaceholderEmail, confirmPayment'in
// email gate'inde (parça-2) o eski satırlara bounce mail atılmasını engeller.
const WALK_IN_EMAIL_DOMAIN = 'walk-in.travelbeez.local'

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${WALK_IN_EMAIL_DOMAIN}`)
}
