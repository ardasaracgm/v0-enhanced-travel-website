'use client'

/**
 * Booking flow state container.
 * =============================
 * Holds the user's in-progress booking across multiple pages.
 * Persisted in sessionStorage. State is items[]-centric after Kademe 3.2b.
 * Use selectors (selectOutboundFerry, selectReturnFerry, selectCarRental,
 * selectTotalPrice) to derive display values.
 */

import * as React from 'react'

import type { FerryTrip } from '@/lib/ferry/provider'
import { ferryUnitFare, ferryPairPrices } from '@/lib/ferry/display'
import { derivePassengerType } from '@/lib/validation/booking'
import type { PassengerType } from '@/lib/supabase'
import type { LuggageCounts } from '@/lib/luggage-rates'

export interface Passenger {
  firstName: string
  lastName: string
  // '' = not yet selected; the Zod enum forces a real choice on submit.
  gender: '' | 'male' | 'female' | 'unspecified'
  birthDate: string
  passportNumber: string
  passportExpiryDate?: string   // optional; validated "after return date" by the schema
  nationality: string
  // Car-only driver only; required + validated >= dropoffAt by makeDriverSchema.
  licenseExpiry?: string
}

export interface CarRentalSelection {
  modelKey: string
  model: string
  brand?: string
  pricePerDay: number
  days: number
  pickupLocation: string
  dropoffLocation: string
  pickupAt: string // YYYY-MM-DD (date-only)
  dropoffAt: string // YYYY-MM-DD (date-only)
}

// ============================================================
// BookingItem discriminated union (Sprint 1 — ferry + car_rental)
// ============================================================
// Named BookingItem (not TripItem) to avoid collision with the DB
// row type exported from lib/supabase.ts. priceAmount is display-only;
// the server always recomputes from IDs.

export interface FerryBookingItem {
  type: 'ferry'
  leg: 'outbound' | 'return'
  ferryId: string
  ferry: FerryTrip
  date: string           // YYYY-MM-DD snapshot at selection time
  passengerCount: number
  priceAmount: number    // ferryUnitFare(ferry) × passengerCount, display only
}

export interface CarRentalBookingItem {
  type: 'car_rental'
  modelKey: string
  model: string
  brand?: string
  pricePerDay: number
  days: number
  pickupLocation: string
  dropoffLocation: string
  pickupAt: string       // YYYY-MM-DD (date-only)
  dropoffAt: string      // YYYY-MM-DD (date-only)
  priceAmount: number    // pricePerDay × days, display only
}

export interface LuggageBookingItem {
  type: 'luggage'
  counts: LuggageCounts  // {small,medium,large}; her biri 0..5 tam sayı
  dropOffDate: string    // YYYY-MM-DD
  pickupDate: string     // YYYY-MM-DD
  location: string       // ör. 'kos_port'
  title: string          // görüntü etiketi, ör. "Valiz emaneti — 3 parça"
  priceAmount: number    // gün × Σ(counts×tarife), display only
}

export interface InsuranceBookingItem {
  type: 'insurance'
  tariffId: number
  tariffName: string
  coverageValue: number  // get_offers coverage_value (35000/100000) — UI bunu gösterir
  touristCount: number
  startDate: string      // YYYY-MM-DD (gidiş)
  endDate: string        // YYYY-MM-DD (dönüş ?? gidiş)
  priceAmount: number    // A0: mock 0, display-only (sunucu re-price eder — Kademe B)
}

export interface TransferBookingItem {
  type: 'transfer'
  regionId: string
  outbound?: { routeId: string; vehicleId: string }
  return?: { routeId: string; vehicleId: string }
  title: string          // görüntü etiketi, ör. "Transfer — Bodrum ↔ Yalıkavak"
  priceAmount: number    // bacakların toplamı, display only (sunucu re-price eder)
}

export type BookingItem =
  | FerryBookingItem
  | CarRentalBookingItem
  | LuggageBookingItem
  | InsuranceBookingItem
  | TransferBookingItem

export interface BookingState {
  searchParams: {
    from: string
    to: string
    date: string
    passengers: number
    tripType: 'one-way' | 'round-trip'
    returnDate?: string
  }
  passengers: Passenger[]
  contactEmail: string
  contactPhone: string
  items: BookingItem[]
  /** Generated on first booking attempt, cleared on RESET. */
  idempotencyKey: string
  /** Server-generated reference (e.g. TB-26-A8F3K2), set after successful submit. */
  bookingReference: string
  /** WhatsApp deep link for payment confirmation, set after successful submit. */
  paymentWhatsAppUrl: string
  /** Viva Smart Checkout redirect URL, set when Viva order creation succeeds. */
  vivaRedirectUrl: string
  /** Last submission error message for the UI to display. */
  submitError: string | null
}

function newIdempotencyKey(): string {
  // Server actions also accept this format
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for very old browsers
  return 'idk-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const initialState: BookingState = {
  searchParams: {
    from: 'bodrum',
    to: 'kos',
    date: '',
    passengers: 2,
    tripType: 'one-way',
  },
  passengers: [],
  contactEmail: '',
  contactPhone: '',
  items: [],
  idempotencyKey: '',
  bookingReference: '',
  paymentWhatsAppUrl: '',
  vivaRedirectUrl: '',
  submitError: null,
}

type BookingAction =
  | { type: 'SET_SEARCH_PARAMS'; payload: Partial<BookingState['searchParams']> }
  | { type: 'SELECT_FERRY'; payload: FerryTrip }
  | { type: 'SELECT_RETURN_FERRY'; payload: FerryTrip }
  | { type: 'CLEAR_RETURN_FERRY' }
  | { type: 'CLEAR_FERRY_SELECTION' }
  | { type: 'RESET_CART' }
  | { type: 'SET_PASSENGERS'; payload: Passenger[] }
  | { type: 'SET_CONTACT'; payload: { email: string; phone: string } }
  | { type: 'SET_CAR_RENTAL'; payload: CarRentalSelection | null }
  | { type: 'SET_LUGGAGE'; payload: Omit<LuggageBookingItem, 'type'> }
  | { type: 'REMOVE_LUGGAGE' }
  | { type: 'SET_INSURANCE'; payload: Omit<InsuranceBookingItem, 'type'> }
  | { type: 'REMOVE_INSURANCE' }
  | { type: 'SET_TRANSFER'; payload: Omit<TransferBookingItem, 'type'> }
  | { type: 'REMOVE_TRANSFER' }
  | { type: 'SET_ITEMS'; payload: BookingItem[] }
  | { type: 'SET_IDEMPOTENCY_KEY'; payload: string }
  | { type: 'SET_BOOKING_REFERENCE'; payload: string }
  | { type: 'SET_PAYMENT_LINK'; payload: string }
  | { type: 'SET_VIVA_REDIRECT'; payload: string }
  | { type: 'SET_SUBMIT_ERROR'; payload: string | null }
  | { type: 'RESET' }

/**
 * Recompute every ferry leg's DISPLAY priceAmount from the authoritative fare
 * helpers — the SAME ferryPairPrices the server money-path uses, so the cart
 * total shown equals what Viva is charged (per-pax-type + round-trip single fare,
 * not adult×N / 2×oneWay). Runs on any change to ferry composition or passengers
 * so priceAmount is never stale — e.g. dropping the return leg reverts the
 * outbound from its round-trip half back to its one-way fare.
 *
 * Pax types are derived client-side from DOB at the OUTBOUND date with the same
 * derivePassengerType the server uses (display parity only; the server stays
 * authoritative). Missing/partial DOB → 'adult' (the fn's own fallback), which
 * reproduces the prior adult-fare × count display before passengers are entered.
 */
function repriceFerryItems(items: BookingItem[], passengers: Passenger[]): BookingItem[] {
  const outbound = items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound',
  )
  if (!outbound) return items
  const ret = items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return',
  )

  const types: PassengerType[] = Array.from({ length: outbound.passengerCount }, (_, i) => {
    const dob = passengers[i]?.birthDate
    return dob ? derivePassengerType(dob, outbound.date) : 'adult'
  })

  const sameDay = !!ret && outbound.date === ret.date
  const prices = ferryPairPrices(outbound.ferry, ret?.ferry ?? null, types, sameDay)

  return items.map((i) => {
    if (i.type !== 'ferry') return i
    if (i.leg === 'outbound') return { ...i, priceAmount: prices.outbound }
    return { ...i, priceAmount: prices.return ?? i.priceAmount }
  })
}

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_SEARCH_PARAMS':
      return { ...state, searchParams: { ...state.searchParams, ...action.payload } }
    // NOTE: reads state.searchParams.passengers to compute the new BookingItem's
    // passengerCount and priceAmount. Hydration relies on SET_SEARCH_PARAMS firing
    // before this action — see initialState key order.
    case 'SELECT_FERRY': {
      const pax = state.searchParams.passengers
      const ferryItem: FerryBookingItem = {
        type: 'ferry',
        leg: 'outbound',
        ferryId: action.payload.id,
        ferry: action.payload,
        date: state.searchParams.date,
        passengerCount: pax,
        priceAmount: ferryUnitFare(action.payload) * pax,
      }
      return {
        ...state,
        items: repriceFerryItems(
          [...state.items.filter(i => !(i.type === 'ferry' && i.leg === 'outbound')), ferryItem],
          state.passengers,
        ),
      }
    }
    // NOTE: reads state.searchParams.passengers to compute the new BookingItem's
    // passengerCount and priceAmount. Hydration relies on SET_SEARCH_PARAMS firing
    // before this action — see initialState key order.
    case 'SELECT_RETURN_FERRY': {
      const pax = state.searchParams.passengers
      const returnItem: FerryBookingItem = {
        type: 'ferry',
        leg: 'return',
        ferryId: action.payload.id,
        ferry: action.payload,
        date: state.searchParams.returnDate ?? '',
        passengerCount: pax,
        priceAmount: ferryUnitFare(action.payload) * pax,
      }
      return {
        ...state,
        items: repriceFerryItems(
          [...state.items.filter(i => !(i.type === 'ferry' && i.leg === 'return')), returnItem],
          state.passengers,
        ),
      }
    }
    case 'CLEAR_RETURN_FERRY':
      return {
        ...state,
        items: repriceFerryItems(
          state.items.filter(i => !(i.type === 'ferry' && i.leg === 'return')),
          state.passengers,
        ),
      }
    // Tüm ferry item'larını (outbound + return) temizle. Rota veya yolcu sayısı
    // değişince seçim geçersizleşir; results sayfası bunu çağırır (stale-guard).
    case 'CLEAR_FERRY_SELECTION':
      return {
        ...state,
        items: state.items.filter(i => i.type !== 'ferry'),
      }
    // Yeni arama → sepeti TAMAMEN sıfırla (ferry outbound+return + tüm ekstralar:
    // car/luggage/transfer/insurance). searchParams ve passengers KORUNUR; yalnız
    // items boşalır. SADECE ferry/page.tsx handleSearch çağırır — adımlar arası
    // gezinme, results-içi gidiş/dönüş seçimi ve ödemeye-geç bunu tetiklemez.
    case 'RESET_CART':
      return { ...state, items: [] }
    case 'SET_PASSENGERS':
      return {
        ...state,
        passengers: action.payload,
        items: repriceFerryItems(state.items, action.payload),
      }
    case 'SET_CONTACT':
      return {
        ...state,
        contactEmail: action.payload.email,
        contactPhone: action.payload.phone,
      }
    case 'SET_CAR_RENTAL': {
      if (!action.payload) {
        return {
          ...state,
          items: state.items.filter(i => i.type !== 'car_rental'),
        }
      }
      const carItem: CarRentalBookingItem = {
        type: 'car_rental',
        modelKey: action.payload.modelKey,
        model: action.payload.model,
        brand: action.payload.brand,
        pricePerDay: action.payload.pricePerDay,
        days: action.payload.days,
        pickupLocation: action.payload.pickupLocation,
        dropoffLocation: action.payload.dropoffLocation,
        pickupAt: action.payload.pickupAt,
        dropoffAt: action.payload.dropoffAt,
        priceAmount: action.payload.pricePerDay * action.payload.days,
      }
      return {
        ...state,
        items: [
          ...state.items.filter(i => i.type !== 'car_rental'),
          carItem,
        ],
      }
    }
    case 'SET_LUGGAGE': {
      const luggageItem: LuggageBookingItem = {
        type: 'luggage',
        ...action.payload,
      }
      return {
        ...state,
        items: [
          ...state.items.filter(i => i.type !== 'luggage'),
          luggageItem,
        ],
      }
    }
    case 'REMOVE_LUGGAGE':
      return {
        ...state,
        items: state.items.filter(i => i.type !== 'luggage'),
      }
    case 'SET_INSURANCE': {
      const insuranceItem: InsuranceBookingItem = {
        type: 'insurance',
        ...action.payload,
      }
      return {
        ...state,
        items: [
          ...state.items.filter(i => i.type !== 'insurance'),
          insuranceItem,
        ],
      }
    }
    case 'REMOVE_INSURANCE':
      return {
        ...state,
        items: state.items.filter(i => i.type !== 'insurance'),
      }
    case 'SET_TRANSFER': {
      const transferItem: TransferBookingItem = {
        type: 'transfer',
        ...action.payload,
      }
      return {
        ...state,
        items: [
          ...state.items.filter(i => i.type !== 'transfer'),
          transferItem,
        ],
      }
    }
    case 'REMOVE_TRANSFER':
      return {
        ...state,
        items: state.items.filter(i => i.type !== 'transfer'),
      }
    case 'SET_ITEMS':
      return { ...state, items: action.payload }
    case 'SET_IDEMPOTENCY_KEY':
      return { ...state, idempotencyKey: action.payload }
    case 'SET_BOOKING_REFERENCE':
      return { ...state, bookingReference: action.payload }
    case 'SET_PAYMENT_LINK':
      return { ...state, paymentWhatsAppUrl: action.payload }
    case 'SET_VIVA_REDIRECT':
      return { ...state, vivaRedirectUrl: action.payload }
    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.payload }
    case 'RESET':
      return { ...initialState, idempotencyKey: newIdempotencyKey() }
    default:
      return state
  }
}

const BookingContext = React.createContext<{
  state: BookingState
  dispatch: React.Dispatch<BookingAction>
} | null>(null)

const STORAGE_KEY = 'travelbeez-booking'

function readStoredState(): BookingState | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return { ...initialState, ...parsed }
  } catch {
    return null
  }
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(bookingReducer, initialState)
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Hydrate from sessionStorage once on mount, then ensure idempotencyKey
  React.useEffect(() => {
    const stored = readStoredState()
    if (stored) {
      Object.entries(stored).forEach(([key, value]) => {
        switch (key) {
          case 'searchParams':
            dispatch({ type: 'SET_SEARCH_PARAMS', payload: value as BookingState['searchParams'] })
            break
          case 'passengers':
            if (Array.isArray(value) && value.length > 0) {
              dispatch({ type: 'SET_PASSENGERS', payload: value as Passenger[] })
            }
            break
          case 'contactEmail':
          case 'contactPhone':
            // restored together below
            break
          case 'idempotencyKey':
            if (typeof value === 'string' && value)
              dispatch({ type: 'SET_IDEMPOTENCY_KEY', payload: value })
            break
          case 'bookingReference':
            if (typeof value === 'string' && value)
              dispatch({ type: 'SET_BOOKING_REFERENCE', payload: value })
            break
          case 'paymentWhatsAppUrl':
            if (typeof value === 'string' && value)
              dispatch({ type: 'SET_PAYMENT_LINK', payload: value })
            break
          case 'vivaRedirectUrl':
            if (typeof value === 'string' && value)
              dispatch({ type: 'SET_VIVA_REDIRECT', payload: value })
            break
          case 'items':
            if (Array.isArray(value) && value.length > 0) {
              dispatch({ type: 'SET_ITEMS', payload: value as BookingItem[] })
            }
            break
        }
      })

      if (stored.contactEmail || stored.contactPhone) {
        dispatch({
          type: 'SET_CONTACT',
          payload: { email: stored.contactEmail, phone: stored.contactPhone },
        })
      }

      // If we restored without an idempotencyKey (legacy state), set one
      if (!stored.idempotencyKey) {
        dispatch({ type: 'SET_IDEMPOTENCY_KEY', payload: newIdempotencyKey() })
      }

    } else {
      // Fresh session — generate idempotency key
      dispatch({ type: 'SET_IDEMPOTENCY_KEY', payload: newIdempotencyKey() })
    }
    setIsHydrated(true)
  }, [])

  // Persist to sessionStorage on state change
  React.useEffect(() => {
    if (!isHydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage may be unavailable (private mode, full quota) — ignore
    }
  }, [state, isHydrated])

  return (
    <BookingContext.Provider value={{ state, dispatch }}>{children}</BookingContext.Provider>
  )
}

export function useBooking() {
  const context = React.useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}

/** Helper to clear booking state after a successful confirmation. */
export function clearBookingStorage(): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

// ============================================================
// Selectors — derive legacy values from items[]
// ============================================================
// Sprint 2 consumers will switch to these. Not yet called by any page.

export function selectOutboundFerry(state: BookingState): FerryTrip | null {
  const item = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
  )
  return item?.ferry ?? null
}

export function selectReturnFerry(state: BookingState): FerryTrip | null {
  const item = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'return'
  )
  return item?.ferry ?? null
}

export function selectCarRental(state: BookingState): CarRentalSelection | null {
  const item = state.items.find(
    (i): i is CarRentalBookingItem => i.type === 'car_rental'
  )
  if (!item) return null
  return {
    modelKey: item.modelKey,
    model: item.model,
    brand: item.brand,
    pricePerDay: item.pricePerDay,
    days: item.days,
    pickupLocation: item.pickupLocation,
    dropoffLocation: item.dropoffLocation,
    pickupAt: item.pickupAt,
    dropoffAt: item.dropoffAt,
  }
}

export function selectTotalPrice(state: BookingState): number {
  return state.items.reduce((sum, i) => sum + i.priceAmount, 0)
}
