/**
 * Pure unit test for lib/ferry/timezone.ts — no I/O, no server-only.
 * Locks the DST-aware instant build: a winter Greek sailing is +02 (NOT the old
 * hardcoded +03), a Turkish one stays +03 year-round, summer both +03, and an
 * unmapped port fails safe to the default zone.
 * Run: npx tsx scripts/timezone.test.ts   (exit 1 on any failure)
 */
import { portTimezone, zonedDateTime } from '../lib/ferry/timezone'
import type { FerryPort } from '../lib/ferry/provider'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  if (got === want) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${got}\n   want: ${want}`) }
}
const port = (id: string, name: string): FerryPort => ({ id, name })

// zonedDateTime — DST-aware offset
eq('Kos winter → +02',    zonedDateTime('2026-01-15', '09:00', 'Europe/Athens'),   '2026-01-15T09:00:00+02:00')
eq('Kos summer → +03',    zonedDateTime('2026-07-15', '09:00', 'Europe/Athens'),   '2026-07-15T09:00:00+03:00')
eq('Bodrum winter → +03', zonedDateTime('2026-01-15', '09:00', 'Europe/Istanbul'), '2026-01-15T09:00:00+03:00')
eq('Bodrum summer → +03', zonedDateTime('2026-07-15', '09:00', 'Europe/Istanbul'), '2026-07-15T09:00:00+03:00')

// portTimezone — mapping + fail-safe
eq('bodrum → Istanbul',        portTimezone(port('bodrum', 'Bodrum')),         'Europe/Istanbul')
eq('turgutreis → Istanbul',    portTimezone(port('turgutreis', 'Turgutreis')), 'Europe/Istanbul')
eq('kos → Athens',             portTimezone(port('kos', 'Kos')),               'Europe/Athens')
eq('unknown → default Athens', portTimezone(port('mykonos', 'Mykonos')),       'Europe/Athens')

// The exact winter cross-border case the old +03:00 got wrong:
// Bodrum(TR 09:15 +03) → Kos(GR 10:00 +02) on 15 Jan — a real 1h offset gap.
eq('winter dep Bodrum +03', zonedDateTime('2026-01-15', '09:15', 'Europe/Istanbul'), '2026-01-15T09:15:00+03:00')
eq('winter arr Kos +02',    zonedDateTime('2026-01-15', '10:00', 'Europe/Athens'),   '2026-01-15T10:00:00+02:00')

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED')
process.exit(failures ? 1 : 0)
