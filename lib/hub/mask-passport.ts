// KVKK/GDPR: only the last 2 chars reach the client; the rest is masked at the
// server boundary (screen-share / shoulder-surf / cache exposure guard). CRITICAL
// for Travel Companions (someone else's data) — single source, reused by the trip
// detail passenger table and the companions list alike.
export function maskPassport(n?: string | null): string | null {
  const s = (n ?? '').trim()
  if (!s) return null
  return s.length <= 2 ? s : '••••••' + s.slice(-2)
}
