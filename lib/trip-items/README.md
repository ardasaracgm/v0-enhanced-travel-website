# Trip Item Registry

Single source for **bookable trip item types** (the things a user can add to the
ferry-booking cart). Adding a new service type — e-SIM, VIP transfer, insurance,
tour … — should touch **one descriptor**, not a dozen scattered `if (type === …)`
branches. Unknown types fail at **compile time** (exhaustive `Record` + `never`)
and at **runtime** (`assertNever`), so a half-wired type can never silently slip
through (the old "unknown → luggage" fall-through is gone).

## Files

| File | Role | Imports `server-only`? |
|------|------|:--:|
| `types.ts` | `BookableItemType`, `PlannedItemType`, client submit shapes, `ResolveCtx`, `ResolvedTripItem`, `TripItemDescriptor`, `assertNever` | no (client-safe) |
| `resolvers.ts` | Pure `resolve*Item(ctx) → ResolvedTripItem` (authoritative server price/title/metadata) | **yes** (via `luggage-pricing`) |
| `registry.ts` | `TRIP_ITEM_REGISTRY` (descriptors), `submitItemSchema` (Zod union built from descriptors) | **yes** (pulls resolvers) |
| `summary.ts` | `summarizeItem(item) → ItemSummaryRow` for checkout display | no (client-safe) |

> **Why two display/server halves?** `registry.ts` transitively imports
> `server-only`, so it cannot be imported into a client component. Client-side
> display config therefore lives in the client-safe `summary.ts`, keyed by the
> same `BookableItemType`.

## Who consumes the registry

- `lib/actions/submit-booking.ts` — validates items with `submitItemSchema`,
  prices them via `resolve*Item`, with a final `else → assertNever`.
- `app/[locale]/checkout/page.tsx` — renders each cart line via `summarizeItem`.
- `scripts/trip-items.snapshot.ts` — golden regression lock over the resolvers.

## Bookable vs planned

`BookableItemType` = wired into the live cart today (`ferry`, `car_rental`,
`luggage`). `PlannedItemType` = declared doors, not yet wired (`insurance`,
`esim`, `transfer`, `tour`, `hotel`, `package_pickup`, `visa`, `custom`).
Enabling one = moving it into `BookableItemType` and adding a descriptor.

## Checklist — adding a new bookable service type

Take `x` = the new type (must already be a value of `TripItemType`).

1. **DB enum** — `db/migrations/NNN_*.sql`:
   `ALTER TYPE public.trip_item_type ADD VALUE IF NOT EXISTS 'x';`
   (run manually in the Supabase SQL editor — no migration runner).
2. **TS mirror** — `lib/supabase.ts`: add `'x'` to `TripItemType`, and add an
   `XItemMetadata` interface to the `TripItemMetadata` union.
3. **types.ts** — move `'x'` from `PlannedItemType` into `BookableItemType`; add
   its `XSubmitItem` (client shape) and `XResolveCtx` (resolved context).
4. **resolvers.ts** — add `resolveXItem(ctx): ResolvedTripItem` (pure; keep any
   I/O — DB lookups, etc. — at the call site and pass it in via ctx).
5. **registry.ts** — add `xSchema` (Zod, `type: z.literal('x')` discriminator)
   and an `xDescriptor`; add it to `TRIP_ITEM_REGISTRY`.
   → `submitItemSchema` picks it up automatically (no manual union edit).
6. **summary.ts** — add `xRow(item)` and a `case 'x'` to `summarizeItem`.
7. **Client wiring** — a `dispatch` action / UI control that adds the item to
   the cart (`booking-context.tsx` + the relevant page).
8. **submit-booking.ts** — add the `else if (item.type === 'x')` branch that
   gathers I/O and calls `resolveXItem`.
9. **i18n** — add any new keys to `messages/{en,tr,el}.json`.
10. **Snapshot** — add fixtures to `scripts/trip-items.snapshot.ts` and
    regenerate the golden.

Steps 3, 5, 6, 8 are **compile-enforced**: a new `BookableItemType` without a
registry entry / summary case / submit branch fails `tsc`. The exhaustiveness
guards (`assertNever`) point you at exactly what is missing.

## Verifying a change is behavior-preserving

```bash
# snapshot regression lock (resolvers vs golden)
NODE_OPTIONS='--conditions=react-server' npx tsx scripts/trip-items.snapshot.ts

# regenerate the golden after an INTENTIONAL resolver change (review the diff)
NODE_OPTIONS='--conditions=react-server' npx tsx scripts/trip-items.snapshot.ts --generate

# type-check (the build gate; ignoreBuildErrors: false)
npx tsc --noEmit -p tsconfig.json
```

`--conditions=react-server` makes the `server-only` import resolve to a no-op so
the scripts run outside the Next bundler.
