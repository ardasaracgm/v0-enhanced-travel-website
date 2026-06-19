/**
 * Pure unit test for lib/ferry/reservation-request.ts — no I/O, no server-only.
 * Run: npx tsx scripts/reservation-request.test.ts   (exit 1 on any failure)
 */
import { buildFerryReservationRequest, type FerryLegInput } from '../lib/ferry/reservation-request'
import type { FerryReservationPassenger } from '../lib/ferry/provider'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}
function throws(name: string, fn: () => unknown) {
  try { fn(); failures++; console.error(`✘ ${name}\n   expected throw, got none`) }
  catch { console.log(`✔ ${name}`) }
}

const pax: FerryReservationPassenger[] = [{
  firstName: 'Ada', lastName: 'Saraç', passportNumber: 'U123',
  gender: 'unspecified', dateOfBirth: '1990-01-01', nationality: 'TR',
}]
const contact = { name: 'Ada Saraç', email: 'a@b.c', telephone: '+90500' }
const ob: FerryLegInput = { expeditionId: 111, direction: 'outbound' }
const rt: FerryLegInput = { expeditionId: 222, direction: 'return' }

eq('one-way → no returnTripId (adapter sends arrivalExpeditionID:0)',
  buildFerryReservationRequest({ legs: [ob], passengers: pax, contact, poNumber: 'PO1' }),
  { outboundTripId: '111', returnTripId: undefined, openReturn: false, contact, passengers: pax, poNumber: 'PO1' })

eq('round-trip → outbound + return',
  buildFerryReservationRequest({ legs: [ob, rt], passengers: pax, contact, poNumber: 'PO2' }),
  { outboundTripId: '111', returnTripId: '222', openReturn: false, contact, passengers: pax, poNumber: 'PO2' })

eq('leg order independent (return first in array)',
  buildFerryReservationRequest({ legs: [rt, ob], passengers: pax, contact, poNumber: 'PO3' }).outboundTripId,
  '111')

throws('0 legs → throw', () => buildFerryReservationRequest({ legs: [], passengers: pax, contact, poNumber: 'P' }))
throws('3 legs → throw', () => buildFerryReservationRequest({ legs: [ob, rt, ob], passengers: pax, contact, poNumber: 'P' }))
throws('2 outbound, 0 return → throw', () => buildFerryReservationRequest({ legs: [ob, ob], passengers: pax, contact, poNumber: 'P' }))
throws('no passengers → throw', () => buildFerryReservationRequest({ legs: [ob], passengers: [], contact, poNumber: 'P' }))

console.log(failures ? `\n${failures} FAIL` : `\nALL PASS`)
process.exit(failures ? 1 : 0)
