/**
 * Sigorta poliçesi PDF'i için kanonik R2 object key:
 *   policies/{tripId}/{orderId}-policy.pdf
 * orderId (Auras order_id) benzersiz → uuid gerekmez; re-issue, metadata.order_id
 * idempotency guard'ıyla zaten engellenir.
 */
export function buildPolicyKey(tripId: string, orderId: number): string {
  return `policies/${tripId}/${orderId}-policy.pdf`
}
