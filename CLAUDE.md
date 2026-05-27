# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (http://localhost:3000)
pnpm build        # production build
pnpm lint         # ESLint
pnpm start        # serve production build
```

There are no automated tests. TypeScript type-checking is enforced at build time (`ignoreBuildErrors: false`).

## Project Overview

**TravelBeez** — a Greek travel agency (based in Kos) serving Turkish travelers. The site sells ferry tickets (Turkey → Greek islands), car rentals, tours, hotels, visa support, and package pickup. Three UI languages: English, Turkish, Greek.

## Architecture

### Routing

All pages live under `app/[locale]/` with `localePrefix: 'always'`. The locale segment (`en` / `tr` / `el`) is validated in the layout and returns 404 for unknown values. `middleware.ts` auto-detects locale from `Accept-Language` / `NEXT_LOCALE` cookie on first visit.

**Always import navigation helpers from `@/i18n/routing`**, not from `next/link` or `next/navigation`. The typed wrappers (`Link`, `redirect`, `useRouter`, `usePathname`) automatically inject the active locale prefix.

Key routes:
- `[locale]/` — marketing homepage (renders `enhanced-travel-website.tsx` at repo root)
- `[locale]/ferry/` → `results/` → `passenger-details/` — multi-step ferry booking flow
- `[locale]/checkout/`, `[locale]/confirmation/` — payment and post-booking
- `[locale]/car-rental/`, `[locale]/tours/`, `[locale]/visa/`, `[locale]/package-pickup/`

### Booking State

`lib/booking-context.tsx` holds the entire in-progress booking (search params, selected ferry, passengers, car rental add-on, contact info, idempotency key, booking reference) via a `useReducer`. State is hydrated from `sessionStorage` on mount and written back on every change. The `BookingProvider` wraps everything in `app/[locale]/layout.tsx`.

The `idempotencyKey` is a UUID generated client-side per session. It is sent with the `createTrip` server action to prevent duplicate trips on retry/double-click.

### Supabase Clients — Two Patterns

| File | Key used | Where it can be imported |
|------|----------|--------------------------|
| `lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS-enforced) | Client components, server components, server actions |
| `lib/supabase-server.ts` | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) | Server actions and route handlers only — marked `import 'server-only'` |

Never use the service role client in browser code.

### Domain Data Model

`lib/supabase.ts` contains all TypeScript types that mirror the Postgres schema. The model is **trip-centric**:

- `trips` — one trip per booking attempt; has a state machine (`draft → pending_payment → confirmed → …`)
- `trip_items` — line items typed by `TripItemType` (`ferry`, `car_rental`, `tour`, `hotel`, …); each has a typed `metadata` jsonb (see `FerryItemMetadata`, `CarRentalItemMetadata`, etc.)
- `passengers` — linked to a trip
- `payments` — with idempotency key; provider options: `viva_wallet`, `bank_transfer`, `cash`, `internal`
- `cars` — car catalog (can have flat columns or a `specs` jsonb field; `normalizeCar()` on the car-rental page handles both shapes)
- `inquiries` — lead capture for services not on automated checkout
- `contact_requests` — contact form submissions

Deprecated booking helpers (`createBooking`, `createPassengers`, etc.) are stubbed in `lib/supabase.ts` with loud errors pointing to the Kademe 3 migration. Do not re-implement them there — use server actions instead.

### DB Migrations

SQL migrations live in `db/migrations/`. Run them manually in the Supabase SQL Editor. There is no migration runner wired into the project.

### i18n

Translation files are in `messages/{en,tr,el}.json`. Use `useTranslations()` in client components (provided by `NextIntlClientProvider` in the locale layout) and `getTranslations()` in server components/actions.

### Notifications

- **Email**: `lib/email/send-confirmation.ts` — uses Resend. Fails gracefully if `RESEND_API_KEY` is not set (booking flow continues without email).
- **WhatsApp**: `lib/notifications/whatsapp-link.ts` — builds `wa.me` deep links for payment confirmation and support, with localized pre-filled message templates.

### Components

- `components/islandbee/` — brand-specific components: `Header`, `Footer`, `FloatingWhatsApp`, `TrustBar`, `TrustIndicators`, `WhatsAppCTA`, `ContactForm`.
- `components/ui/` — shadcn/ui primitives (Radix-based). Do not edit these directly; regenerate via `shadcn` CLI if needed.
- `components/i18n/` — `LanguageSwitcher`.

### Ferry Data

Ferry schedules are currently mocked in `lib/ferry-mock-data.ts`. Real operator API integration is planned but not yet implemented.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Anon key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY         # Service role key (server-only, never expose to browser)
RESEND_API_KEY                    # Optional — email confirmations
RESEND_FROM_ADDRESS               # Optional — sender address (e.g. bookings@travelbeez.gr)


## Project Roadmap (Kademe System)

We work in numbered "Kademe" (stages). Each must be verified working before the next. Never start the next stage if the current one has loose ends.

**Completed:**
- **Kademe 1** — Trip-centric schema (11 tables, RLS, enums, `generate_trip_reference()`)
- **Kademe 2** — i18n (TR/EL/EN, route prefix, browser detection, language switcher, phone fix to 5008/5009)
- **Kademe 3.1** — Booking server action foundation (`createTrip`, idempotency, email wrapper, WhatsApp deep links)
- **Kademe 3.2a** — Booking flow wiring (real server action, mock VivaWallet removed, end-to-end working)

**In Progress:**
- **Kademe 3.2b** — BookingContext refactor to `items[]` pattern + car rental upsell page + passenger Zod validation + round-trip results UI check

**Next:**
- **Kademe 4** — Viva Wallet integration (KYC pending in parallel; trip state `pending_payment` → `confirmed`)
- **Kademe 5** — Admin panel (trip view, manual state transitions, inquiry funnel, CSV export, separate partner admin for Bodrum transfer firm)
- **Kademe 6** — Multi-leg ferry, Kos transit hub, Minimum Connection Time algorithm
- **Kademe 7+** — Real supplier integrations (ferry, hotel, tour APIs)

## External Vendors & APIs

- **Ferry APIs (active):** Skymarine, Dentur. Currently mocked in `lib/ferry-mock-data.ts`; real integration pending in Kademe 7. A third inter-island shipping API is planned to enable multi-leg routes.
- **Travel insurance:** [tamamliyo.com](https://www.tamamliyo.com/) — integrate as checkbox upsell during ferry checkout. Reuse passenger info already collected; do not re-prompt. `trip_item_type` enum already has `insurance`.
- **Hotels:** Paksimum API (Kademe 7)
- **Tours:** Yunanistan.com (Kademe 7, partnership/scrape TBD by legal)
- **Payment:** WhatsApp-first manual (current). Viva Wallet (Kademe 4 — KYC 1-3 business days). No client-side payment integration yet.
- **VIP transfer firms (Bodrum + Kos sides):** mail + WhatsApp to partner; Bodrum firm gets its own partner admin login for price updates (Kademe 5).

## Working Conventions

- **Kademe kademe** (stage by stage) — current stage verified before next. "Half-done" is the failure mode we avoid.
- **Server-side price lookup is non-negotiable.** Client sends IDs only; server
```
