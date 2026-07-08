/**
 * Ferry → iCalendar (.ics) builder — pure, dependency-free, client-safe.
 *
 * Consumed by the confirmation page's "Add to calendar" button (client-side
 * Blob download, works for guests). Produces an RFC 5545 VCALENDAR with one
 * VEVENT per ferry leg (outbound + optional return / open-jaw).
 *
 * TIMEZONE (the whole point): ferry times are raw wall-clock "HH:MM" in the
 * PORT's local zone (Turkey +03 permanent, Greece +02/+03 with DST). We reuse
 * the exact, prod-proven conversion from lib/trip-items/resolvers.ts —
 * zonedDateTime(date, time, portTimezone(port)) — to get a DST-correct offset
 * ISO, then emit it as a UTC instant with a Z suffix. This is approach (b): no
 * VTIMEZONE block to embed, no floating-time ambiguity. Departure is anchored
 * in the origin zone, arrival in the destination zone — so a Bodrum→Kos winter
 * sailing crossing the +03/+02 boundary lands at the right wall-clock in the
 * user's calendar.
 */
import type { FerryPort } from './provider'
import { portTimezone, zonedDateTime } from './timezone'

export interface FerryIcsContact {
  whatsappUrl?: string
  phone?: string
}

/** Localized DESCRIPTION field labels (button text is handled by the caller). */
export interface FerryIcsLabels {
  reference: string
  vessel: string
  operator: string
  contact: string
}

/**
 * The subset of a sailing the .ics needs. A full FerryTrip (provider / booking
 * snapshot) is structurally assignable to this, and the paid email builds one
 * directly from stored trip_item metadata — so both callers stay type-safe
 * without the .ics depending on the whole domain type.
 */
export interface FerryIcsTrip {
  from: FerryPort
  to: FerryPort
  operator: string
  vessel: string
  date: string           // wall-clock local departure date "YYYY-MM-DD"
  departureTime: string  // wall-clock "HH:MM" at the origin port
  arrivalTime: string    // wall-clock "HH:MM" at the destination port
}

export interface FerryIcsLeg {
  trip: FerryIcsTrip
  /** Stable UID discriminator + open-jaw disambiguation. */
  kind: 'outbound' | 'return'
}

export interface FerryIcsOptions {
  reference: string
  contact: FerryIcsContact
  labels: FerryIcsLabels
  /** Override generation timestamp (UTC "YYYYMMDDTHHMMSSZ"); defaults to now. */
  dtstamp?: string
}

const CRLF = '\r\n'

/** RFC 5545 §3.3.11 TEXT escaping: backslash, semicolon, comma, newline. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Fold a content line to ≤75 octets (RFC 5545 §3.1). We split on CHARACTER
 * boundaries (never mid-codepoint), so a multibyte char may push a line a few
 * octets over 75 — universally tolerated, and far safer than splitting a UTF-8
 * sequence. Continuation lines begin with a single space.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) {
    parts.push(' ' + line.slice(i, i + 74))
  }
  return parts.join(CRLF)
}

/** Date → basic-format UTC stamp: "20260625T091500Z". */
function toIcsUtc(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  )
}

/** Zoned wall-clock (date + "HH:MM" + port tz) → UTC .ics stamp. */
function zonedToIcsUtc(date: string, time: string, port: FerryPort): string {
  return toIcsUtc(new Date(zonedDateTime(date, time, portTimezone(port))))
}

function buildEvent(leg: FerryIcsLeg, opts: FerryIcsOptions, dtstamp: string): string[] {
  const { trip, kind } = leg
  const summary = `TravelBeez: ${trip.from.name} → ${trip.to.name} (${trip.operator})`

  const contactValue = opts.contact.whatsappUrl || opts.contact.phone || ''
  const description = [
    `${opts.labels.reference}: ${opts.reference}`,
    `${opts.labels.vessel}: ${trip.vessel}`,
    `${opts.labels.operator}: ${trip.operator}`,
    contactValue && `${opts.labels.contact}: ${contactValue}`,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    'BEGIN:VEVENT',
    foldLine(`UID:${opts.reference}-${kind}@travelbeez.gr`),
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${zonedToIcsUtc(trip.date, trip.departureTime, trip.from)}`,
    `DTEND:${zonedToIcsUtc(trip.date, trip.arrivalTime, trip.to)}`,
    foldLine(`SUMMARY:${escapeText(summary)}`),
    foldLine(`LOCATION:${escapeText(trip.from.name)}`),
    foldLine(`DESCRIPTION:${escapeText(description)}`),
    'END:VEVENT',
  ]
}

/**
 * Build a VCALENDAR string for one or more ferry legs. Skips legs whose trip is
 * falsy so callers can pass [outbound, returnFerry] without pre-filtering.
 */
export function buildFerryIcs(legs: FerryIcsLeg[], opts: FerryIcsOptions): string {
  const dtstamp = opts.dtstamp ?? toIcsUtc(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TravelBeez//Ferry Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...legs.flatMap((leg) => buildEvent(leg, opts, dtstamp)),
    'END:VCALENDAR',
  ]
  return lines.join(CRLF) + CRLF
}
