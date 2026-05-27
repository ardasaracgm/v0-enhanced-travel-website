## Naming note

The plan doc says "TripItem discriminated union" but `TripItem` is already exported from `lib/supabase.ts` (the DB row shape). The client-side union will be called **`BookingItem`** to avoid confusion. Everything else in the plan is preserved as written.

---

## 1. The `BookingItem` discriminated union

Two variants for Sprint 1, both in `lib/booking-context.tsx`.

**`FerryBookingItem`**
```
type: 'ferry'
leg: 'outbound' | 'return'   ← distinguishes the two legs; replaces selectedFerry vs returnFerry
ferryId: string               ← sent to submitBooking for server-side price lookup
ferry: FerryRoute             ← full object kept for display (operator, times, vessel, etc.)
date: string                  ← YYYY-MM-DD snapshot from searchParams.date / returnDate
passengerCount: number        ← snapshot from searchParams.passengers at selection time
priceAmount: number           ← ferry.price × passengerCount, display only; server recomputes
```

**`CarRentalBookingItem`**
```
type: 'car_rental'
carId: string
model: string
brand?: string
pricePerDay: number
days: number
pickupLocation: string
dropoffLocation: string
pickupAt: string              ← ISO timestamp
dropoffAt: string             ← ISO timestamp
priceAmount: number           ← pricePerDay × days, display only
```

Fields map exactly onto `CarRentalSelection` (no information loss) and onto `CarRentalItemMetadata` in supabase.ts (carId→car_id, pickup/dropoff fields match). `FerryBookingItem.ferry` carries everything in `FerryItemMetadata` (from_port, to_port, operator, vessel, departure_time, arrival_time).

---

## 2. How `items[]` lives alongside the existing fields in Sprint 1

`BookingState` gets one new field added:

```
items: BookingItem[]          ← new, starts as []
```

All existing fields (`selectedFerry`, `returnFerry`, `carRental`, `totalPrice`) remain. They are **written by the reducer** (unchanged from today) AND the reducer also **syncs `items[]`** as a side-effect. No consumer reads `items` yet — that is Sprint 2.

The dual-write lives entirely in the reducer switch cases. Consumers see no change.

---

## 3. Selector functions

Four pure functions exported alongside `useBooking`. They derive the legacy values from `items` so Sprint 2 can migrate consumers one-by-one without touching the reducer.

```
selectOutboundFerry(state)  → FerryRoute | null
  items.find(i => i.type === 'ferry' && i.leg === 'outbound')?.ferry ?? null

selectReturnFerry(state)    → FerryRoute | null
  items.find(i => i.type === 'ferry' && i.leg === 'return')?.ferry ?? null

selectCarRental(state)      → CarRentalSelection | null
  items.find(i => i.type === 'car_rental') → map back to CarRentalSelection shape

selectTotalPrice(state)     → number
  items.reduce((sum, i) => sum + i.priceAmount, 0)
```

In Sprint 1 these are exported but not yet called by any consumer — they are the stable API that Sprint 2 consumers will switch to.

---

## 4. sessionStorage transition strategy

**Answer: we migrate in-place. No booking is lost.**

The hydration `useEffect` already reads `stored` as a parsed object. The plan:

1. Add an `items` case to the hydration switch. If `stored.items` is a non-empty array, dispatch `SET_ITEMS` with it.

2. **After** the switch loop, check: if `stored.items` was absent or empty, reconstruct `items` from the legacy fields that were just restored:
   - `stored.selectedFerry` → push a `FerryBookingItem` with `leg: 'outbound'`
   - `stored.returnFerry` → push a `FerryBookingItem` with `leg: 'return'`
   - `stored.carRental` → push a `CarRentalBookingItem`
   - `passengerCount` comes from `stored.searchParams.passengers`
   - `date` from `stored.searchParams.date` / `returnDate`

3. If any items were reconstructed, dispatch `SET_ITEMS`.

On the next state write, `sessionStorage` will contain both legacy fields **and** `items[]`. On subsequent loads, `stored.items` will be present so the migration branch is skipped.

**Edge case — `SET_SEARCH_PARAMS` after ferry selection**: if the user somehow goes back and changes passenger count, the `priceAmount` on stored ferry items will be stale. This is acceptable for Sprint 1 because the current flow has no back-to-search path once ferries are loaded. The server always recomputes price; stale amounts only affect the display summary. Sprint 2 cleans this up when consumers are rewritten.

---

## 5. Dispatcher actions: what stays, what is added

**Unchanged (same type signature, same consumer behaviour)**
- `SET_SEARCH_PARAMS`
- `SET_PASSENGERS`
- `SET_CONTACT`
- `SET_TOTAL_PRICE` — kept as-is; still sets `state.totalPrice`. Sprint 3 deletes it once selectors are the only path.
- `SET_IDEMPOTENCY_KEY`
- `SET_BOOKING_REFERENCE`
- `SET_PAYMENT_LINK`
- `SET_SUBMIT_ERROR`
- `RESET` — clears `items: []` in addition to existing reset

**Modified internally (same type signature, dual-write side-effect added)**
- `SELECT_FERRY` — also upserts outbound `FerryBookingItem` into `items`
- `SELECT_RETURN_FERRY` — also upserts return `FerryBookingItem` into `items`
- `CLEAR_RETURN_FERRY` — also removes the return ferry item from `items`
- `SET_CAR_RENTAL` — also upserts or removes `CarRentalBookingItem` in `items`

**New**
- `SET_ITEMS` payload: `BookingItem[]` — sets the whole array atomically; used only by the hydration migration logic. Not dispatched by any page component in Sprint 1.

---

## File-by-file change order

Only **one file changes in Sprint 1**: `lib/booking-context.tsx`.

Order of edits within the file:
1. Add `FerryBookingItem`, `CarRentalBookingItem`, `BookingItem` types (after the existing `CarRentalSelection` interface).
2. Add `items: BookingItem[]` to `BookingState`.
3. Add `items: []` to `initialState`.
4. Add `| { type: 'SET_ITEMS'; payload: BookingItem[] }` to `BookingAction`.
5. Update four reducer cases (`SELECT_FERRY`, `SELECT_RETURN_FERRY`, `CLEAR_RETURN_FERRY`, `SET_CAR_RENTAL`) to dual-write; update `RESET`; add `SET_ITEMS` case.
6. Update `BookingProvider` hydration: add `items` case in the switch + migration block after the loop.
7. Add the four exported selector functions at the bottom of the file.

No other file is touched in Sprint 1. Build must pass before Sprint 2 begins.

---

Ready to proceed on your say-so, or send corrections.
