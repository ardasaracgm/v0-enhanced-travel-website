/**
 * Pure unit test for lib/ferry/util.ts slug() — no I/O, no server-only.
 * Locks the Turkish folding that makes the app's ASCII port slugs match Dentur's
 * Turkish-uppercase region names (fold(app) === fold(dentur)). Covers: ASCII names
 * unchanged (bodrum/kos), İ→i (TURGUTREİS — no U+0307 bug), ş/ı→s/i (KUŞADASI /
 * Kuşadası), app inputs idempotent, and the cross-side equality the port resolver
 * hinges on. Run: npx tsx scripts/slug.test.ts  (exit 1 on failure)
 */
import { slug } from '../lib/ferry/util'

let failures = 0
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) console.log(`✔ ${name}`)
  else { failures++; console.error(`✘ ${name}\n   got:  ${g}\n   want: ${w}`) }
}

// Dentur region adları (büyük harf departure / Title-case arrival)
eq('BODRUM unchanged', slug('BODRUM'), 'bodrum')
eq('KOS unchanged', slug('KOS'), 'kos')
eq('TURGUTREİS → turgutreis (İ→i, no U+0307)', slug('TURGUTREİS'), 'turgutreis')
eq('KUŞADASI → kusadasi (ş→s, I→i)', slug('KUŞADASI'), 'kusadasi')
eq('Kuşadası → kusadasi (ş→s, ı→i)', slug('Kuşadası'), 'kusadasi')
eq('Turgutreis (arrival, Title) → turgutreis', slug('Turgutreis'), 'turgutreis')
eq('ÇEŞME → cesme', slug('ÇEŞME'), 'cesme')
eq('RODOS → rodos', slug('RODOS'), 'rodos')

// App'in gönderdiği sabit slug'lar — idempotent (folding ASCII'yi bozmaz)
eq('app bodrum idempotent', slug('bodrum'), 'bodrum')
eq('app turgutreis idempotent', slug('turgutreis'), 'turgutreis')
eq('app kusadasi idempotent', slug('kusadasi'), 'kusadasi')
eq('app kos idempotent', slug('kos'), 'kos')

// trim + boşluk → tire korunur
eq('trim whitespace', slug('  Bodrum  '), 'bodrum')
eq('space → hyphen', slug('Kale Port'), 'kale-port')

// Eşleşmenin dayandığı çapraz eşitlik: fold(app) === fold(dentur)
eq('match turgutreis ⇔ TURGUTREİS', slug('turgutreis'), slug('TURGUTREİS'))
eq('match kusadasi ⇔ KUŞADASI', slug('kusadasi'), slug('KUŞADASI'))
eq('match bodrum ⇔ BODRUM', slug('bodrum'), slug('BODRUM'))
eq('match kos ⇔ KOS', slug('kos'), slug('KOS'))

if (failures) { console.error(`\n${failures} FAIL`); process.exit(1) }
console.log('\nALL PASS')
