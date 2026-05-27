# Sprint 2 Diff Plan — 2026-05-27

Migrate all booking-flow consumers from legacy named fields to the
`items[]` / selector API introduced in Sprint 1. Fix the `next/link`
and `next/navigation` i18n import bug across every affected page.

Legacy fields (`selectedFerry`, `returnFerry`, `carRental`, `totalPrice`)
are NOT deleted — that is Sprint 3.

---

## Commit boundary summary

| Commit | Files | Rationale |
|--------|-------|-----------|
| 1 | `lib/actions/submit-booking.ts` + `app/[locale]/checkout/page.tsx` | Changing `SubmitBookingInput` breaks checkout's TypeScript until checkout is updated; must ship together |
| 2 | `app/[locale]/ferry/results/page.tsx` | Self-contained |
| 3 | `app/[locale]/ferry/passenger-details/page.tsx` | Self-contained |
| 4 | `app/[locale]/confirmation/page.tsx` | Self-contained |

Build (`pnpm build`) must pass after every commit before the next starts.

---

## Commit 1 — lib/actions/submit-booking.ts + checkout/page.tsx

### lib/actions/submit-booking.ts

#### SubmitBookingInput — replace named ID fields with items[]

Remove:
```
outboundFerryId: string
returnFerryId?: string
carRentalId?: string
carRentalDays?: number
carPickupAt?: string
carDropoffAt?: string
departDate: string
returnDate?: string
```

Replace with an items array that mirrors the client's `BookingItem` union,
carrying IDs only (no prices — server still resolves those):
```ts
items: Array<
  | { type: 'ferry';      leg: 'outbound' | 'return'; ferryId: string; date: string }
  | { type: 'car_rental'; carId: string; days: number; pickupAt?: string; dropoffAt?: string }
>
```

`passengerCount`, `passengers`, `contactEmail`, `contactPhone`,
`notesCustomer` are unchanged.

#### Implementation — replace resolve steps 1-4 with a for-of loop

Old steps 1-4 (resolve outbound ferry, resolve optional return, resolve
optional car, manually build items[]) are deleted.

New: iterate `input.items`, switch on `type`:

```
for (const item of input.items) {
  if (item.type === 'ferry') {
    ferry = getFerryById(item.ferryId)   ← still authoritative price source
    → push CreateTripInput ferry item using item.date for schedule
  } else if (item.type === 'car_rental') {
    car = await supabase.cars lookup     ← still authoritative price source
    → push CreateTripInput car_rental item using item.days/pickupAt/dropoffAt
  }
}
```

Validation: if no items resolved (all IDs unrecognised), return
`validation_failed`. A missing car ID is still a soft failure (log and
continue without the car item, same as current behaviour). A missing
ferry ID is a hard failure.

Steps 5-7 (lead passenger, companions, `createTrip` call) are unchanged.

`combineDateAndTime` and `splitName` helpers are unchanged.

---

### app/[locale]/checkout/page.tsx

#### i18n routing fix

Remove:
```ts
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
```

Add:
```ts
import { Link, useRouter } from '@/i18n/routing'
```

Remove `const locale = useLocale()`. Convert all manual locale-prefixed
hrefs to bare paths (the i18n wrappers inject the prefix automatically):

| Old | New |
|-----|-----|
| `` `/${locale}/ferry` `` | `"/ferry"` |
| `` `/${locale}/ferry/passenger-details` `` | `"/ferry/passenger-details"` |
| `` `/${locale}/terms` `` | `"/terms"` |
| `` `/${locale}/privacy` `` | `"/privacy"` |
| `` router.push(`/${locale}/confirmation`) `` | `router.push('/confirmation')` |

#### State reads → selectors

Add to import from `@/lib/booking-context`:
`selectOutboundFerry, selectReturnFerry, selectCarRental, selectTotalPrice`

At the top of the component body (after `useBooking`):
```ts
const outbound = selectOutboundFerry(state)
const returnF  = selectReturnFerry(state)
const car      = selectCarRental(state)
```

All `state.selectedFerry` reads → `outbound`
All `state.returnFerry` reads → `returnF`
All `state.carRental` reads → `car`

Guard in `handleConfirm`: `if (!outbound || isProcessing) return`
Guard JSX: `if (!outbound || state.passengers.length === 0)`

Total in Order Summary sidebar: replace the inline sum
```ts
(state.selectedFerry.price * state.searchParams.passengers)
+ (state.returnFerry ? … : 0)
+ (state.carRental ? … : 0)
```
with `selectTotalPrice(state)`.

Individual line prices in the sidebar keep their inline form but now use
`outbound.price`, `returnF.price`, `car.pricePerDay` from selectors.

#### submitBooking call — switch to items array

Old named-field arguments:
```ts
outboundFerryId: state.selectedFerry.id,
returnFerryId:   state.returnFerry?.id,
carRentalId:     state.carRental?.carId,
carRentalDays:   state.carRental?.days,
carPickupAt:     state.carRental?.pickupAt,
carDropoffAt:    state.carRental?.dropoffAt,
departDate:      state.searchParams.date,
returnDate:      state.searchParams.returnDate,
```

New:
```ts
items: state.items.map(item =>
  item.type === 'ferry'
    ? { type: 'ferry' as const, leg: item.leg, ferryId: item.ferryId, date: item.date }
    : { type: 'car_rental' as const, carId: item.carId, days: item.days,
        pickupAt: item.pickupAt, dropoffAt: item.dropoffAt }
),
```

`passengerCount`, `passengers`, `contactEmail`, `contactPhone` are
unchanged.

---

## Commit 2 — app/[locale]/ferry/results/page.tsx

### i18n routing fix

Remove:
```ts
import Link from 'next/link'
import { useRouter } from 'next/navigation'
```

Add:
```ts
import { Link, useRouter } from '@/i18n/routing'
```

Back button: `<Link href="/ferry">` (was `"/ferry"` — already bare, now
correctly handled by i18n Link).
`router.push('/ferry/passenger-details')` — no change to the path string;
the i18n router injects the prefix.

### Remove local selectedFerry and selectedReturnFerry state

Delete:
```ts
const [selectedFerry, setSelectedFerry] = React.useState<FerryRoute | null>(null)
const [selectedReturnFerry, setSelectedReturnFerry] = React.useState<FerryRoute | null>(null)
```

Add at the top of the component body:
```ts
const outbound = selectOutboundFerry(state)
const returnF  = selectReturnFerry(state)
```

In `handleSelectFerry`: remove `setSelectedFerry(ferry)`. The
`dispatch({ type: 'SELECT_FERRY', ... })` call already writes to both
`state.selectedFerry` and `state.items`; the selector reads back from
`items` on the next render.

In `handleSelectReturnFerry`: remove `setSelectedReturnFerry(ferry)`.
Same reasoning.

All JSX reads of `selectedFerry` → `outbound`.
All JSX reads of `selectedReturnFerry` → `returnF`.

### Keep isSelectingReturn as local state

`isSelectingReturn` controls which panel is rendered (outbound ferry list
vs. return ferry list). It is pure UI state with no booking-domain
meaning. There is no context equivalent and it must stay local.

### Remove totalPrice useMemo and SET_TOTAL_PRICE dispatch

Delete the `totalPrice` useMemo entirely.

Replace all `totalPrice` reads in JSX with `selectTotalPrice(state)`.

Remove `dispatch({ type: 'SET_TOTAL_PRICE', payload: basePrice + returnPrice })`
from `handleContinue` — `selectTotalPrice` derives the total from items,
which are already up to date at this point.

Simplified `handleContinue`:
```ts
const handleContinue = () => {
  if (outbound) {
    router.push('/ferry/passenger-details')
  }
}
```

### Imports

Add to `@/lib/booking-context` import:
`selectOutboundFerry, selectReturnFerry, selectTotalPrice`

---

## Commit 3 — app/[locale]/ferry/passenger-details/page.tsx

### i18n routing fix

Remove:
```ts
import Link from 'next/link'
import { useRouter } from 'next/navigation'
```

Add:
```ts
import { Link, useRouter } from '@/i18n/routing'
```

Back button: `<Link href="/ferry/results">` (bare path).
`router.push('/checkout')` — bare path.
No-ferry guard link: `<Link href="/ferry">` (bare path).

### State reads → selectors

Add to `@/lib/booking-context` import:
`selectOutboundFerry, selectReturnFerry, selectTotalPrice`

```ts
const outbound = selectOutboundFerry(state)
const returnF  = selectReturnFerry(state)
```

Guard check: `if (!outbound)` → show "No Ferry Selected" card.

Header display: `outbound.from`, `outbound.to`, `outbound.departureTime`,
`outbound.arrivalTime` replace the `state.selectedFerry.*` reads.

Sidebar: `state.totalPrice` → `selectTotalPrice(state)`.
Return ferry block: `state.returnFerry` → `returnF`.
Return ferry fields: `returnF.from`, `returnF.to`, etc.

### Form sync: keep "sync on Continue"

The Sprint 2 plan doc says to sync form state to context on change. After
review, this is NOT recommended and will not be implemented here.

Reason: passenger form fields are controlled local React state. Dispatching
`SET_PASSENGERS` on every keystroke causes a context update + sessionStorage
write on each character, with no user-visible benefit. The standard React
pattern is to sync to external state on explicit form submission ("Continue").
Data-loss risk is low: if the user has filled this form before, `state.passengers`
is already in sessionStorage and will be restored when they return.

This deviation from the plan doc is intentional. The "sync on Continue"
pattern stays.

---

## Commit 4 — app/[locale]/confirmation/page.tsx

### i18n routing fix

Remove:
```ts
import Link from 'next/link'
import { useLocale } from 'next-intl'
```

Add:
```ts
import { Link } from '@/i18n/routing'
```

Remove `const locale = useLocale()`. Convert hrefs:

| Old | New |
|-----|-----|
| `` `/${locale}` `` | `"/"` |
| `` `/${locale}/ferry` `` (×2) | `"/ferry"` |

### State reads → selectors

Add to `@/lib/booking-context` import:
`selectOutboundFerry, selectReturnFerry, selectCarRental, selectTotalPrice`

```ts
const outbound = selectOutboundFerry(state)
const returnF  = selectReturnFerry(state)
const car      = selectCarRental(state)
```

Guard: `if (!outbound || !state.bookingReference)` → empty state card.

Confetti `useEffect` dependency: `state.selectedFerry` → `outbound`.

Line totals keep their existing form, now using selector values:
```ts
const ferryTotal  = outbound ? outbound.price * state.searchParams.passengers : 0
const returnTotal = returnF  ? returnF.price  * state.searchParams.passengers : 0
const carTotal    = car      ? car.pricePerDay * car.days                     : 0
const grandTotal  = selectTotalPrice(state)
```

All JSX reads of `state.selectedFerry.*` → `outbound.*`
All JSX reads of `state.returnFerry.*` → `returnF.*`
All JSX reads of `state.carRental.*` → `car.*`

---

## Acceptance criteria

All three must pass before Sprint 2 is closed.

1. **One-way ferry** (e.g. Bodrum → Kos, 2 passengers): booking completes end-to-end; TB-26-XXXXXX reference is issued; WhatsApp payment link opens; confirmation page shows correct operator, date, and total.

2. **Round-trip** (Bodrum → Kos + Kos → Bodrum, 2 passengers): both legs shown on checkout and confirmation pages; total is sum of both legs × 2 pax; reference issued.

3. **Ferry + car rental** (select ferry, then add car rental): car block appears in checkout and confirmation; total includes car; reference issued.

4. **Locale routing**: all inter-page navigation within the booking flow uses locale-prefixed URLs. Navigating to `/tr/ferry/results` and clicking the back button returns to `/tr/ferry`, not `/ferry`.

5. **Mid-flow refresh**: refresh on `/[locale]/ferry/passenger-details`; selected ferry and total price are still visible (sessionStorage → items[] hydration is working).

6. `pnpm build` passes green after each of the four commits.

---

---

## Plan addenda — 2026-05-27 review

### Addendum 1: submit-booking.ts outbound-ferry validation

The for-of loop must validate item structure before processing. Specific rules (in evaluation order):

1. `if (!input.items || input.items.length === 0)` → `validation_failed: 'Booking must contain at least one item'`
2. `if (!input.items.some(i => i.type === 'ferry' && i.leg === 'outbound'))` → `validation_failed: 'Booking must include an outbound ferry leg'`

These run before the loop. A booking with only a `car_rental` item (no outbound ferry) is rejected at step 2. Missing car ID inside the loop remains a soft failure (log + continue), unchanged.

### Addendum 3: useLocale retained in checkout/page.tsx

`import { useLocale } from 'next-intl'` and `const locale = useLocale() as Locale` are kept.
`locale` is passed to `submitBooking({ locale, ... })` for trip storage and notification localization.
The i18n routing fix (bare hrefs, `useRouter` from `@/i18n/routing`) still applies to all Links and `router.push` calls.

### Addendum 2: results/page.tsx handleSelectReturnFerry guard

Add as the first line of `handleSelectReturnFerry`:

```ts
if (!outbound) return
```

Rationale: the UI already prevents the return list from rendering until an outbound ferry is selected (`isSelectingReturn` is only set to `true` inside `handleSelectFerry`). The guard makes the dispatch ordering contract explicit in code, not just in UI flow. Cost is one line; benefit is that SELECT_RETURN_FERRY can never fire without a prior SELECT_FERRY having populated `state.items`.

---

## Out of scope (Sprint 3)

- Deleting `selectedFerry`, `returnFerry`, `carRental`, `totalPrice` from `BookingState`
- Removing `SET_TOTAL_PRICE`, `SET_CAR_RENTAL` actions
- Per-passenger Zod validation
- Car rental upsell page at `/[locale]/ferry/extras/`
