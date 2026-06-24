/**
 * Pure unit test for lib/ferry/min-connection.ts — same-day round-trip 3h
 * minimum connection rule. No I/O. Boundary inclusive (arrival + exactly 3h
 * qualifies). Times are uniform "HH:MM" (mock native + Dentur normalizeTime).
 */
import { qualifiesSameDayReturn, hhmmToMinutes, MIN_CONNECTION_MINUTES } from '../lib/ferry/min-connection'

let failures = 0
const eq = (got: unknown, want: unknown, name: string) => {
  if (got !== want) { console.error(`FAIL ${name}: got ${got}, want ${want}`); failures++ }
  else console.log(`ok ${name}`)
}

eq(MIN_CONNECTION_MINUTES, 180, 'sabit 180')
eq(hhmmToMinutes('08:05'), 485, 'parse 08:05')
eq(hhmmToMinutes('00:00'), 0, 'parse 00:00')
// gidiş varış 10:00 referans
eq(qualifiesSameDayReturn('10:00', '09:30'), false, 'dönüş 09:30 < 3h → elenir')
eq(qualifiesSameDayReturn('10:00', '13:00'), true,  'dönüş 13:00 = tam 3h (sınır dahil) → geçer')
eq(qualifiesSameDayReturn('10:00', '12:59'), false, 'dönüş 12:59 < 3h → elenir')
eq(qualifiesSameDayReturn('10:00', '13:01'), true,  'dönüş 13:01 > 3h → geçer')

if (failures) { console.error(`\n${failures} FAIL`); process.exit(1) }
console.log('\nmin-connection: all green')
