'use client'

/**
 * Booking flow state container.
 * =============================
 * Holds the user's in-progress booking across multiple pages
 * (search → results → passenger details → checkout → confirmation).
 *
 * Persisted in sessionStorage so refresh/navigation doesn't lose state.
 *
 * After Kademe 3.2a, this context also tracks:
 *   - `idempotencyKey` — UUID generated once per booking attempt.
 *     Sent with the submit, prevents duplicate trips if user
 *     double-clicks or browser retries.
 *   - `carRental` — optional add-on selected after ferry choice.
 *   - `paymentWhatsAppUrl` — set after successful submit. Used by
 *     the confirmation page's "Pay via WhatsApp" button.
 *   - `submitError` — populated when the server action rejects.
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
  fullName: string
  birthDate: string
  passportNumber: string
  nationality: string
  phone: string
  email: string
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

export interface BookingState {
  searchParams: {
    from: string
    to: string
    date: string
    passengers: number
    tripType: 'one-way' | 'round-trip'
    returnDate?: string
  }
  selectedFerry: FerryRoute | null
  returnFerry: FerryRoute | null
  passengers: Passenger[]
  contactEmail: string
  contactPhone: string
  totalPrice: number
  carRental: CarRentalSelection | null
  /** Generated on first booking attempt, cleared on RESET. */
  idempotencyKey: string
  /** Server-generated reference (e.g. TB-26-A8F3K2), set after successful submit. */
  bookingReference: string
  /** WhatsApp deep link for payment confirmation, set after successful submit. */
  paymentWhatsAppUrl: string
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
  selectedFerry: null,
  returnFerry: null,
  passengers: [],
  contactEmail: '',
  contactPhone: '',
  totalPrice: 0,
  carRental: null,
  idempotencyKey: '',
  bookingReference: '',
  paymentWhatsAppUrl: '',
  submitError: null,
}

type BookingAction =
  | { type: 'SET_SEARCH_PARAMS'; payload: Partial<BookingState['searchParams']> }
  | { type: 'SELECT_FERRY'; payload: FerryRoute }
  | { type: 'SELECT_RETURN_FERRY'; payload: FerryRoute }
  | { type: 'CLEAR_RETURN_FERRY' }
  | { type: 'SET_PASSENGERS'; payload: Passenger[] }
  | { type: 'SET_CONTACT'; payload: { email: string; phone: string } }
  | { type: 'SET_TOTAL_PRICE'; payload: number }
  | { type: 'SET_CAR_RENTAL'; payload: CarRentalSelection | null }
  | { type: 'SET_IDEMPOTENCY_KEY'; payload: string }
  | { type: 'SET_BOOKING_REFERENCE'; payload: string }
  | { type: 'SET_PAYMENT_LINK'; payload: string }
  | { type: 'SET_SUBMIT_ERROR'; payload: string | null }
  | { type: 'RESET' }

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_SEARCH_PARAMS':
      return { ...state, searchParams: { ...state.searchParams, ...action.payload } }
    case 'SELECT_FERRY':
      return { ...state, selectedFerry: action.payload }
    case 'SELECT_RETURN_FERRY':
      return { ...state, returnFerry: action.payload }
    case 'CLEAR_RETURN_FERRY':
      return { ...state, returnFerry: null }
    case 'SET_PASSENGERS':
      return { ...state, passengers: action.payload }
    case 'SET_CONTACT':
      return {
        ...state,
        contactEmail: action.payload.email,
        contactPhone: action.payload.phone,
      }
    case 'SET_TOTAL_PRICE':
      return { ...state, totalPrice: action.payload }
    case 'SET_CAR_RENTAL':
      return { ...state, carRental: action.payload }
    case 'SET_IDEMPOTENCY_KEY':
      return { ...state, idempotencyKey: action.payload }
    case 'SET_BOOKING_REFERENCE':
      return { ...state, bookingReference: action.payload }
    case 'SET_PAYMENT_LINK':
      return { ...state, paymentWhatsAppUrl: action.payload }
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
          case 'selectedFerry':
            if (value) dispatch({ type: 'SELECT_FERRY', payload: value as FerryRoute })
            break
          case 'returnFerry':
            if (value) dispatch({ type: 'SELECT_RETURN_FERRY', payload: value as FerryRoute })
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
          case 'carRental':
            if (value) dispatch({ type: 'SET_CAR_RENTAL', payload: value as CarRentalSelection })
            break
          case 'totalPrice':
            if (typeof value === 'number') dispatch({ type: 'SET_TOTAL_PRICE', payload: value })
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
