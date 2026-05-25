'use client'

import * as React from 'react'

export interface FerryRoute {
  id: string
  from: string
  to: string
  date: string
  departureTime: string
  arrivalTime: string
  duration: string
  price: number
  operator: string
  vessel: string
  availableSeats: number
}

export interface Passenger {
  fullName: string
  birthDate: string
  passportNumber: string
  nationality: string
  phone: string
  email: string
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
  bookingReference: string
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
  bookingReference: '',
}

type BookingAction =
  | { type: 'SET_SEARCH_PARAMS'; payload: Partial<BookingState['searchParams']> }
  | { type: 'SELECT_FERRY'; payload: FerryRoute }
  | { type: 'SELECT_RETURN_FERRY'; payload: FerryRoute }
  | { type: 'SET_PASSENGERS'; payload: Passenger[] }
  | { type: 'SET_CONTACT'; payload: { email: string; phone: string } }
  | { type: 'SET_TOTAL_PRICE'; payload: number }
  | { type: 'SET_BOOKING_REFERENCE'; payload: string }
  | { type: 'RESET' }

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_SEARCH_PARAMS':
      return { ...state, searchParams: { ...state.searchParams, ...action.payload } }
    case 'SELECT_FERRY':
      return { ...state, selectedFerry: action.payload }
    case 'SELECT_RETURN_FERRY':
      return { ...state, returnFerry: action.payload }
    case 'SET_PASSENGERS':
      return { ...state, passengers: action.payload }
    case 'SET_CONTACT':
      return { ...state, contactEmail: action.payload.email, contactPhone: action.payload.phone }
    case 'SET_TOTAL_PRICE':
      return { ...state, totalPrice: action.payload }
    case 'SET_BOOKING_REFERENCE':
      return { ...state, bookingReference: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const BookingContext = React.createContext<{
  state: BookingState
  dispatch: React.Dispatch<BookingAction>
} | null>(null)

const STORAGE_KEY = 'islandbee-booking'

function getInitialState(): BookingState {
  if (typeof window === 'undefined') return initialState
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore errors
  }
  return initialState
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(bookingReducer, initialState)
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Hydrate from sessionStorage on mount
  React.useEffect(() => {
    const stored = getInitialState()
    if (stored !== initialState) {
      // Restore each piece of state
      if (stored.searchParams) {
        dispatch({ type: 'SET_SEARCH_PARAMS', payload: stored.searchParams })
      }
      if (stored.selectedFerry) {
        dispatch({ type: 'SELECT_FERRY', payload: stored.selectedFerry })
      }
      if (stored.returnFerry) {
        dispatch({ type: 'SELECT_RETURN_FERRY', payload: stored.returnFerry })
      }
      if (stored.passengers.length > 0) {
        dispatch({ type: 'SET_PASSENGERS', payload: stored.passengers })
      }
      if (stored.contactEmail || stored.contactPhone) {
        dispatch({ type: 'SET_CONTACT', payload: { email: stored.contactEmail, phone: stored.contactPhone } })
      }
      if (stored.totalPrice) {
        dispatch({ type: 'SET_TOTAL_PRICE', payload: stored.totalPrice })
      }
      if (stored.bookingReference) {
        dispatch({ type: 'SET_BOOKING_REFERENCE', payload: stored.bookingReference })
      }
    }
    setIsHydrated(true)
  }, [])

  // Persist to sessionStorage on state change
  React.useEffect(() => {
    if (isHydrated) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Ignore errors
      }
    }
  }, [state, isHydrated])

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = React.useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}

// Mock ferry data
export const mockFerries: FerryRoute[] = [
  {
    id: 'bk-1',
    from: 'Bodrum',
    to: 'Kos',
    date: '',
    departureTime: '09:00',
    arrivalTime: '10:00',
    duration: '1h 00m',
    price: 35,
    operator: 'Bodrum Express Lines',
    vessel: 'Bodrum Express I',
    availableSeats: 45,
  },
  {
    id: 'bk-2',
    from: 'Bodrum',
    to: 'Kos',
    date: '',
    departureTime: '11:30',
    arrivalTime: '12:30',
    duration: '1h 00m',
    price: 35,
    operator: 'Bodrum Express Lines',
    vessel: 'Bodrum Express II',
    availableSeats: 28,
  },
  {
    id: 'bk-3',
    from: 'Bodrum',
    to: 'Kos',
    date: '',
    departureTime: '16:00',
    arrivalTime: '17:00',
    duration: '1h 00m',
    price: 40,
    operator: 'Bodrum Ferryboat',
    vessel: 'Sea Star',
    availableSeats: 62,
  },
  {
    id: 'tk-1',
    from: 'Turgutreis',
    to: 'Kos',
    date: '',
    departureTime: '08:30',
    arrivalTime: '09:10',
    duration: '40m',
    price: 30,
    operator: 'Turgutreis Lines',
    vessel: 'Turgutreis Express',
    availableSeats: 35,
  },
  {
    id: 'tk-2',
    from: 'Turgutreis',
    to: 'Kos',
    date: '',
    departureTime: '14:00',
    arrivalTime: '14:40',
    duration: '40m',
    price: 30,
    operator: 'Turgutreis Lines',
    vessel: 'Kos Star',
    availableSeats: 52,
  },
  {
    id: 'mr-1',
    from: 'Marmaris',
    to: 'Rhodes',
    date: '',
    departureTime: '09:00',
    arrivalTime: '09:50',
    duration: '50m',
    price: 45,
    operator: 'Marmaris Ferries',
    vessel: 'Rhodes Dream',
    availableSeats: 78,
  },
  {
    id: 'mr-2',
    from: 'Marmaris',
    to: 'Rhodes',
    date: '',
    departureTime: '17:00',
    arrivalTime: '17:50',
    duration: '50m',
    price: 50,
    operator: 'Marmaris Ferries',
    vessel: 'Aegean Spirit',
    availableSeats: 41,
  },
  {
    id: 'ks-1',
    from: 'Kusadasi',
    to: 'Samos',
    date: '',
    departureTime: '08:00',
    arrivalTime: '09:30',
    duration: '1h 30m',
    price: 40,
    operator: 'Meander Travel',
    vessel: 'Samos Star',
    availableSeats: 55,
  },
  {
    id: 'ks-2',
    from: 'Kusadasi',
    to: 'Samos',
    date: '',
    departureTime: '15:30',
    arrivalTime: '17:00',
    duration: '1h 30m',
    price: 40,
    operator: 'Meander Travel',
    vessel: 'Ephesus Princess',
    availableSeats: 38,
  },
]

export function getFerriesForRoute(from: string, to: string): FerryRoute[] {
  const fromNormalized = from.toLowerCase()
  const toNormalized = to.toLowerCase()
  
  return mockFerries.filter(
    (ferry) =>
      ferry.from.toLowerCase() === fromNormalized &&
      ferry.to.toLowerCase() === toNormalized
  )
}
