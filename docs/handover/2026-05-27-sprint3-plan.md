# Sprint 3 Plan — Booking Context Cleanup + Validation

**Date:** 2026-05-27  
**Depends on:** Sprint 2.6 (confirmed merged, head cac641f + Sprint 2.6 confirmation page)  
**Status:** Planning

---

## 1. Context

The Sprint 2 series (2.1–2.6) migrated all booking flow pages to the `items[]` selector pattern and fixed stale-state on confirmation. The legacy named fields (`selectedFerry`, `returnFerry`, `carRental`, `totalPrice`) in `BookingState` are now dead weight: no page reads them, all selectors derive from `items[]`, and the sessionStorage migration shim that kept old-format sessions alive is weeks past its useful life. Sprint 3 removes that dead weight and adds the first server-side Zod validation layer.

---

## 2. Item-by-Item Analysis

---

### Item 1 — Legacy field cleanup in `lib/booking-context.tsx`

#### What exists now

`BookingState` carries four fields that are dual-written by the reducer but never read by any page (all consumers switched to selectors in Sprint 2):

```typescript
selectedFerry: FerryRoute | null      // read by 0 pages; selector: selectOutboundFerry
returnFerry:   FerryRoute | null      // read by 0 pages; selector: selectReturnFerry
carRental:     CarRentalSelection | null  // read by 0 pages; selector: selectCarRental
totalPrice:    number                 // read by 0 pages; selector: selectTotalPrice
```

The reducer dual-writes: `SELECT_FERRY` sets both `state.selectedFerry` and `items[]`; same for `SELECT_RETURN_FERRY`, `SET_CAR_RENTAL`. A `SET_TOTAL_PRICE` action exists but is never dispatched by any page.

`BookingProvider`'s hydration switch (lines 310–352) handles `selectedFerry`, `returnFerry`, `carRental`, `totalPrice` cases. Below that (lines 369–412) is a migration shim that reconstructs `items[]` from the named fields if `stored.items` is absent — this targeted sessionStorage entries written before Sprint 2.1.

#### Changes required

**`BookingState` interface** — remove four fields:
```typescript
// remove:
selectedFerry: FerryRoute | null
returnFerry:   FerryRoute | null
carRental:     CarRentalSelection | null
totalPrice:    number
```

**`initialState`** — remove the four corresponding entries.

**`BookingAction` union** — remove `SET_TOTAL_PRICE` action type (never dispatched externally; no callers to update).

**`bookingReducer`**:
- `SELECT_FERRY` case: drop `selectedFerry: action.payload` from the return spread; keep `items[]` write.
- `SELECT_RETURN_FERRY` case: drop `returnFerry: action.payload` from the return spread; keep `items[]` write.
- `CLEAR_RETURN_FERRY` case: drop `returnFerry: null` from the return spread; keep `items` filter.
- `SET_CAR_RENTAL` case: drop `carRental: action.payload` / `carRental: null` from both branches; keep `items[]` write.
- Remove `SET_TOTAL_PRICE` case entirely.

**`BookingProvider` hydration switch** — remove cases for `selectedFerry`, `returnFerry`, `carRental`, `totalPrice`.

**Migration shim** (lines 369–412) — remove entirely. See risk assessment below.

#### New minimal `BookingState` shape (signature only)

```typescript
export interface BookingState {
  searchParams: {
    from: string; to: string; date: string
    passengers: number; tripType: 'one-way' | 'round-trip'; returnDate?: string
  }
  passengers:         Passenger[]
  contactEmail:       string
  contactPhone:       string
  items:              BookingItem[]
  idempotencyKey:     string
  bookingReference:   string
  paymentWhatsAppUrl: string
  submitError:        string | null
}
```

`CarRentalSelection` and `FerryBookingItem`/`CarRentalBookingItem` interfaces are **unchanged** — they're the payload types for dispatch actions that still exist.

#### SessionStorage migration removal risk

The migration shim fires when `stored.items` is absent or empty, reconstructing `items[]` from `stored.selectedFerry` / `stored.returnFerry` / `stored.carRental`. The only users who would hit this path are those with a sessionStorage entry written before Sprint 2.1 (Kademe 3.2a) that was never cleared.

Assessment: **safe to remove**.
- `sessionStorage` does not persist across browser close/open, only across SPA navigation within a tab.
- Sprint 2.1 shipped weeks before this sprint; any tab open since then has either completed a booking (sessionStorage cleared by `clearBookingStorage`) or has naturally expired.
- Sprint 2.6 adds a second clearance path (`handleNewBooking` on confirmation page).
- The only residual risk is a user who opened a booking funnel before Sprint 2.1 deployed and kept the exact same browser tab open continuously since then — negligible in practice.
- Once the `selectedFerry` / `returnFerry` / `carRental` fields are removed from `BookingState`, the shim would be a TypeScript error anyway (`stored.selectedFerry` would not exist on the type), so removal is mandatory.

#### Files touched

`lib/booking-context.tsx` only.

#### Estimated commits: 1

---

### Item 2 — submit-booking adapter final cleanup

#### Current state (verified)

`SubmitBookingInput` in `lib/actions/submit-booking.ts` already uses the `items[]` pattern — ferry and car items are passed as ID-only descriptors, prices are resolved server-side. No legacy named fields (`selectedFerry`, `selectedCar`, etc.) appear anywhere in the file.

`app/[locale]/checkout/page.tsx` (lines 59–74) maps `state.items` to the adapter's expected shape and excludes passenger `phone`/`email` from the submission array:

```typescript
passengers: state.passengers.map((p, idx) => ({
  fullName: p.fullName,
  birthDate: p.birthDate,
  passportNumber: p.passportNumber,
  nationality: p.nationality,
  isLead: idx === 0,
}))
```

No `phone` or `email` fields are passed. `contactEmail` and `contactPhone` are sent separately at the top-level booking level, consistent with the lead-only contact model.

#### Action required

**Documentation only.** Add a short comment in `submit-booking.ts` above `SubmitBookingInput` noting that `passengers[]` intentionally omits contact fields (those live at `contactEmail`/`contactPhone` top level). No code changes needed.

If the TypeScript build catches any residual reference to legacy fields after Item 1 lands, fix those here before merging.

#### Files touched

`lib/actions/submit-booking.ts` — comment only (1 line).

#### Estimated commits: 0 standalone (fold into Item 1 commit or Item 3 commit)

---

### Item 3 — Per-passenger contact field cleanup

#### Two `Passenger` types — treat differently

**`lib/booking-context.tsx` `Passenger` (client flow shape):**
```typescript
export interface Passenger {
  fullName:       string
  birthDate:      string
  passportNumber: string
  nationality:    string
  phone:          string   // ← remove
  email:          string   // ← remove
}
```
`phone` and `email` are initialized to `''` in `passenger-details/page.tsx` (lines 67–68) but:
- No form inputs render for them (confirmed: passenger section only has fullName, birthDate, passportNumber, nationality fields).
- `updatePassenger`'s `keyof Passenger` type would narrow correctly after removal.
- `checkout/page.tsx` already excludes them from the submit call.
- They are serialised into sessionStorage on every state change (dead weight in the stored blob).

**Action:** remove `phone` and `email` from `lib/booking-context.tsx` `Passenger`.  
**Cascade:** update the initial passenger factory in `passenger-details/page.tsx` to remove the two fields from the object literal.

**`lib/supabase.ts` `Passenger` (DB mirror):**
```typescript
export interface Passenger {
  // ...
  email?: string | null   // ← leave as-is
  phone?: string | null   // ← leave as-is
}
```
These map to actual nullable columns in the `passengers` Postgres table. They exist for future use (group bookings where companions have different contacts; Kademe 5 admin queries). Removing them from the DB mirror would create a false type guarantee that the columns don't exist, and could break admin panel code in Kademe 5 that reads `passenger.email` for companion-contact display. **Do not remove from `lib/supabase.ts`.**

#### Call-site scan

- `ferry/passenger-details/page.tsx` — initialises with `phone: ''`, `email: ''`; remove both from factory object.
- `app/[locale]/checkout/page.tsx` — already excludes them from the submit call; no change needed.
- `lib/actions/submit-booking.ts` — `SubmitBookingInput.passengers` type already has no `phone`/`email`; no change needed.
- `lib/actions/create-trip.ts` — `additionalPassengers[]` has no `phone`/`email`; no change needed.
- `app/[locale]/confirmation/page.tsx` — `BookingSnapshot.passengers` uses `Passenger[]` from booking-context; after removal, the type narrows correctly; the render only accesses `fullName`, `nationality`, `passportNumber` which remain.

#### Files touched

`lib/booking-context.tsx` (interface), `app/[locale]/ferry/passenger-details/page.tsx` (factory literal).

#### Estimated commits: 1 (can be merged with Item 1 into a single "booking context cleanup" commit)

---

### Item 4 — Date validation via Zod in `submit-booking.ts`

#### Current validation gaps

`submitBooking` currently checks:
1. `items` non-empty
2. Outbound ferry leg present
3. Ferry ID resolves in mock data
4. Lead passenger exists

It does **not** validate:
- Ferry date is in the future (a booking for yesterday succeeds silently).
- `birthDate` is a plausible human date of birth.
- `passportNumber` has a structurally valid format.
- `contactEmail` is a valid email format.
- `contactPhone` has minimum length.

All of these are easy to bypass on the client side (the client does its own validation in `validateForm()`, but server-side re-validation is non-negotiable per CLAUDE.md architecture).

#### Zod is already installed

`zod@3.25.76` is present in `package.json`. No new dependency needed.

#### Proposed schema (signatures only — no implementation)

```typescript
// lib/actions/submit-booking.ts (top-level, before submitBooking fn)

const PassengerSchema = z.object({
  fullName:       z.string().trim().min(2),
  birthDate:      z.string().refine(isReasonableDOB, { message: 'Invalid date of birth' }),
  passportNumber: z.string().trim().regex(/^[A-Z0-9]{5,20}$/i, 'Invalid passport number'),
  nationality:    z.string().trim().min(2),
  isLead:         z.boolean().optional(),
})

const FerryItemSchema = z.object({
  type:    z.literal('ferry'),
  leg:     z.enum(['outbound', 'return']),
  ferryId: z.string().min(1),
  date:    z.string().refine(isDateInFuture, { message: 'Ferry date must be in the future' }),
})

const CarItemSchema = z.object({
  type:      z.literal('car_rental'),
  carId:     z.string().min(1),
  days:      z.number().int().positive().max(90),
  pickupAt:  z.string().optional(),
  dropoffAt: z.string().optional(),
})

const SubmitBookingSchema = z.object({
  idempotencyKey: z.string().uuid(),
  locale:         z.enum(['en', 'tr', 'el']),
  items:          z.array(z.discriminatedUnion('type', [FerryItemSchema, CarItemSchema])).min(1),
  passengerCount: z.number().int().min(1).max(9),
  passengers:     z.array(PassengerSchema).min(1),
  contactEmail:   z.string().email(),
  contactPhone:   z.string().trim().min(7),
  notesCustomer:  z.string().max(500).optional(),
})
```

Helper function signatures (implement inline in the file):

```typescript
function isDateInFuture(date: string): boolean
// Compares YYYY-MM-DD against today in Greece timezone (UTC+2/+3).
// Returns true if date >= today.

function isReasonableDOB(date: string): boolean
// Returns true if date is a valid YYYY-MM-DD and represents an age
// between 0 and 120 years.
```

#### Integration point

The schema parse replaces the current manual item-presence checks at the top of `submitBooking`. A failed parse short-circuits with `{ ok: false, code: 'validation_failed', error: z.ZodError.flatten().fieldErrors }` formatted as a human-readable string. The existing error path in `checkout/page.tsx` (`dispatch({ type: 'SET_SUBMIT_ERROR' })` → rendered in the Alert component) handles this without UI changes.

The ferry date check (outbound date in future) also applies to return date if a return leg is present. The Zod schema handles this uniformly because `FerryItemSchema` validates each item's `date` field independently.

#### Passport format note

International passport formats vary widely (6–9 alphanumeric characters for most nationalities, up to 20 for some edge cases). The regex `/^[A-Z0-9]{5,20}$/i` is deliberately permissive — it rejects obviously invalid values (empty, symbols, too short) while accepting all real passport formats. Do not tighten it without a comprehensive reference table.

#### Files touched

`lib/actions/submit-booking.ts` (schema, helpers, parse call replacing manual checks).

#### New dependency: none (Zod already installed).

#### Estimated commits: 1

---

## 3. Cross-Item Dependencies

| Item | Depends on | Reason |
|------|-----------|--------|
| 1 (context cleanup) | Sprint 2.6 ✓ | Confirmation page must use snapshot before context is reset; done |
| 3 (passenger fields) | none | Touches separate interface from Item 1 but same file — bundle together |
| 1 + 3 together | each other | Removing `phone`/`email` from `Passenger` and removing `selectedFerry` etc. from `BookingState` both touch `lib/booking-context.tsx`; do in one pass to avoid intermediate broken state |
| 2 (submit-booking doc) | Item 1 | The comment confirms the clean state; write after verifying Item 1 build passes |
| 4 (Zod) | none | `submit-booking.ts` is independent of `booking-context.tsx`; can be done in parallel or after |

**Constraint:** Items 1 and 3 must land together (same PR or consecutive commits) because:
- After removing `phone`/`email` from `Passenger` in `booking-context.tsx`, the `passenger-details/page.tsx` factory literal is a TypeScript error until fixed.
- After removing `selectedFerry` from `BookingState`, the migration shim (`if (stored.selectedFerry)`) is a TypeScript error until removed.
Neither half-state passes `pnpm build`.

---

## 4. Risk Assessment Summary

| Item | Risk | Mitigation |
|------|------|-----------|
| 1 — migration shim removal | Negligible data loss for tabs open since before Sprint 2.1 | Acceptable; sprint 2 is weeks old; sessionStorage is tab-scoped |
| 1 — reducer dual-write removal | Any page that reads `state.selectedFerry` directly breaks | Confirmed zero direct reads via grep; all consumers use selectors |
| 3 — `Passenger` field removal | Hydrated sessionStorage entries with `phone`/`email` keys still parse fine (`{ ...initialState, ...parsed }` ignores unknown keys at the interface level) | No migration needed; extra keys in the stored blob are harmless |
| 3 — `lib/supabase.ts` untouched | DB mirror stays accurate; Kademe 5 admin can read passenger.email if needed | Correct decision; no risk here |
| 4 — Zod date validation | If Greece timezone offset is wrong, valid bookings (e.g., booking for today late evening from Turkey) could be rejected | Use a clear cutoff (`date >= todays-date-in-greece`) not a datetime comparison; document the assumption |
| 4 — passport regex | Overly strict regex blocks legitimate passports | Keep the regex loose (`[A-Z0-9]{5,20}`); tighten only with a per-nationality lookup |

---

## 5. Recommended Sequence

**Commit 1 — Context and passenger cleanup (Items 1 + 3)**  
`lib/booking-context.tsx`: remove legacy fields, remove migration shim, remove passenger phone/email.  
`app/[locale]/ferry/passenger-details/page.tsx`: remove phone/email from factory object.  
Build must pass before proceeding.

**Commit 2 — submit-booking annotation (Item 2)**  
One-line comment confirming lead-only contact model. Can be squashed into Commit 1 if preferred.

**Commit 3 — Zod validation (Item 4)**  
`lib/actions/submit-booking.ts`: add schema, helpers, parse call.  
Smoke test: attempt a booking with a past date; confirm `submitError` surfaces in checkout UI.

---

## 6. Deferred Items

**`SET_TOTAL_PRICE` action type** — the action itself can be removed from the union (Item 1 already removes the reducer case). The `SET_TOTAL_PRICE` dispatch was only ever called internally to keep `totalPrice` in sync, never from a page. After removal, no callers exist. Included in Item 1 scope.

**`CarRentalSelection` type in `booking-context.tsx`** — still needed as the payload type for `SET_CAR_RENTAL` dispatch and as the `car` field in `BookingSnapshot`. Do not remove.

**`selectTotalPrice` selector** — still used by `passenger-details/page.tsx` (total price display in the header bar) and `checkout/page.tsx` (order summary). Do not remove.

**Round-trip UI polish on `/ferry/results`** — noted as in-scope for Sprint 2.3 but deferred; still shows a single ferry list rather than a two-panel outbound/return selector. Revisit before Kademe 4 when real inventory matters.

**Zod on the client side (`passenger-details/page.tsx`)** — the form currently uses a hand-rolled `validateForm()` function. Replacing it with a Zod schema shared with the server action would be the right long-term shape. Deferred to Kademe 4 (out of Sprint 3 scope; the server-side Zod in Item 4 is sufficient for correctness; client UX can follow later).

---

## 7. Plan Addendum — Review Notes

### (a) Zod error formatting helper for Item 4

When `SubmitBookingSchema.safeParse()` fails, `err.flatten().fieldErrors` is a `Record<string, string[]>` — field name to array of messages. The checkout UI's `submitError` display is a single `string` fed to an Alert component (`dispatch({ type: 'SET_SUBMIT_ERROR', payload: errorString })`). The two shapes must be bridged by a private helper in `lib/actions/submit-booking.ts`:

```typescript
function formatZodError(err: z.ZodError): string {
  const flat = err.flatten()
  const fieldLines = Object.entries(flat.fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(', ')}`)
  const formLines = flat.formErrors
  return [...fieldLines, ...formLines].join(' | ') || err.message
}
```

Usage in `submitBooking`:
```typescript
const parsed = SubmitBookingSchema.safeParse(input)
if (!parsed.success) {
  return { ok: false, code: 'validation_failed', error: formatZodError(parsed.error) }
}
```

The `|| err.message` fallback handles the edge case where both `fieldErrors` and `formErrors` are empty (e.g., a top-level refinement failure with no field path). The checkout `SET_SUBMIT_ERROR` flow requires no UI changes.

---

### (b) Kademe 3.2b closure scope after Sprint 3

**What Kademe 3.2b originally included:**

| Item | Status after Sprint 3 |
|------|----------------------|
| BookingContext refactor to `items[]` pattern | ✅ Complete (Sprint 2 series + Sprint 3 Items 1+3) |
| Passenger Zod validation (server-side) | ✅ Complete (Sprint 3 Item 4) |
| Car rental upsell page (`/[locale]/ferry/extras`) | ❌ Not built |
| Round-trip results UI (two-panel selector) | ❌ Explicitly deferred |

**Car rental upsell — Sprint 4 (Kademe 3.2b closure) vs. Kademe 4**

**Recommendation: build the car rental upsell page as Sprint 4, closing 3.2b before Kademe 4 (Viva Wallet) begins.**

Reasons:
1. **Basket completeness for payment testing.** Viva Wallet integration must charge the correct basket total. Without the upsell page, all payment integration tests will use ferry-only bookings, and multi-item total logic in the Viva webhook handler won't be exercised until production. Building the upsell first means payment tests cover the real basket shape.
2. **Optimal build window.** The `items[]` infrastructure is now stable and clean after Sprint 3. The extras page is the one page that depends directly on it; building it immediately avoids context-switching cost later.
3. **Roadmap clarity.** Kademe 3.2b is explicitly defined as including the car rental page. Entering Kademe 4 with 3.2b half-open creates an ambiguous boundary. "Kademe 3 complete" should mean the full booking flow — search → results → extras → passenger details → checkout — works end-to-end.
4. **Self-contained scope.** The extras page is one new route: reads `searchParams.date` + outbound ferry from `items[]`, queries the car catalog, dispatches `SET_CAR_RENTAL`. No new data model or API integration needed. Estimated 1 sprint.

**Round-trip UI:** Leave deferred. A two-panel mock is low value without real ferry schedule data. Revisit in Kademe 6/7 alongside supplier API integration.

**Sprint 4 scope (proposed):**
- `app/[locale]/ferry/extras/page.tsx` — car rental upsell step in the booking flow
- Wire into routing: `passenger-details` back-link points to `/ferry/extras`, extras back-link points to `/ferry/results`
- Smoke-test: booking flow works both with and without car rental selected
