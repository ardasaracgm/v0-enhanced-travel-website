# Kademe 3.2b Refactor Plan — 2026-05-27

Strategy: backward-compatible, three sprints. Build must stay green at every commit.

## Sprint 1 — Introduce items[] in BookingContext (non-breaking)

- Add `items: TripItem[]` to BookingState alongside existing fields.
- Define `TripItem` discriminated union in lib/booking-context.tsx with at least `ferry` and `car_rental` variants matching the metadata shapes already in lib/supabase.ts.
- Make `selectedFerry`, `returnFerry`, `carRental`, `totalPrice` computed from items via selector functions (or memoized getters) — they still return the same values they do today, but derive from items.
- Update sessionStorage hydration to persist and rehydrate items[] as the source of truth; legacy fields are reconstructed from items on hydration if found.
- No consumer (results, passenger-details, checkout, submit-booking) changes in this sprint.
- Acceptance: existing end-to-end ferry booking + optional car rental still works identically; production build green.

## Sprint 2 — Migrate consumers to read/write items[]

Per file:

- `app/[locale]/ferry/results/page.tsx`:
  - Remove local `selectedFerry` / `selectedReturnFerry` / `isSelectingReturn` parallel state where possible; lift selection into context as items.
  - Replace next/link and next/navigation imports with @/i18n/routing wrappers.
  - Remove local totalPrice useMemo; read from context selector.
- `app/[locale]/ferry/passenger-details/page.tsx`:
  - Same i18n routing fix.
  - Sync form state to context on change, not only on Continue.
- `app/[locale]/checkout/page.tsx` and `confirmation/page.tsx`:
  - Read from items[] instead of named fields.
- `lib/actions/submit-booking.ts`:
  - Accept items directly from context (still ID-only on the wire); remove the manual items[] assembly.
  - Keep server-side price lookup (non-negotiable).
- Acceptance: every commit builds; manual smoke test of one-way and round-trip ferry + optional car still works.

## Sprint 3 — Remove compat shim, fix latent bugs

- Delete legacy named fields (`selectedFerry`, `returnFerry`, `carRental`, `totalPrice`) from BookingState.
- submit-booking.ts becomes a thin pass-through: validate IDs, look up prices, hand items to createTrip.
- Fix per-passenger contact bug: either collect phone/email per passenger in the form, or remove those fields from the Passenger interface so the server sees an honest model. Decision: remove per-passenger fields; only the lead has contact info, which is the trip-level contact.
- Acceptance: items[] is the only source of truth in the client; no field-by-field shim code remains.

## Out of scope for this refactor (later in 3.2b)

- Car rental upsell page at /[locale]/ferry/extras/
- Passenger Zod validation
- Round-trip results UI rework (only if dual-state cleanup reveals it's needed)

Don't start any sprint until the previous one's acceptance criteria are met.
