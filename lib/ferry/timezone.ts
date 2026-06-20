import type { FerryPort } from './provider'

/**
 * Canonical port id (FerryPort.id = lowercased/slugged name) → IANA timezone.
 * Greece observes EU DST (Europe/Athens: +03 summer, +02 winter); Turkey is
 * permanent +03 (Europe/Istanbul, no DST since 2016) — so in WINTER a Turkish
 * departure and a Greek one differ by an hour. The old hardcoded +03:00 was a
 * summer-only assumption that drifted a Greek-side sailing an hour off-season.
 *
 * Two countries today (all current routes Bodrum/Turgutreis ⇄ Kos). The list
 * grows per new port; an unmapped port is NOT silently given a wrong offset —
 * see portTimezone's fail-safe.
 */
const PORT_TIMEZONES: Record<string, string> = {
  bodrum: 'Europe/Istanbul',
  turgutreis: 'Europe/Istanbul',
  kos: 'Europe/Athens',
}

/** Operator is Kos-based; an unmapped port defaults to Greece — but loudly. */
const DEFAULT_TIMEZONE = 'Europe/Athens'

/**
 * Resolve a port's IANA timezone. Falls back to DEFAULT_TIMEZONE with a warn
 * (never a silent wrong offset) so a new/unmapped port surfaces in logs instead
 * of corrupting the stored instant.
 */
export function portTimezone(port: FerryPort): string {
  const tz = PORT_TIMEZONES[port.id]
  if (tz) return tz
  console.warn(
    `[ferry] no timezone for port '${port.id}' (${port.name}) — defaulting to ${DEFAULT_TIMEZONE}; add it to PORT_TIMEZONES`,
  )
  return DEFAULT_TIMEZONE
}

/**
 * Wall-clock date+time in an IANA zone → ISO instant carrying that zone's actual
 * offset for THAT date (DST-aware). ("2026-01-15","09:00",Europe/Athens) →
 * "2026-01-15T09:00:00+02:00" in winter, "+03:00" in summer.
 */
export function zonedDateTime(date: string, time: string, timeZone: string): string {
  const offsetMin = tzOffsetMinutes(timeZone, `${date}T${time}:00`)
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${date}T${time}:00${sign}${hh}:${mm}`
}

/**
 * Offset (minutes east of UTC) a zone is at for a wall-clock time. Reads the
 * zone-local parts of a UTC guess via Intl, then diffs — the standard no-dep
 * approach. Exact except inside the ~1h DST overlap, which never contains a
 * daytime ferry departure, so it's safe here.
 */
function tzOffsetMinutes(timeZone: string, wallClock: string): number {
  const guess = new Date(`${wallClock}Z`) // treat the wall clock as if it were UTC
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = Object.fromEntries(dtf.formatToParts(guess).map((x) => [x.type, x.value]))
  const asZone = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return Math.round((asZone - guess.getTime()) / 60000)
}
