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

// Re-export ferry types/data so existing imports of
// `from '@/lib/booking-context'` keep working.
export {
  mockFerries,
  getFerriesForRoute,
  getFerryById,
  type FerryRoute,
} from '@/lib/ferry-mock-data'

import type { FerryRoute } from '@/lib/ferry-mock-data'

export interface Passenger {
  firstName: string
  lastName: string
  // '' = not yet selected; the Zod enum forces a real choice on submit.
  gender: '' | 'male' | 'female' | 'unspecified'
  birthDate: string
  passportNumber: string
  passportExpiryDate?: string   // optional; validated "after return date" by the schema
  nationality: string
}

export interface CarRentalSelection {
  carId: string
  model: string
  brand?: string
  pricePerDay: number
  days: number
  pickupLocation: string
  dropoffLocation: string
  pickupAt: string // ISO timestamp
  dropoffAt: string // ISO timestamp
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
  ferry: FerryRoute
  date: string           // YYYY-MM-DD snapshot at selection time
  passengerCount: number
  priceAmount: number    // ferry.price × passengerCount, display only
}

export interface CarRentalBookingItem {
  type: 'car_rental'
  carId: string
  model: string
  brand?: string
  pricePerDay: number
  days: number
  pickupLocation: string
  dropoffLocation: string
  pickupAt: string       // ISO timestamp
  dropoffAt: string      // ISO timestamp
  priceAmount: number    // pricePerDay × days, display only
}

export type BookingItem = FerryBookingItem | CarRentalBookingItem

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
  | { type: 'SELECT_FERRY'; payload: FerryRoute }
  | { type: 'SELECT_RETURN_FERRY'; payload: FerryRoute }
  | { type: 'CLEAR_RETURN_FERRY' }
  | { type: 'SET_PASSENGERS'; payload: Passenger[] }
  | { type: 'SET_CONTACT'; payload: { email: string; phone: string } }
  | { type: 'SET_CAR_RENTAL'; payload: CarRentalSelection | null }
  | { type: 'SET_ITEMS'; payload: BookingItem[] }
  | { type: 'SET_IDEMPOTENCY_KEY'; payload: string }
  | { type: 'SET_BOOKING_REFERENCE'; payload: string }
  | { type: 'SET_PAYMENT_LINK'; payload: string }
  | { type: 'SET_VIVA_REDIRECT'; payload: string }
  | { type: 'SET_SUBMIT_ERROR'; payload: string | null }
  | { type: 'RESET' }

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
        priceAmount: action.payload.price * pax,
      }
      return {
        ...state,
        items: [
          ...state.items.filter(i => !(i.type === 'ferry' && i.leg === 'outbound')),
          ferryItem,
        ],
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
        priceAmount: action.payload.price * pax,
      }
      return {
        ...state,
        items: [
          ...state.items.filter(i => !(i.type === 'ferry' && i.leg === 'return')),
          returnItem,
        ],
      }
    }
    case 'CLEAR_RETURN_FERRY':
      return {
        ...state,
        items: state.items.filter(i => !(i.type === 'ferry' && i.leg === 'return')),
      }
    case 'SET_PASSENGERS':
      return { ...state, passengers: action.payload }
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
        carId: action.payload.carId,
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

export function selectOutboundFerry(state: BookingState): FerryRoute | null {
  const item = state.items.find(
    (i): i is FerryBookingItem => i.type === 'ferry' && i.leg === 'outbound'
  )
  return item?.ferry ?? null
}

export function selectReturnFerry(state: BookingState): FerryRoute | null {
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
    carId: item.carId,
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
