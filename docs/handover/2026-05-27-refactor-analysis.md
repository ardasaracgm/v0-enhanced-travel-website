# Refactor Analysis — 2026-05-27

Pre-refactor snapshot of five files ahead of the Kademe 3.2b BookingContext refactor.

---

## `lib/booking-context.tsx`

**State shape: separate fields, not an `items[]` array.**

- `BookingState` has discrete top-level fields: `selectedFerry`, `returnFerry`, `carRental`, `passengers`, `contactEmail/Phone`, `totalPrice` — each service is its own named field.
- `carRental` is a typed `CarRentalSelection | null` object (carId, model, pricePerDay, days, pickup/dropoff times/locations).
- `totalPrice` is a pre-computed number set manually by dispatch — there's no derived total from a line-items array.
- State is persisted in `sessionStorage` and hydrated on mount via a verbose field-by-field switch in `useEffect`.
- The hydration code already shows the strain of the flat shape — every new service type needs its own `case` in the switch.

---

## `lib/actions/create-trip.ts`

- The server-side model is **already `items[]`-based**: `CreateTripInput` accepts an `items` array of typed line items (`ferry`, `car_rental`, etc.) with `type`, `title`, `priceAmount`, `metadata`, etc.
- Idempotency is enforced via a unique index on `trips.idempotency_key`; a race condition on concurrent inserts is handled by catching error code `23505`.
- Atomicity is best-effort: if `trip_items` or `passengers` insert fails, a rollback deletes the trip (relying on CASCADE).
- Email (Resend) and WhatsApp link generation are fire-and-forget after commit — booking never fails due to notification errors.

---

## `lib/actions/submit-booking.ts`

- The **bridge layer** between the flat client context and `createTrip`'s `items[]` shape — this is where the impedance mismatch is currently papered over.
- Client sends IDs only (`outboundFerryId`, `returnFerryId`, `carRentalId`); server resolves real prices from mock data / Supabase `cars` table — price tamper-proofing lives here.
- Manually assembles the `items[]` array (outbound leg, optional return leg, optional car) and calls `createTrip`.
- Car rental lookup silently swallows errors and proceeds without the car rather than failing the whole booking.

---

## `app/[locale]/ferry/results/page.tsx`

- Maintains **local component state** (`selectedFerry`, `selectedReturnFerry`) in parallel with dispatching to BookingContext — the two sources of truth diverge until `handleContinue`.
- Round-trip flow is a two-phase UI: first pick outbound, then a separate "return" view toggled by `isSelectingReturn` local state.
- Uses `next/link` and `next/navigation` directly instead of the i18n wrappers from `@/i18n/routing` — this will break locale-prefixed routes (e.g., `/tr/ferry/results` → back button goes to `/ferry` not `/tr/ferry`).
- `totalPrice` is computed locally as a `useMemo` for display but also dispatched as a flat number on continue — redundant and fragile.

---

## `app/[locale]/ferry/passenger-details/page.tsx`

- Also maintains parallel local state for passenger forms, only dispatching to context on "Continue" click — same dual-state pattern as results page.
- Validation is manual inline logic (checks required fields, email regex) rather than Zod — the CLAUDE.md roadmap explicitly lists Zod validation as a Kademe 3.2b TODO.
- Uses `next/link` / `next/navigation` directly (same i18n import bug as results page).
- `Passenger` interface on context includes `phone` and `email` per-passenger, but the form only collects those fields on the contact card, not per-passenger — field is always empty string for non-lead passengers going into `submitBooking`.

---

## Key finding: the items[] impedance mismatch

**`BookingContext` uses separate named fields per service** (`selectedFerry`, `returnFerry`, `carRental`), not an `items[]` array. `createTrip` already expects `items[]`. `submit-booking.ts` is the adapter that bridges them.

The Kademe 3.2b refactor should move the context to match the server's shape, eliminating that adapter and making adding new service types (tours, hotels, insurance) additive rather than requiring new context fields each time.

### Additional bugs to fix in the same pass

| File | Issue |
|------|-------|
| `ferry/results/page.tsx` | `next/link` / `next/navigation` used directly — must be `@/i18n/routing` wrappers |
| `ferry/passenger-details/page.tsx` | Same i18n import bug |
| `ferry/passenger-details/page.tsx` | Per-passenger `phone`/`email` fields collected nowhere — always empty string sent to server |
| Both pages | Dual local + context state — local state should be removed; context is the single source of truth |
